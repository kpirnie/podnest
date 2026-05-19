"use strict";

import { api } from '../api.js';
import { hideProgressModal, showProgressModal, statusBadge } from '../helpers.js';
import { showEditSiteModal } from '../modals/edit-site.js';
import { router } from '../router.js';
import { toast } from '../toast.js';
import { loadBackupsPanel, renderBackupsTab, wireBackupsPanel } from './site-backups.js';
import { renderConfigTab, renderVarnishTab, wireConfigTabs } from './site-configs.js';
import { renderLogsTab, wireLogsTab } from './site-logs.js';
import { loadAllDomainSSL, renderOverviewTab, wireDomainActions, wireOverviewTab } from './site-overview.js';
import { loadSecurityPanel, renderSecurityPanel, wireSecurityPanel } from './site-security.js';
import { renderWPCLITab, wireWPCLITab } from './site-wpcli.js';

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
    });

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
function renderRouteRow(domain = "", upstream = "") {
    return `
        <div class="rp-route-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <input class="uk-input kp-input" style="flex:1" placeholder="example.com" value="${domain}" data-field="domain">
            <input class="uk-input kp-input" style="flex:2" placeholder="https://10.0.0.1:8080" value="${upstream}" data-field="upstream">
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
            ? routes.map(r => renderRouteRow(r.Domain, r.Upstream)).join("")
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
    });
}

export async function viewSiteDetail(root, { id }) {
    // fetch site detail and full site list in parallel for the nav selector
    const [{ site, domains, sftp }, allSites, configs] = await Promise.all([
        api.get(`/sites/${id}`),
        api.get("/sites"),
        api.get(`/sites/${id}/configs`),
    ]);
    const showPHP = site.SiteType === 1 || site.SiteType === 2;
    const isRP    = site.SiteType === 6;

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
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${id}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${id}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${id}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${id}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="update" data-id="${id}" uk-tooltip="Update the Pod Images"><span uk-icon="cloud-upload"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-recreate" uk-tooltip="Recreate the Pod"><span uk-icon="history"></span></button>
                ` : ""}
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-edit" uk-tooltip="Edit the Site"><span uk-icon="pencil"></span></button>
            </div>
        </div>

        ${isRP ? `
        <ul uk-tab class="uk-margin-medium-bottom">
            <li><a href="#">Routes</a></li>
        </ul>
        <ul class="uk-switcher">
            <li>${renderRoutesTab()}</li>
        </ul>
        ` : `
        <ul uk-tab class="uk-margin-medium-bottom">
            <li><a href="#">Overview</a></li>
            <li><a href="#">Nginx</a></li>
            ${showPHP ? `<li><a href="#">PHP</a></li>` : ""}
            <li><a href="#">MariaDB</a></li>
            <li><a href="#">Redis</a></li>
            <li><a href="#">Varnish</a></li>
            <li><a href="#">Logs</a></li>
            <li><a href="#">Security</a></li>
            <li><a href="#">WAF</a></li>
            ${site.SiteType === 1 ? `<li><a href="#">WP-CLI</a></li>` : ""}
            <li><a href="#">Backups</a></li>
        </ul>

        <ul class="uk-switcher">
            <li>${renderOverviewTab(site, domains ?? [], sftp)}</li>
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
        </ul>`}`;

    document.getElementById("sd-back").addEventListener("click", () => router.go("sites"));
    document.getElementById("sd-edit").addEventListener("click", () => showEditSiteModal(site));

    // navigate to selected site when the dropdown changes
    document.getElementById("sd-site-nav")?.addEventListener("change", (e) => {
        router.go("site-detail", { id: e.target.value });
    });

    // reverse proxy sites only need route management — skip all pod wiring
    if (isRP) {
        wireRoutesTab(root, id);
        loadRoutesTab(id);
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

    // wire toolbar action buttons (start, stop, restart, flush, update)
    root.querySelectorAll("[data-action]").forEach((btn) => {
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
    wireLogsTab(root, id);
    wireSecurityPanel(root);
    if (site.SiteType === 1) wireWPCLITab(root, id);
    loadSecurityPanel(root);
    wireWAFTab(root, id);
    loadWAFTab(id);
    wireOverviewTab(root, id);
    wireBackupsPanel(root, id);
    loadBackupsPanel(root, id);

    // trigger ssl checks for all domains after the overview tab renders
    loadAllDomainSSL(domains ?? []);
}