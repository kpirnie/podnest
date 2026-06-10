"use strict";

import { api } from '../api.js';
import { hideProgressModal, showCloneModal, showProgressModal, statusBadge } from '../helpers.js';
import { showEditSiteModal } from '../modals/edit-site.js';
import { router } from '../router.js';
import { toast } from '../toast.js';
import { loadBackupsPanel, renderBackupsTab, wireBackupsPanel } from './site-backups.js';
import { renderConfigTab, renderVarnishTab, wireConfigTabs } from './site-configs.js';
import { loadCronsPanel, renderCronsTab, wireCronsPanel } from './site-crons.js';
import { renderLogsTab, wireLogsTab } from './site-logs.js';
import { loadAllDomainSSL, renderOverviewTab, wireDomainActions, wireOverviewTab } from './site-overview.js';
import { loadRedirectsTab, renderRedirectsTab, wireRedirectsTab } from './site-redirects.js';
import { loadSecurityPanel, renderSecurityPanel, wireSecurityPanel } from './site-security.js';
import { loadStatsTab, renderStatsTab, wireStatsTab } from './site-stats.js';
import { renderWPCLITab, wireWPCLITab } from './site-wpcli.js';


// aborts accumulated root-level listeners when a new RP site detail view is wired
let _rpWireAbort = null;

// holds the active health badge WebSocket; closed on next navigation
let _healthWS = null;

// renderWAFOverride returns the static HTML shell for the WAF override tab
function renderWAFOverride() {
    return `
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">WAF Override</h3>
            <form id="waf-override-form" class="uk-form-stacked">
                <div class="uk-margin">
                    <label class="kp-label" for="waf-override">Site Behaviour</label>
                    <select class="uk-select kp-select" id="waf-override" name="override">
                        <option value="0">Inherit global setting</option>
                        <option value="1">Force ON for this site</option>
                        <option value="2">Force OFF for this site</option>
                    </select>
                </div>
                <div class="uk-margin">
                    <label class="kp-label">CRS Plugins</label>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Select OWASP CRS plugins to enable for this site. Only plugins present in the
                        local CRS install are shown. Changes recompile the site WAF engine in the background.
                    </p>
                    <div id="waf-plugins-list" class="uk-margin-small-top">
                        <span class="kp-muted uk-text-small">Loading available plugins…</span>
                    </div>
                </div>
                <div class="uk-margin">
                    <label class="kp-label" for="waf-site-exclusions">Additional Rule Exclusions</label>
                    <textarea
                        class="uk-textarea kp-input kp-mono kp-waf-exclusions"
                        id="waf-site-exclusions"
                        name="exclusions"
                        rows="15"
                        placeholder="# Numeric = rule ID, text = tag name, one per line&#10;942100&#10;attack-xss"></textarea>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Merged on top of global exclusions. Useful for WooCommerce, contact forms, or file upload paths that trigger false positives.
                    </p>
                </div>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <a class="uk-button kp-btn-ghost" id="waf-export-btn" href="#" uk-tooltip="Export WAF settings">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost" style="cursor:pointer" uk-tooltip="Import WAF settings">
                        <span uk-icon="upload"></span>
                        <input type="file" id="waf-import" accept=".json" style="display:none">
                    </label>
                    <button type="submit" class="uk-button kp-btn-primary">
                        <span uk-icon="check"></span> Save
                    </button>
                </div>
            </form>
        </div>`;
}

