// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package wpupdates

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"podnest/internal/apiutil"
	"podnest/internal/db"
	"podnest/internal/fileutil"
	"podnest/internal/logger"
	"podnest/internal/models"
	"podnest/internal/wpupdate"
)

// ssoTTL is how long a minted wp-admin SSO link stays valid; the mu-plugin
// rejects anything minted more than two minutes out
const ssoTTL = 60 * time.Second

// apiGetSSO returns the selected SSO administrator and, when the site is
// running, the administrators available to pick from.
func (h *Handler) apiGetSSO(w http.ResponseWriter, r *http.Request) {
	site, ok := h.resolveWP(w, r)
	if !ok {
		return
	}

	selected, err := db.GetWPSSOUser(h.DB, site.ID)
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	resp := map[string]any{"selected": selected, "admins": []*wpupdate.WPAdmin{}, "error": ""}
	if site.SiteStatus == models.StatusRunning {
		admins, err := h.WPUpdate.ListAdmins(r.Context(), site)
		if err != nil {
			logger.Error("apiGetSSO: list admins for site %d: %v", site.ID, err)
			resp["error"] = err.Error()
		} else {
			resp["admins"] = admins
		}
	}

	apiutil.JSON(w, http.StatusOK, resp)
}

// apiSetSSO stores the administrator used for wp-admin SSO; 0 clears the
// selection so the site falls back to its first administrator.
func (h *Handler) apiSetSSO(w http.ResponseWriter, r *http.Request) {
	site, ok := h.resolveWP(w, r)
	if !ok {
		return
	}

	var req struct {
		WPUserID *int64 `json:"wp_user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.WPUserID == nil || *req.WPUserID < 0 {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "wp_user_id must be a non-negative integer")
		return
	}

	if err := db.SetWPSSOUser(h.DB, site.ID, *req.WPUserID); err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	apiutil.JSON(w, http.StatusOK, map[string]any{"selected": *req.WPUserID})
}

// apiSSOLogin mints a single-use, short-lived wp-admin SSO link for the site.
func (h *Handler) apiSSOLogin(w http.ResponseWriter, r *http.Request) {
	site, ok := h.resolveWP(w, r)
	if !ok {
		return
	}
	if site.SiteStatus != models.StatusRunning {
		apiutil.ErrorMsg(w, http.StatusBadRequest, "site must be running to sign in to wp-admin")
		return
	}

	uid, err := db.GetWPSSOUser(h.DB, site.ID)
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	dir, err := fileutil.SiteDir(h.AppPath+"/sites", site.Name)
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}
	key, err := ssoKey(filepath.Join(dir, "html", "wp-config.php"))
	if err != nil {
		logger.Error("apiSSOLogin: site %d: %v", site.ID, err)
		apiutil.ErrorMsg(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	siteURL, err := h.WPUpdate.SiteURL(r.Context(), site)
	if err != nil {
		logger.Error("apiSSOLogin: siteurl for site %d: %v", site.ID, err)
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	token, err := mintSSOToken(key, uid)
	if err != nil {
		apiutil.Error(w, http.StatusInternalServerError, err)
		return
	}

	logger.Debug("apiSSOLogin: minted wp-admin SSO link for site %d (wp user %d)", site.ID, uid)
	apiutil.JSON(w, http.StatusOK, map[string]string{
		"url": siteURL + "/wp-login.php?podnest_sso=" + token,
	})
}

// ssoKey derives the SSO signing key from the site's AUTH_KEY and AUTH_SALT,
// matching the mu-plugin's hash_hmac('sha256', 'podnest-sso', AUTH_KEY . AUTH_SALT)
func ssoKey(cfgPath string) ([]byte, error) {
	src, err := os.ReadFile(cfgPath)
	if err != nil {
		return nil, fmt.Errorf("read wp-config.php: %w", err)
	}

	authKey, err := wpConstValue(string(src), "AUTH_KEY")
	if err != nil {
		return nil, err
	}
	authSalt, err := wpConstValue(string(src), "AUTH_SALT")
	if err != nil {
		return nil, err
	}

	mac := hmac.New(sha256.New, []byte(authKey+authSalt))
	mac.Write([]byte("podnest-sso"))
	return []byte(hex.EncodeToString(mac.Sum(nil))), nil
}

// wpConstValue extracts a wp-config.php constant defined as a plain string
// literal, in either the guarded or the bare define() form. Anything computed
// (getenv, concatenation, interpolation) is refused rather than guessed at,
// since a wrong key only yields links the site rejects.
func wpConstValue(src, name string) (string, error) {
	q := regexp.QuoteMeta(name)
	re := regexp.MustCompile(`(?m)^[ \t]*(?:defined\(\s*['"]` + q + `['"]\s*\)\s*\|\|\s*)?define\(\s*['"]` + q +
		`['"]\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*\)\s*;`)

	m := re.FindStringSubmatch(src)
	if m == nil {
		return "", fmt.Errorf("%s is not defined as a plain string in wp-config.php", name)
	}

	lit := m[1]
	body := lit[1 : len(lit)-1]
	if lit[0] == '"' {
		if strings.ContainsAny(body, `\$`) {
			return "", fmt.Errorf("%s in wp-config.php uses escapes or interpolation", name)
		}
		return body, nil
	}
	return strings.NewReplacer(`\\`, `\`, `\'`, `'`).Replace(body), nil
}

// mintSSOToken builds a base64url(claims).base64url(hmac) token carrying the
// WordPress user ID, an expiry, and a single-use nonce
func mintSSOToken(key []byte, uid int64) (string, error) {
	nb := make([]byte, 16)
	if _, err := rand.Read(nb); err != nil {
		return "", fmt.Errorf("generate nonce: %w", err)
	}

	claims, err := json.Marshal(struct {
		UID   int64  `json:"uid"`
		Exp   int64  `json:"exp"`
		Nonce string `json:"nonce"`
	}{uid, time.Now().Add(ssoTTL).Unix(), hex.EncodeToString(nb)})
	if err != nil {
		return "", fmt.Errorf("marshal claims: %w", err)
	}

	payload := base64.RawURLEncoding.EncodeToString(claims)
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(payload))
	return payload + "." + base64.RawURLEncoding.EncodeToString(mac.Sum(nil)), nil
}
