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
                <div class="uk-flex uk-flex-right uk-margin-top">
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

    try {
        const data = await api.get(`/sites/${id}/waf`);
        const sel  = document.getElementById("waf-override");
        const exc  = document.getElementById("waf-site-exclusions");
        if (sel) sel.value        = String(data.Override  ?? 0);
        if (exc) exc.value        = data.Exclusions ?? '';
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
            toast.success("WAF override saved — engine recompiling in background");
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
                ${statusBadge(site.SiteStatus)}
            </div>
            <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="start" data-id="${id}" uk-tooltip="Start the Site"><span uk-icon="play"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="stop" data-id="${id}" uk-tooltip="Stop the Site"><span uk-icon="ban"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="restart" data-id="${id}" uk-tooltip="Restart the Site"><span uk-icon="refresh"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="flush" data-id="${id}" uk-tooltip="Flush the Caches"><span uk-icon="bolt"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="update" data-id="${id}" uk-tooltip="Update the Pod Images"><span uk-icon="cloud-upload"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-recreate" uk-tooltip="Recreate the Pod"><span uk-icon="history"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="sd-edit" uk-tooltip="Edit the Site"><span uk-icon="pencil"></span></button>
            </div>
        </div>

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
        </ul>`;

    document.getElementById("sd-back").addEventListener("click", () => router.go("sites"));
    document.getElementById("sd-edit").addEventListener("click", () => showEditSiteModal(site));
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

    // navigate to selected site when the dropdown changes
    document.getElementById("sd-site-nav")?.addEventListener("change", (e) => {
        router.go("site-detail", { id: e.target.value });
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
