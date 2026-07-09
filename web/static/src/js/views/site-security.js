// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { toast } from '../toast.js';

// renderSecurityPanel renders the shared IP + UA security panel for either
// global scope (siteId null) or per-site scope (siteId set).
export function renderSecurityPanel(siteId = null) {
    const ipBase  = siteId ? `/sites/${siteId}/security/ip` : `/security/ip`;
    const uaBase  = siteId ? `/sites/${siteId}/security/ua` : `/security/ua`;
    const wafBase = siteId ? `/sites/${siteId}/waf`          : `/settings/waf`;
    const geoBase = siteId ? `/sites/${siteId}/security/country` : `/security/country`;
    const asnBase = siteId ? `/sites/${siteId}/security/asn` : `/security/asn`;

    return `
        <div id="security-panel" data-ip-base="${ipBase}" data-ua-base="${uaBase}" data-geo-base="${geoBase}" data-asn-base="${asnBase}" data-waf-base="${wafBase}" ${siteId ? `data-site-id="${siteId}"` : ''}>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">IP Rules</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${ipBase}/export" download="${siteId ? `site-${siteId}-ip-rules.csv` : `podnest-global-ip-rules.csv`}" uk-tooltip="Export IP rules as CSV">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import IP rules from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-ip-import" accept=".csv" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ip-save" uk-tooltip="Save the IP Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One IP address or CIDR block per line (e.g. <span class="kp-mono">1.2.3.4</span>
                    or <span class="kp-mono">10.0.0.0/8</span>).
                    Blacklist always wins — a blacklisted IP cannot be whitelisted.
                    Whitelist is disabled when empty.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ip-whitelist" rows="6"
                            placeholder="# allow only these IPs&#10;1.2.3.4&#10;10.0.0.0/8"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ip-blacklist" rows="6"
                            placeholder="# block these IPs&#10;5.6.7.8&#10;192.168.99.0/24"></textarea>
                    </div>
                </div>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">User-Agent Rules</h3>
                    <div class="uk-flex" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api${uaBase}/export" download="${siteId ? `site-${siteId}-ua-rules.csv` : `podnest-global-ua-rules.csv`}" uk-tooltip="Export UA rules as CSV">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import UA rules from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="sec-ua-import" accept=".csv" style="display:none">
                        </label>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ua-save" uk-tooltip="Save the User-Agent Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One substring per line — matched case-insensitively against the full User-Agent header.
                    Blacklist always wins. Whitelist is disabled when empty.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ua-whitelist" rows="6"
                            placeholder="# allow only these agents&#10;mozilla&#10;googlebot"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ua-blacklist" rows="6"
                            placeholder="# block these agents&#10;sqlmap&#10;nikto&#10;masscan"></textarea>
                    </div>
                </div>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Country Rules</h3>
                    <div class="uk-flex" style="gap:8px">
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-geo-save" uk-tooltip="Save the Country Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One ISO 3166-1 alpha-2 country code per line (e.g. <span class="kp-mono">US</span>
                    or <span class="kp-mono">DE</span>).
                    Blacklist always wins. Whitelist is disabled when empty.
                    Unresolvable IPs (private ranges, unknown) are always allowed.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-geo-whitelist" rows="6"
                            placeholder="# allow only these countries&#10;US&#10;CA"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-geo-blacklist" rows="6"
                            placeholder="# block these countries&#10;CN&#10;RU"></textarea>
                    </div>
                </div>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">ASN Rules</h3>
                    <div class="uk-flex uk-flex-middle" style="gap:8px">
                        <button class="uk-button kp-btn-ghost kp-btn-sm" id="sec-asn-lookup" uk-tooltip="Look up the ASN for an IP or domain">
                            <span uk-icon="eye"></span>
                        </button>
                        <div style="width:1px;align-self:stretch;background:var(--kp-border)"></div>
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-asn-save" uk-tooltip="Save the ASN Rules">
                            <span uk-icon="check"></span>
                        </button>
                    </div>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One autonomous system number per line (e.g. <span class="kp-mono">AS15169</span>
                    or <span class="kp-mono">15169</span>).
                    Blacklist always wins. Whitelist is disabled when empty.
                    Unresolvable IPs (private ranges, unknown) are always allowed.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-asn-whitelist" rows="6"
                            placeholder="# allow only these networks&#10;AS7922&#10;AS20115"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-asn-blacklist" rows="6"
                            placeholder="# block these networks&#10;AS16509&#10;AS14061"></textarea>
                    </div>
                </div>
            </div>

            ${!siteId ? `
            <div class="uk-grid uk-grid-small uk-margin-bottom" uk-grid>
                <div class="uk-width-1-2@m">
                    <div class="kp-card uk-padding-small uk-height-1-1">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Trusted Proxy Ranges</h3>
                            <div class="uk-flex" style="gap:8px">
                                <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/trusted-proxies/export" download="podnest-trusted-proxies.csv" uk-tooltip="Export trusted proxies">
                                    <span uk-icon="download"></span>
                                </a>
                                <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import trusted proxies from CSV">
                                    <span uk-icon="upload"></span>
                                    <input type="file" id="sec-tp-import" accept=".csv" style="display:none">
                                </label>
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-tp-save" uk-tooltip="Save Trusted Proxy Ranges">
                                    <span uk-icon="check"></span>
                                </button>
                            </div>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            Custom IP ranges (one CIDR per line) to trust in addition to the
                            auto-fetched Cloudflare, Fastly, and CloudFront ranges.
                            <code>X-Forwarded-For</code> is only honoured when a request arrives
                            from one of these addresses.
                        </p>
                        <textarea class="uk-textarea kp-textarea kp-mono" id="sec-tp-cidrs" rows="12"
                            placeholder="192.168.1.0/24"></textarea>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            One IPv4 or IPv6 CIDR per line. Auto-fetched provider ranges are
                            managed automatically and do not need to be entered here.
                        </p>
                    </div>
                </div>
                <div class="uk-width-1-2@m">
                    <div class="kp-card uk-padding-small uk-height-1-1">
                        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                            <h3 class="kp-view-title">Security Bypass</h3>
                            <div class="uk-flex" style="gap:8px">
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-bypass-save" uk-tooltip="Save Bypass Rules">
                                    <span uk-icon="check"></span>
                                </button>
                            </div>
                        </div>
                        <p class="kp-muted uk-text-small uk-margin-small-bottom">
                            IPs or CIDRs that skip all security checks (IP rules, UA rules, WAF).
                            Use for trusted services that must not be blocked. Supports inline
                            notes with <code>#</code> e.g. <code>1.2.3.4/32 # WP Umbrella</code>
                        </p>
                        <textarea class="uk-textarea kp-textarea kp-mono" id="sec-bypass-cidrs" rows="12"
                            placeholder="1.2.3.4/32 # WP Umbrella&#10;2001:db8::/32 # monitoring"></textarea>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            One IPv4, IPv6, or CIDR per line. Bypassed IPs are still proxied normally — only enforcement is skipped.
                        </p>
                    </div>
                </div>
            </div>

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
            ` : ''}

        </div>`;
}