// initPillTabs wires the 4-pill nav to the uk-switcher and manages the manage dropdown
function initPillTabs(root) {
    const pills    = root.querySelector("#kp-site-pills");
    const switcher = root.querySelector("#kp-site-switcher");
    const managePill = root.querySelector("#kp-manage-pill");
    const dropdown   = root.querySelector("#kp-manage-dropdown");
    if (!pills || !switcher) return;

    // show the nth switcher panel and update pill active states
    function showPanel(idx, fromDropdown = false) {
        UIkit.switcher(switcher).show(idx);

        // clear all direct-pill active classes
        pills.querySelectorAll(":scope > li[data-pill]").forEach(li => li.classList.remove("kp-pill-active"));

        if (fromDropdown) {
            // highlight the manage pill when a dropdown item is active
            managePill?.classList.add("kp-pill-active");
            // mark the active dropdown link
            dropdown?.querySelectorAll("a[data-switcher]").forEach(a => {
                a.classList.toggle("kp-dd-active", parseInt(a.dataset.switcher, 10) === idx);
            });
        } else {
            managePill?.classList.remove("kp-pill-active");
            dropdown?.querySelectorAll("a[data-switcher]").forEach(a => a.classList.remove("kp-dd-active"));
        }
    }

    // direct pill clicks (Overview / Stats / Logs)
    pills.querySelectorAll(":scope > li[data-pill] > a").forEach(a => {
        a.addEventListener("click", (e) => {
            e.preventDefault();
            const idx = parseInt(a.closest("li").dataset.pill, 10);
            showPanel(idx, false);
        });
    });

    // manage pill toggle
    const manageBtn = managePill?.querySelector(".kp-pill-dropdown-btn");
    manageBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.hidden = !dropdown.hidden;
        managePill.classList.toggle("kp-pill-active", !dropdown.hidden);
    });

    // dropdown item clicks
    dropdown?.querySelectorAll("a[data-switcher]").forEach(a => {
        a.addEventListener("click", (e) => {
            e.preventDefault();
            dropdown.hidden = true;
            showPanel(parseInt(a.dataset.switcher, 10), true);
        });
    });

    // close dropdown on outside click
    document.addEventListener("click", (e) => {
        if (dropdown && !managePill.contains(e.target)) {
            dropdown.hidden = true;
        }
    }, { capture: true });

    // initialise switcher to panel 0 on load
    UIkit.switcher(switcher).show(0);
}

// loadWAFTab fetches the current WAF override for the site and populates the form
async function loadWAFTab(id) {
    const panel = document.getElementById("waf-tab-panel");
    if (!panel) return;
    panel.innerHTML = renderWAFOverride();
    const exportBtn = document.getElementById("waf-export-btn");
    if (exportBtn) exportBtn.href = `/api/sites/${id}/waf/export`;

    try {
        const data = await api.get(`/sites/${id}/waf`);
        const sel  = document.getElementById("waf-override");
        const exc  = document.getElementById("waf-site-exclusions");
        if (sel) sel.value = String(data.Override ?? 0);
        if (exc) exc.value = data.Exclusions ?? '';

        // populate plugin checkboxes
        const pluginsList = document.getElementById("waf-plugins-list");
        if (pluginsList) {
            const [available, selected] = await Promise.all([
                api.get(`/settings/waf/plugins`),
                api.get(`/sites/${id}/waf/plugins`),
            ]);
            const enabledSet = new Set(selected ?? []);
            if (!available || available.length === 0) {
                pluginsList.innerHTML = `<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>`;
            } else {
                pluginsList.innerHTML = `
                    <div class="waf-plugin-pills">
                        ${available.map(p => `
                        <span class="waf-plugin-pill ${enabledSet.has(p) ? 'active' : ''}"
                            data-plugin="${p}">${p}</span>
                        `).join("")}
                    </div>`;

                // toggle active state on click
                pluginsList.querySelectorAll(".waf-plugin-pill").forEach(pill => {
                    pill.addEventListener("click", () => pill.classList.toggle("active"));
                });
            }
        }
    } catch (e) {
        toast.error("Failed to load WAF settings: " + e.message);
    }
}

// wireWAFTab binds the WAF override form submit handler
function wireWAFTab(root, id) {
    // abort any stale listener from a previous navigation before attaching
    if (_rpWireAbort) _rpWireAbort.abort();
    _rpWireAbort = new AbortController();
    
    root.addEventListener("submit", async (e) => {
        if (e.target.id !== "waf-override-form") return;
        e.preventDefault();
        const btn  = e.target.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Saving...';

        const fd   = new FormData(e.target);
        const body = {
            override:   parseInt(fd.get("override"), 10),
            exclusions: fd.get("exclusions").trim(),
        };

        try {
            await api.put(`/sites/${id}/waf`, body);

            // save plugin selection
            const plugins = [...document.querySelectorAll(".waf-plugin-pill.active")]
                .map(p => p.dataset.plugin);
            await api.put(`/sites/${id}/waf/plugins`, plugins);

            toast.success("WAF override saved — engine recompiling in background");
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    }, { signal: _rpWireAbort.signal });

    // WAF JSON import
    root.querySelector("#waf-import")?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res  = await fetch(`/api/sites/${id}/waf/import`, { method: "POST", body: fd });
            const data = res.status === 204 ? null : await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
            await loadWAFTab(id);
            toast.success("WAF settings imported");
        } catch (err) {
            toast.error(err.message);
        } finally {
            e.target.value = "";
        }
    });
}

