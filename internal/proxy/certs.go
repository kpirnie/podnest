// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

package proxy

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"net"
	"net/http"
	"net/url"
	"os"
	"podnest/internal/logger"
	"time"
)

// rpTLSDowngradeTTL bounds how long a verified upstream stays downgraded after a
// handshake failure. Without an expiry a single interrupted handshake pins the
// host to the non-verifying transport for the life of the process, which is
// exactly the outcome an active MITM wants.
const rpTLSDowngradeTTL = 15 * time.Minute

// tlsVerdict is the cached cert-verification result for an upstream host.
// downgradedAt is zero unless a verified host was flipped back by a failure.
type tlsVerdict struct {
	verified     bool
	downgradedAt time.Time
}

// ObtainCert proactively triggers Let's Encrypt certificate issuance for a domain.
func (p *Proxy) ObtainCert(domain string) {
	go func() {
		logger.Debug("proactively obtaining certificate for domain '%s'", domain)
		hello := &tls.ClientHelloInfo{ServerName: domain}
		if _, err := p.manager.GetCertificate(hello); err != nil {
			logger.Error("failed to obtain certificate for '%s': %v", domain, err)
			return
		}
		logger.Debug("certificate obtained successfully for '%s'", domain)
	}()
}

// upstreamTLSKey normalizes an upstream host to host:port so an implicit 443
// and an explicit one resolve to the same verdict entry.
func upstreamTLSKey(u *url.URL) string {
	if u.Port() == "" {
		if u.Scheme == "http" {
			return net.JoinHostPort(u.Hostname(), "80")
		}
		return net.JoinHostPort(u.Hostname(), "443")
	}
	return u.Host
}

// probeUpstreamTLS records whether an https upstream presents a verifiable certificate,
// so serving can pick the verifying transport without a per-route setting
func (p *Proxy) probeUpstreamTLS(u *url.URL) {
	if u.Scheme != "https" {
		return
	}
	key := upstreamTLSKey(u)
	d := &net.Dialer{Timeout: 5 * time.Second}
	conn, err := tls.DialWithDialer(d, "tcp", key, &tls.Config{ServerName: u.Hostname()})
	if err != nil {
		p.rpTLSVerified.Store(key, tlsVerdict{verified: false, downgradedAt: time.Now()})
		return
	}
	conn.Close()
	p.rpTLSVerified.Store(key, tlsVerdict{verified: true})
	logger.Debug("proxy: upstream %s presents a verifiable certificate", key)
}

// rpTransportForTarget returns the verifying transport when the upstream's cert probed as valid.
// An expired downgrade triggers a re-probe so a host that was flipped back by a
// transient failure can recover verification instead of staying unverified.
func (p *Proxy) rpTransportForTarget(t UpstreamTarget) *http.Transport {
	key := upstreamTLSKey(t.URL)
	v, ok := p.rpTLSVerified.Load(key)
	if !ok {
		return p.rpTransport
	}
	verdict := v.(tlsVerdict)
	if verdict.verified {
		return p.rpVerifyTransport
	}
	if !verdict.downgradedAt.IsZero() && time.Since(verdict.downgradedAt) > rpTLSDowngradeTTL {
		// reset the clock before probing so concurrent requests do not stampede
		p.rpTLSVerified.Store(key, tlsVerdict{verified: false, downgradedAt: time.Now()})
		go p.probeUpstreamTLS(t.URL)
	}
	return p.rpTransport
}

// markTLSUnverified flips a probed-verified host back to skip-verify; returns true if flipped.
// The flip is logged and timestamped — it expires after rpTLSDowngradeTTL rather
// than persisting silently for the life of the process.
func (p *Proxy) markTLSUnverified(t UpstreamTarget) bool {
	key := upstreamTLSKey(t.URL)
	v, ok := p.rpTLSVerified.Load(key)
	if !ok {
		return false
	}
	if verdict := v.(tlsVerdict); verdict.verified {
		p.rpTLSVerified.Store(key, tlsVerdict{verified: false, downgradedAt: time.Now()})
		logger.Warn("proxy: upstream %s downgraded to unverified TLS after a failed request", key)
		return true
	}
	return false
}

// selfSignedCert generates or loads a persistent self-signed cert from the cert directory.
func selfSignedCert(certDir string) (tls.Certificate, error) {
	certFile := certDir + "/self-signed.crt"
	keyFile := certDir + "/self-signed.key"

	if _, err := os.Stat(certFile); err == nil {
		return tls.LoadX509KeyPair(certFile, keyFile)
	}

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return tls.Certificate{}, err
	}

	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "podnest-self-signed"},
		NotBefore:    time.Now(),
		NotAfter:     time.Now().Add(10 * 365 * 24 * time.Hour),
		KeyUsage:     x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}

	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		return tls.Certificate{}, err
	}

	if err := os.MkdirAll(certDir, 0750); err != nil {
		return tls.Certificate{}, err
	}
	cf, _ := os.Create(certFile)
	pem.Encode(cf, &pem.Block{Type: "CERTIFICATE", Bytes: der})
	cf.Close()

	kb, _ := x509.MarshalECPrivateKey(key)
	kf, _ := os.Create(keyFile)
	pem.Encode(kf, &pem.Block{Type: "EC PRIVATE KEY", Bytes: kb})
	kf.Close()

	return tls.LoadX509KeyPair(certFile, keyFile)
}