// loadSecurityPanel fetches the current rules from the API and populates the
// four textareas. Must be called after renderSecurityPanel has been inserted
// into the DOM.
export async function loadSecurityPanel(root) {
    const panel  = root.querySelector("#security-panel");
    if (!panel) return;

    const ipBase  = panel.dataset.ipBase;
    const uaBase  = panel.dataset.uaBase;
    const wafBase = panel.dataset.wafBase;

    try {
        const geoBase = panel.dataset.geoBase;
        const asnBase = panel.dataset.asnBase;
        const fetches = [api.get(ipBase), api.get(uaBase), api.get(geoBase), api.get(asnBase)];
        if (!panel.dataset.siteId) fetches.push(api.get(wafBase), api.get("/settings/trusted-proxies"), api.get("/security/bypass"));
        const [ip, ua, geo, asn, waf, tp, bp] = await Promise.all(fetches);

        // bail if the user navigated away while the fetch was in flight
        if (!root.querySelector("#sec-ip-whitelist")) return;

        root.querySelector("#sec-ip-whitelist").value = ip.whitelist ?? "";
        root.querySelector("#sec-ip-blacklist").value = ip.blacklist ?? "";
        root.querySelector("#sec-ua-whitelist").value = ua.whitelist ?? "";
        root.querySelector("#sec-ua-blacklist").value = ua.blacklist ?? "";
        root.querySelector("#sec-geo-whitelist").value = geo.whitelist ?? "";
        root.querySelector("#sec-geo-blacklist").value = geo.blacklist ?? "";
        root.querySelector("#sec-asn-whitelist").value = asn.whitelist ?? "";
        root.querySelector("#sec-asn-blacklist").value = asn.blacklist ?? "";

        if (waf) {
            const enabled  = root.querySelector("#sec-waf-enabled");
            const audit    = root.querySelector("#sec-waf-audit");
            const mode     = root.querySelector("#sec-waf-mode");
            const paranoia = root.querySelector("#sec-waf-paranoia");
            const excl     = root.querySelector("#sec-waf-exclusions");
            if (enabled)  enabled.checked  = !!waf.Enabled;
            if (audit)    audit.checked    = !!waf.AuditLog;
            if (mode)     mode.value       = String(waf.Mode          ?? 0);
            if (paranoia) paranoia.value   = String(waf.ParanoiaLevel ?? 1);
            if (excl)     excl.value       = waf.Exclusions ?? "";
        }

        if (tp) {
            const cidrs = root.querySelector("#sec-tp-cidrs");
            if (cidrs) cidrs.value = tp.trusted_proxies_custom ?? "";
        }

        if (bp) {
            const bypassEl = root.querySelector("#sec-bypass-cidrs");
            if (bypassEl) bypassEl.value = bp.bypass ?? "";
        }

    } catch (e) {
        toast.error("Failed to load security rules: " + e.message);
    }
}

