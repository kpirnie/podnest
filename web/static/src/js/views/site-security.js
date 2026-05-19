"use strict";

import { api } from '../api.js';
import { toast } from '../toast.js';

// renderSecurityPanel renders the shared IP + UA security panel for either
// global scope (siteId null) or per-site scope (siteId set).
export function renderSecurityPanel(siteId = null) {
    const ipBase  = siteId ? `/sites/${siteId}/security/ip` : `/security/ip`;
    const uaBase  = siteId ? `/sites/${siteId}/security/ua` : `/security/ua`;
    const wafBase = siteId ? `/sites/${siteId}/waf`          : `/settings/waf`;

    return `
        <div id="security-panel" data-ip-base="${ipBase}" data-ua-base="${uaBase}" data-waf-base="${wafBase}" ${siteId ? `data-site-id="${siteId}"` : ''}>

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

            ${!siteId ? `
            <div class="kp-card uk-padding-small uk-margin-bottom">
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
                <textarea class="uk-textarea kp-textarea kp-mono" id="sec-tp-cidrs" rows="15"
                    placeholder="192.168.1.0/24"></textarea>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    One IPv4 or IPv6 CIDR per line. Auto-fetched provider ranges are
                    managed automatically and do not need to be entered here.
                </p>
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
        const fetches = [api.get(ipBase), api.get(uaBase)];
        if (!panel.dataset.siteId) fetches.push(api.get(wafBase), api.get("/settings/trusted-proxies"));
        const [ip, ua, waf, tp] = await Promise.all(fetches);

        root.querySelector("#sec-ip-whitelist").value = ip.whitelist ?? "";
        root.querySelector("#sec-ip-blacklist").value = ip.blacklist ?? "";
        root.querySelector("#sec-ua-whitelist").value = ua.whitelist ?? "";
        root.querySelector("#sec-ua-blacklist").value = ua.blacklist ?? "";

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

    // import trusted proxy CIDRs from CSV
    root.querySelector("#sec-tp-import")?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res  = await fetch("/api/settings/trusted-proxies/import", { method: "POST", body: fd });
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
            const res  = await fetch("/api" + ipBase + "/import", { method: "POST", body: fd });
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
            const res  = await fetch("/api" + uaBase + "/import", { method: "POST", body: fd });
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
            const res  = await fetch("/api/settings/waf/import", { method: "POST", body: fd });
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