// renderRoutesTab returns the static HTML shell for the reverse proxy routes tab
function renderRoutesTab() {
    return `
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">Upstream Routes</h3>
            <p class="kp-muted uk-text-small uk-margin-bottom">
                Each domain maps to one or more upstream URLs. Multiple upstreams for the same
                domain are load-balanced via round-robin.
            </p>
            <div id="rp-routes-list"></div>
            <button class="uk-button kp-btn-ghost uk-margin-small-top" id="rp-add-row">
                <span uk-icon="plus"></span> Add Route
            </button>
            <div class="uk-flex uk-flex-right uk-margin-top">
                <button class="uk-button kp-btn-primary" id="rp-save-btn">
                    <span uk-icon="check"></span> Save Routes
                </button>
            </div>
        </div>`;
}

// renderRouteRow returns a single editable domain→upstream row
function renderRouteRow(domain = "", upstream = "", passHost = false) {
    return `
        <div class="rp-route-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <input class="uk-input kp-input" style="flex:1" placeholder="example.com" value="${domain}" data-field="domain">
            <input class="uk-input kp-input" style="flex:2" placeholder="https://10.0.0.1:8080" value="${upstream}" data-field="upstream">
            <label style="white-space:nowrap;font-size:0.75rem;color:var(--kp-text-dim)" title="Send incoming domain as Host header instead of upstream hostname">
                <input type="checkbox" class="uk-checkbox" data-field="pass_host" ${passHost ? "checked" : ""}> Pass Host
            </label>
            <button class="uk-button kp-btn-ghost kp-btn-sm rp-remove-row" uk-tooltip="Remove"><span uk-icon="trash"></span></button>
        </div>`;
}

// loadRoutesTab fetches existing routes and populates the routes editor
async function loadRoutesTab(id) {
    const list = document.getElementById("rp-routes-list");
    if (!list) return;
    try {
        const routes = await api.get(`/sites/${id}/rp-routes`);
        list.innerHTML = routes.length
            ? routes.map(r => renderRouteRow(r.Domain, r.Upstream, r.PassHost)).join("")
            : renderRouteRow();
    } catch (e) {
        toast.error("Failed to load routes: " + e.message);
    }
}