// wireSecurityPanel attaches save button handlers to the security panel.
// Must be called after renderSecurityPanel has been inserted into the DOM.
export function wireSecurityPanel(root) {
    const panel = root.querySelector("#security-panel");
    if (!panel) return;

    const ipBase  = panel.dataset.ipBase;
    const uaBase  = panel.dataset.uaBase;
    const geoBase = panel.dataset.geoBase;

    // save IP rules
    root.querySelector("#sec-ip-save")?.addEventListener("click", async () => {
        const btn  = root.querySelector("#sec-ip-save");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await api.put(ipBase, {
                whitelist: root.querySelector("#sec-ip-whitelist").value,
                blacklist: root.querySelector("#sec-ip-blacklist").value,
            });
            toast.success("IP rules saved");
        } catch (e) {
            toast.error(e.message);
        } finally {
            btn.disabled  = false;
            btn.innerHTML = orig;
        }
    });

    // save UA rules
    root.querySelector("#sec-ua-save")?.addEventListener("click", async () => {
        const btn  = root.querySelector("#sec-ua-save");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await api.put(uaBase, {
                whitelist: root.querySelector("#sec-ua-whitelist").value,
                blacklist: root.querySelector("#sec-ua-blacklist").value,
            });
            toast.success("UA rules saved");
        } catch (e) {
            toast.error(e.message);
        } finally {
            btn.disabled  = false;
            btn.innerHTML = orig;
        }
    });

    // save country rules
    root.querySelector("#sec-geo-save")?.addEventListener("click", async () => {
        const btn  = root.querySelector("#sec-geo-save");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            const body = {
                whitelist: root.querySelector("#sec-geo-whitelist").value,
                blacklist: root.querySelector("#sec-geo-blacklist").value,
            };
            let res = await api.put(geoBase, body);
            if (res?.status === "confirm") {
                await UIkit.modal.confirm(`${res.reason}. Save anyway?`);
                res = await api.put(geoBase, { ...body, confirm: true });
            }
            toast.success("Country rules saved");
        } catch (e) {
            // a cancelled confirm dialog rejects with no error — stay silent
            if (e instanceof Error) toast.error(e.message);
        }  finally {
            btn.disabled  = false;
            btn.innerHTML = orig;
        }
    });

    // save ASN rules
    root.querySelector("#sec-asn-save")?.addEventListener("click", async () => {
        const btn  = root.querySelector("#sec-asn-save");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            const asnBase = root.querySelector("#security-panel").dataset.asnBase;
            const body = {
                whitelist: root.querySelector("#sec-asn-whitelist").value,
                blacklist: root.querySelector("#sec-asn-blacklist").value,
            };
            let res = await api.put(asnBase, body);
            if (res?.status === "confirm") {
                await UIkit.modal.confirm(`${res.reason}. Save anyway?`);
                res = await api.put(asnBase, { ...body, confirm: true });
            }
            toast.success("ASN rules saved");
        } catch (e) {
            // a cancelled confirm dialog rejects with no error — stay silent
            if (e instanceof Error) toast.error(e.message);
        } finally {
            btn.disabled  = false;
            btn.innerHTML = orig;
        }
    });

    // ASN lookup modal
    root.querySelector("#sec-asn-lookup")?.addEventListener("click", () => showASNLookupModal(root));

    // save trusted proxy CIDRs
    root.querySelector("#sec-tp-save")?.addEventListener("click", async () => {
        const btn  = root.querySelector("#sec-tp-save");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await api.put("/settings/trusted-proxies", {
                trusted_proxies_custom: root.querySelector("#sec-tp-cidrs").value.trim(),
            });
            toast.success("Trusted proxy ranges saved");
        } catch (e) {
            toast.error(e.message);
        } finally {
            btn.disabled  = false;
            btn.innerHTML = orig;
        }
    });

    // save bypassed IPs
    root.querySelector("#sec-bypass-save")?.addEventListener("click", async () => {
        const btn  = root.querySelector("#sec-bypass-save");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await api.put("/security/bypass", { bypass: root.querySelector("#sec-bypass-cidrs").value.trim() });
            toast.success("Bypass rules saved");
        } catch (e) {
            toast.error(e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    // import trusted proxy CIDRs from CSV
    root.querySelector("#sec-tp-import")?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res  = await fetch("/api/settings/trusted-proxies/import", { method: "POST", headers: { "X-CSRF-Token": window.KP?.csrf ?? "" }, body: fd });
            const data = res.status === 204 ? null : await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
            await loadSecurityPanel(root);
            toast.success("Trusted proxies imported");
        } catch (err) {
            toast.error(err.message);
        } finally {
            e.target.value = "";
        }
    });

    // save global WAF settings
    root.querySelector("#sec-waf-save")?.addEventListener("click", async () => {
        const btn  = root.querySelector("#sec-waf-save");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await api.put(panel.dataset.wafBase, {
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

    // IP rules CSV import
    root.querySelector("#sec-ip-import")?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res  = await fetch("/api" + ipBase + "/import", { method: "POST", headers: { "X-CSRF-Token": window.KP?.csrf ?? "" }, body: fd });
            const data = res.status === 204 ? null : await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
            await loadSecurityPanel(root);
            toast.success("IP rules imported");
        } catch (err) {
            toast.error(err.message);
        } finally {
            e.target.value = "";
        }
    });

    // UA rules CSV import
    root.querySelector("#sec-ua-import")?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res  = await fetch("/api" + uaBase + "/import", { method: "POST", headers: { "X-CSRF-Token": window.KP?.csrf ?? "" }, body: fd });
            const data = res.status === 204 ? null : await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
            await loadSecurityPanel(root);
            toast.success("UA rules imported");
        } catch (err) {
            toast.error(err.message);
        } finally {
            e.target.value = "";
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
            await loadSecurityPanel(root);
            toast.success("WAF settings imported");
        } catch (err) {
            toast.error(err.message);
        } finally {
            e.target.value = "";
        }
    });
}

