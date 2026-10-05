// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { errorState, isAdmin } from '../helpers.js';
import { toast } from '../toast.js';
import { initAutoBanPanel, renderAutoBanPanel } from './autoban.js';
import { initWAFPills } from './site-waf.js';

export async function viewWAF(root, params = {}) {
    if (!isAdmin()) { root.innerHTML = errorState("Access denied"); return; }

    root.innerHTML = `
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global WAF</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global WAF settings apply to all sites. Per-site overrides are set on each site's WAF tab.
        </p>

        <!-- tab pills -->
        <ul class="kp-tab-pills" id="kp-waf-pills">
            <li data-tab="crs"><a href="#"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> Core Rule Set</a></li>
            <li data-tab="autoban"><a href="#"><span uk-icon="icon: ban; ratio: 0.85"></span> Auto-Ban</a></li>
        </ul>

        <!-- switcher panels -->
        <ul class="uk-switcher uk-margin-large-bottom" id="kp-waf-switcher">

            <!-- core rule set -->
            <li>
                <div class="kp-card uk-padding-small">
                    <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                        <h3 class="kp-view-title">Web Application Firewall</h3>
                        <div class="uk-flex" style="gap:8px">
                            <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/waf/export" download="podnest-waf-settings.json" uk-tooltip="Export WAF settings">
                                <span uk-icon="download"></span>
                            </a>
                            <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import WAF settings from JSON">
                                <span uk-icon="upload"></span>
                                <input type="file" id="sec-waf-import" accept=".json" style="display:none">
                            </label>
                            <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-waf-save" uk-tooltip="Save WAF Settings">
                                <span uk-icon="check"></span>
                            </button>
                        </div>
                    </div>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Inspects all proxied requests using the OWASP Core Rule Set.
                        Start in Detection mode to review false positives before enabling Prevention.
                        The engine recompiles in the background after saving.
                    </p>
                    <div class="uk-grid-small uk-margin-small-bottom" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label" for="sec-waf-mode">Mode</label>
                            <select class="uk-select kp-select" id="sec-waf-mode">
                                <option value="0">Detection — log matches only</option>
                                <option value="1">Prevention — block matching requests</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label" for="sec-waf-paranoia">Paranoia Level</label>
                            <select class="uk-select kp-select" id="sec-waf-paranoia">
                                <option value="1">1 — Baseline (recommended)</option>
                                <option value="2">2 — Moderate</option>
                                <option value="3">3 — Strict</option>
                                <option value="4">4 — Paranoid</option>
                            </select>
                        </div>
                    </div>
                    <div class="uk-grid-small uk-margin-small-bottom" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">
                                <input class="uk-checkbox" type="checkbox" id="sec-waf-enabled">
                                &nbsp;Enable WAF (OWASP Core Rule Set)
                            </label>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">
                                <input class="uk-checkbox" type="checkbox" id="sec-waf-audit">
                                &nbsp;Enable Audit Log
                            </label>
                        </div>
                    </div>
                    <div class="uk-margin-small-bottom">
                        <label class="kp-label" for="sec-waf-exclusions">Global Rule Exclusions</label>
                        <textarea class="uk-textarea kp-textarea kp-mono kp-waf-exclusions" id="sec-waf-exclusions" rows="15"
                            placeholder="# Numeric = rule ID, text = tag name, one per line&#10;920350&#10;attack-sqli"></textarea>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Numeric entries map to <span class="kp-mono">SecRuleRemoveById</span>;
                            text entries to <span class="kp-mono">SecRuleRemoveByTag</span>.
                        </p>
                    </div>
                </div>
            </li>

            <!-- auto-ban -->
            <li>${renderAutoBanPanel()}</li>

        </ul>`;

    wireWAF(root);
    initWAFPills(root, params.tab);
    loadWAF(root);
    initAutoBanPanel(root);
}

// loadWAF fetches the global WAF settings and populates the form
async function loadWAF(root) {
    try {
        const waf = await api.get("/settings/waf");

        // bail if the user navigated away while the fetch was in flight
        if (!root.querySelector("#sec-waf-enabled")) return;

        root.querySelector("#sec-waf-enabled").checked   = !!waf.Enabled;
        root.querySelector("#sec-waf-audit").checked     = !!waf.AuditLog;
        root.querySelector("#sec-waf-mode").value        = String(waf.Mode          ?? 0);
        root.querySelector("#sec-waf-paranoia").value    = String(waf.ParanoiaLevel ?? 1);
        root.querySelector("#sec-waf-exclusions").value  = waf.Exclusions ?? "";
    } catch (e) {
        toast.error("Failed to load WAF settings: " + e.message);
    }
}

// wireWAF attaches the save and import handlers to the global WAF form
function wireWAF(root) {

    // save global WAF settings
    root.querySelector("#sec-waf-save")?.addEventListener("click", async () => {
        const btn  = root.querySelector("#sec-waf-save");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await api.put("/settings/waf", {
                enabled:        root.querySelector("#sec-waf-enabled").checked,
                mode:           parseInt(root.querySelector("#sec-waf-mode").value, 10),
                paranoia_level: parseInt(root.querySelector("#sec-waf-paranoia").value, 10),
                audit_log:      root.querySelector("#sec-waf-audit").checked,
                exclusions:     root.querySelector("#sec-waf-exclusions").value.trim(),
            });
            toast.success("WAF settings saved — engine recompiling in background");
        } catch (e) {
            toast.error(e.message);
        } finally {
            btn.disabled  = false;
            btn.innerHTML = orig;
        }
    });

    // global WAF JSON import
    root.querySelector("#sec-waf-import")?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res  = await fetch("/api/settings/waf/import", { method: "POST", headers: { "X-CSRF-Token": window.KP?.csrf ?? "" }, body: fd });
            const data = res.status === 204 ? null : await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
            await loadWAF(root);
            toast.success("WAF settings imported");
        } catch (err) {
            toast.error(err.message);
        } finally {
            e.target.value = "";
        }
    });
}