// wireRoutesTab binds add-row, remove-row, and save actions for the routes editor
function wireRoutesTab(root, id) {
    root.addEventListener("click", async (e) => {
        if (e.target.closest("#rp-add-row")) {
            document.getElementById("rp-routes-list")
                .insertAdjacentHTML("beforeend", renderRouteRow());
            return;
        }
        if (e.target.closest(".rp-remove-row")) {
            e.target.closest(".rp-route-row").remove();
            return;
        }
        if (!e.target.closest("#rp-save-btn")) return;

        const btn  = e.target.closest("#rp-save-btn");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Saving...';

        const routes = [...document.querySelectorAll(".rp-route-row")].map(row => ({
            Domain:   row.querySelector('[data-field="domain"]').value.trim(),
            Upstream: row.querySelector('[data-field="upstream"]').value.trim(),
            PassHost: row.querySelector('[data-field="pass_host"]').checked,
        })).filter(r => r.Domain && r.Upstream);

        try {
            await api.put(`/sites/${id}/rp-routes`, routes);
            toast.success("Routes saved");
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    }, { signal: _rpWireAbort.signal });
}

// containerIcon maps a container role suffix to a UIkit icon name
function containerIcon(name) {
    if (name.endsWith("-nginx"))   return "world";
    if (name.endsWith("-php"))     return "code";
    if (name.endsWith("-db"))      return "database";
    if (name.endsWith("-redis"))   return "server";
    if (name.endsWith("-varnish")) return "grid";
    if (name.endsWith("-pma"))     return "table";
    if (name.endsWith("-app"))     return "laptop";
    return "bolt";
}

function containerLabel(name) {
    const role = name.split("-").pop();
    const labels = {
        nginx: "Nginx", php: "PHP-FPM", db: "MariaDB",
        redis: "Redis", varnish: "Varnish", pma: "phpMyAdmin",
        app: "App",
    };
    return labels[role] ?? role;
}

// healthColor maps a Podman health status to a CSS color variable
function healthColor(status) {
    switch (status) {
        case "healthy":   return "var(--kp-success)";
        case "unhealthy": return "var(--kp-danger)";
        case "starting":  return "var(--kp-warning)";
        default:          return "var(--kp-text-dim)";
    }
}

// renderHealthBadges builds the badge HTML from a container health array
function renderHealthBadges(containers) {
    if (!containers || !containers.length) return "";
    return containers
        .filter(c => !c.name.endsWith("-infra"))
        .map(c => `
            <span class="kp-health-badge"
                data-container="${c.name}"
                title="Restart the Container"
                style="cursor:pointer;color:${healthColor(c.status)}">
                <span uk-icon="icon: ${containerIcon(c.name)}; ratio: 1.1"></span>
                <span class="kp-health-badge-label">${containerLabel(c.name)}</span>
            </span>
        `).join("");
}

// wireHealthBadges opens the health WebSocket for the site and drives the badge row.
// Closes any previous connection first.
function wireHealthBadges(root, id) {
    if (_healthWS) { _healthWS.close(); _healthWS = null; }

    const container = document.getElementById("sd-health-badges");
    if (!container) return;

    const proto = location.protocol === "https:" ? "wss" : "ws";
    _healthWS = new WebSocket(`${proto}://${location.host}/api/sites/${id}/health/stream`);

    _healthWS.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            container.innerHTML = renderHealthBadges(data);
            // wire click-to-restart on freshly rendered badges
            container.querySelectorAll(".kp-health-badge").forEach(badge => {
                badge.addEventListener("click", async () => {
                    // immediately signal restarting so users don't double-click
                    badge.style.color = healthColor("starting");

                    const cname = badge.dataset.container;
                    const role = cname.split("-").pop();
                    try {
                        await api.post(`/sites/${id}/containers/${role}/restart`);
                        toast.success(`${containerLabel(cname)} restarted`);
                    } catch (err) {
                        // revert color on failure so the badge reflects true state
                        badge.style.color = healthColor("none");
                        toast.error(err.message);
                    }
                });
            });
        } catch (_) { /* ignore malformed frames */ }
    };

    _healthWS.onerror = () => {};
    _healthWS.onclose = () => { _healthWS = null; };
}