// showASNLookupModal presents the IP/domain → ASN lookup dialog, with a
// one-click action to append the result to the blacklist textarea.
function showASNLookupModal(root) {
    document.getElementById("kp-asn-lookup-modal")?.remove();
    const html = `
        <div id="kp-asn-lookup-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">ASN Lookup</h3>
                <div class="uk-flex uk-margin-top" style="gap:8px">
                    <input class="uk-input kp-input" id="asn-lookup-q" type="text" placeholder="IP address or domain">
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="asn-lookup-go" uk-tooltip="Look it up">
                        <span uk-icon="search"></span>
                    </button>
                </div>
                <div id="asn-lookup-result" class="uk-margin-top"></div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const modal = UIkit.modal("#kp-asn-lookup-modal");
    modal.show();

    const run = async () => {
        const q = document.getElementById("asn-lookup-q").value.trim();
        if (!q) return;
        const out = document.getElementById("asn-lookup-result");
        out.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            const res = await api.get(`/security/asn/lookup?q=${encodeURIComponent(q)}`);
            if (!res?.asn) {
                out.innerHTML = `<p class="kp-muted uk-text-small">No ASN found for <span class="kp-mono"></span>.</p>`;
                out.querySelector(".kp-mono").textContent = res?.ip || q;
                return;
            }
            out.innerHTML = `
                <p class="uk-text-small">
                    <span class="kp-mono" id="asn-lookup-ip"></span> →
                    <span class="kp-mono">AS${res.asn}</span>
                    <span id="asn-lookup-org"></span>
                    ${res.country ? `<span class="kp-muted">(${res.country})</span>` : ""}
                </p>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="asn-lookup-add">
                    <span uk-icon="ban"></span> Add AS${res.asn} to blacklist
                </button>`;
            // org and ip are set via textContent — registry-sourced strings stay text
            out.querySelector("#asn-lookup-ip").textContent  = res.ip;
            out.querySelector("#asn-lookup-org").textContent = res.org || "";
            out.querySelector("#asn-lookup-add").addEventListener("click", () => {
                const ta   = root.querySelector("#sec-asn-blacklist");
                const line = `AS${res.asn}`;
                if (!ta.value.split("\n").some(l => l.trim().toUpperCase() === line)) {
                    ta.value = ta.value.trim() ? `${ta.value.replace(/\s+$/, "")}\n${line}` : line;
                }
                modal.hide();
                toast.success(`${line} added to blacklist — save to apply`);
            });
        } catch (e) {
            out.innerHTML = "";
            toast.error(e.message);
        }
    };
    document.getElementById("asn-lookup-go").addEventListener("click", run);
    document.getElementById("asn-lookup-q").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
}