export async function viewSiteDetail(root, { id }) {
    // fetch site detail and full site list in parallel for the nav selector
    const [{ site, domains, sftp }, rawSites, configs] = await Promise.all([
        api.get(`/sites/${id}`),
        api.get("/sites"),
        api.get(`/sites/${id}/configs`),
    ]);
    const allSites = Array.isArray(rawSites) ? rawSites : [];
    const showPHP = site.SiteType === 1 || site.SiteType === 2;
    const isRP    = site.SiteType === 6;
    const showCrons = [1, 2, 4, 5].includes(site.SiteType);

    root.innerHTML = `
        <div class="kp-view-header">
            <div class="uk-flex uk-flex-middle" style="gap:12px">
                <button class="kp-btn-icon" id="sd-back"><span uk-icon="arrow-left"></span></button>
                <div class="kp-site-nav-wrap">
                    <select id="sd-site-nav" class="uk-select kp-select">
                        ${allSites.map(s => `<option value="${s.ID}" ${s.ID === site.ID ? "selected" : ""}>${s.Name}</option>`).join("")}
                    </select>
                    <span class="kp-site-nav-arrow">&#9660;</span>
                </div>
                ${!isRP ? statusBadge(site.SiteStatus) : ""}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                ${!isRP ? `
                ${site.SiteStatus === 1
                ? `<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${id}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>`
                : `<button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${id}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>`
                }
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${id}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${id}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-recreate" uk-tooltip="Recreate &amp; Update the Pod"><span uk-icon="history"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-clone" uk-tooltip="Clone the Site"><span uk-icon="move"></span></button>
                ` : ""}
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-edit" uk-tooltip="Edit the Site"><span uk-icon="pencil"></span></button>
            </div>
        </div>
 
        ${isRP ? `
        <!-- tab pills (reverse proxy) -->
        <ul class="kp-tab-pills" id="kp-site-pills">
            <li data-pill="0"><a href="#">Routes</a></li>
            <li id="kp-manage-pill">
                <a href="javascript:void(0);" class="kp-pill-dropdown-btn">
                    Manage <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                </a>
                <div class="kp-pill-dropdown" id="kp-manage-dropdown" hidden>
                    <div class="kp-pill-dropdown-section">Security</div>
                    <a href="#" data-switcher="3"><span uk-icon="icon: lock; ratio: 0.85"></span> Security</a>
                    <a href="#" data-switcher="4"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> WAF</a>
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="2"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${renderRoutesTab()}</li>
            <li>${renderStatsTab(id, site.SiteType)}</li>
            <li>${renderLogsTab(id, site.SiteType)}</li>
            <li>${renderSecurityPanel(id)}</li>
            <li id="waf-tab-panel"></li>
        </ul>
        ` : `
        <!-- tab pills -->
        <ul class="kp-tab-pills" id="kp-site-pills">
            <li data-pill="0"><a href="#">Overview</a></li>
            <li id="kp-manage-pill">
                <a href="javascript:void(0);" class="kp-pill-dropdown-btn">
                    Manage <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                </a>
                <div class="kp-pill-dropdown" id="kp-manage-dropdown" hidden>
                    <div class="kp-pill-dropdown-section">Config</div>
                    <a href="#" data-switcher="2"><span uk-icon="icon: settings; ratio: 0.85"></span> Nginx</a>
                    ${showPHP ? `<a href="#" data-switcher="3"><span uk-icon="icon: code; ratio: 0.85"></span> PHP</a>` : ""}
                    <a href="#" data-switcher="${showPHP ? 4 : 3}"><span uk-icon="icon: database; ratio: 0.85"></span> MariaDB</a>
                    <a href="#" data-switcher="${showPHP ? 5 : 4}"><span uk-icon="icon: server; ratio: 0.85"></span> Redis</a>
                    <a href="#" data-switcher="${showPHP ? 6 : 5}"><span uk-icon="icon: world; ratio: 0.85"></span> Varnish</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Security</div>
                    <a href="#" data-switcher="${showPHP ? 8 : 7}"><span uk-icon="icon: lock; ratio: 0.85"></span> Security</a>
                    <a href="#" data-switcher="${showPHP ? 9 : 8}"><span uk-icon="icon: lifesaver; ratio: 0.85"></span> WAF</a>
                    <hr>
                    <div class="kp-pill-dropdown-section">Tools</div>
                    ${site.SiteType === 1 ? `<a href="#" data-switcher="${showPHP ? 10 : 9}"><span uk-icon="icon: file-text; ratio: 0.85"></span> WP-CLI</a>` : ""}
                    <a href="#" data-switcher="${site.SiteType === 1 ? (showPHP ? 11 : 10) : (showPHP ? 10 : 9)}"><span uk-icon="icon: history; ratio: 0.85"></span> Backups</a>
                    ${showCrons ? `<a href="#" data-switcher="${site.SiteType === 1 ? (showPHP ? 12 : 11) : (showPHP ? 11 : 10)}"><span uk-icon="icon: clock; ratio: 0.85"></span> Crons</a>` : ""}
                    <a href="#" data-switcher="${site.SiteType === 1 ? (showPHP ? 13 : 12) : (showPHP ? 12 : 11)}"><span uk-icon="icon: forward; ratio: 0.85"></span> Redirects</a>
                </div>
            </li>
            <li data-pill="1"><a href="#">Stats</a></li>
            <li data-pill="${showPHP ? 7 : 6}"><a href="#">Logs</a></li>
        </ul>

        <!-- switcher panels (driven by pills above) -->
        <ul class="uk-switcher" id="kp-site-switcher">
            <li>${renderOverviewTab(site, domains ?? [], sftp, site.ParentID ?? 0, allSites.find(s => s.ID === site.ParentID)?.Name ?? null)}</li>
            <li>${renderStatsTab(id, site.SiteType)}</li>
            <li>${renderConfigTab(id, 1, configs["1"])}</li>
            ${showPHP ? `<li>${renderConfigTab(id, 2, configs["2"])}</li>` : ""}
            <li>${renderConfigTab(id, 3, configs["3"])}</li>
            <li>${renderConfigTab(id, 4, configs["4"])}</li>
            <li>${renderVarnishTab(id, configs["5"])}</li>
            <li>${renderLogsTab(id, site.SiteType)}</li>
            <li>${renderSecurityPanel(id)}</li>
            <li id="waf-tab-panel"></li>
            ${site.SiteType === 1 ? `<li>${renderWPCLITab(id)}</li>` : ""}
            <li>${renderBackupsTab(id)}</li>
            ${showCrons ? `<li>${renderCronsTab(id)}</li>` : ""}
            <li>${renderRedirectsTab()}</li>
        </ul>`}`;

    document.getElementById("sd-back").addEventListener("click", () => router.go("sites"));
    document.getElementById("sd-edit").addEventListener("click", () => showEditSiteModal(site));

    // navigate to selected site when the dropdown changes
    document.getElementById("sd-site-nav")?.addEventListener("change", (e) => {
        router.go("site-detail", { id: e.target.value });
    });

    // security rules, WAF, and logs apply to all site types including reverse proxy
    wireSecurityPanel(root);
    loadSecurityPanel(root);
    wireLogsTab(root, id);
    wireWAFTab(root, id);
    loadWAFTab(id);

    // reverse proxy sites only need route management — skip all pod wiring
    if (isRP) {
        wireRoutesTab(root, id);
        loadRoutesTab(id); // populate existing routes on load
        initPillTabs(root); // wire pill nav for RP sites
        return;
    }

    document.getElementById("sd-recreate").addEventListener("click", async () => {
        showProgressModal("Recreating Pod", "Recreating containers for this site...");
        try {
            await api.post(`/sites/${id}/recreate`);
            hideProgressModal();
            toast.success("Pod recreated");
            router.go("site-detail", { id });
        } catch (e) {
            hideProgressModal();
            toast.error(e.message);
        }
    });

    document.getElementById("sd-clone")?.addEventListener("click", async () => {
        const name = await showCloneModal(site.Name);
        if (!name) return;
        showProgressModal("Cloning Site", "Copying files and database — this may take a few minutes...");
        try {
            await api.post(`/sites/${id}/clone`, { name });
            hideProgressModal();
            toast.success(`Site cloned as '${name}'`);
            router.go("sites");
        } catch (e) {
            hideProgressModal();
            toast.error(e.message);
        }
    });

    // wire toolbar action buttons (start, stop, restart, flush, update)
    root.querySelectorAll("[data-action]:not([data-action='wpcli-quick'])").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const action = btn.dataset.action;

            if (action === "flush") {
                try {
                    await api.post(`/sites/${id}/flush`);
                    toast.success("Caches flushed");
                } catch (e) { toast.error(e.message); }
                return;
            }

            const labels = { start: "Starting", stop: "Stopping", restart: "Restarting", update: "Updating" };
            showProgressModal(`${labels[action] ?? action} Pod`, `Please wait...`);
            try {
                await api.post(`/sites/${id}/${action}`);
                hideProgressModal();
                toast.success(`Site ${action} successful`);
                router.go("site-detail", { id });
            } catch (e) {
                hideProgressModal();
                toast.error(e.message);
            }
        });
    });

    wireConfigTabs(root, id);
    wireDomainActions(root, id);
    if (site.SiteType === 1) wireWPCLITab(root, id);
    wireOverviewTab(root, id, site);
    wireBackupsPanel(root, id);
    loadBackupsPanel(root, id);
    if (showCrons) { wireCronsPanel(root, id); loadCronsPanel(root, id); }
    wireRedirectsTab(root, id);
    loadRedirectsTab(id);
    wireStatsTab(root, id, site.SiteType);
    loadStatsTab(id, site.SiteType);
    wireHealthBadges(root, id);
    initPillTabs(root);
    // trigger ssl checks for all domains after the overview tab renders
    loadAllDomainSSL(domains ?? []);
}