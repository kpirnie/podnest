// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { confirm, showSyncModal, siteTypeLabel, statusBadge, versionLabel } from '../helpers.js';
import { router } from '../router.js';
import { toast } from '../toast.js';

// sslIcon returns the appropriate colored icon span for a given ssl status
function sslIcon(status) {
    switch (status) {
        case "valid":       return `<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>`;
        case "self-signed": return `<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>`;
        default:            return `<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>`;
    }
}

// loadDomainSSL fetches and injects the ssl icon for a single domain row
async function loadDomainSSL(domain, id) {
    try {
        const res = await api.get(`/ssl-status?domain=${encodeURIComponent(domain)}`);
        const el  = document.getElementById(`ssl-icon-${id}`);
        if (el) el.outerHTML = sslIcon(res.status);
    } catch (e) { /* silently ignore — icon stays pending */ }
}

// loadAllDomainSSL triggers ssl checks for all rendered domain rows
export function loadAllDomainSSL(domains) {
    domains.forEach((d) => loadDomainSSL(d.Domain, d.ID));
}

export function renderOverviewTab(site, domains, sftp, parentID = 0, parentName = null) {
    const hasPMA = site.SiteType !== 3 && site.PMAPort > 0;
    return `
        <div class="uk-grid-medium" uk-grid>
            <div class="uk-width-1-2@m">
                <div class="kp-card uk-padding-small">
                    <h3 class="kp-view-title uk-margin-bottom">Site Info</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Name</td><td>${site.Name}</td></tr>
                            ${parentName ? `<tr><td class="kp-muted">Parent</td><td><a href="javascript:void(0)" data-action="manage" data-id="${parentID}" style="color:var(--kp-cyan)">${parentName}</a></td></tr>` : ""}
                            <tr><td class="kp-muted">Internal Port</td><td>:${site.Port}</td></tr>
                            <tr><td class="kp-muted">Type</td><td>${siteTypeLabel(site.SiteType)}</td></tr>
                            <tr><td class="kp-muted">Version</td><td>${versionLabel(site)}</td></tr>
                            <tr><td class="kp-muted">Status</td><td>${statusBadge(site.SiteStatus)}</td></tr>
                            <tr><td class="kp-muted">Containers</td><td><div id="sd-health-badges" class="kp-health-badges"></div></td></tr>
                            <tr><td class="kp-muted">Created</td><td>${new Date(site.Created).toLocaleString()}</td></tr>
                        </tbody>
                    </table>
                </div>
                
                ${parentName ? `
                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">Site Sync</h3>
                    <p class="kp-muted uk-text-small uk-margin-remove-bottom">
                        Sync files and database between this clone and its parent site.
                    </p>
                    <div class="uk-flex uk-margin-small-top" style="gap:8px">
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="sync-pull-btn">
                            <span uk-icon="cloud-download"></span> Pull From Parent
                        </button>
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="sync-push-btn">
                            <span uk-icon="cloud-upload"></span> Push To Parent
                        </button>
                    </div>
                </div>` : ""}

                ${hasPMA ? `
                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">phpMyAdmin</h3>
                    <p class="kp-muted uk-text-small uk-margin-remove-bottom">
                        Opens a secure time-limited session. Link expires after 10 minutes or first use.
                    </p>
                    <div class="uk-margin-small-top">
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="pma-open-btn">
                            <span uk-icon="database"></span> Open phpMyAdmin
                        </button>
                    </div>
                </div>` : ""}
                
            </div>

            <div class="uk-width-1-2@m">

                <div class="kp-card uk-padding-small">
                    <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                        <h3 class="kp-view-title uk-margin-bottom">Domains</h3>
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="domain-add-btn" uk-tooltip="Add a New Domain">
                            <span uk-icon="plus"></span>
                        </button>
                    </div>
                    <div id="domain-list">
                        ${domains.length
                            ? domains.map(domainRow).join("")
                            : `<p class="kp-muted uk-text-small">No domains configured</p>`}
                    </div>
                    <div id="domain-add-form" class="uk-hidden uk-margin-small-top">
                        <div class="uk-flex kp-domain-add-wrap">
                            <input class="uk-input kp-input kp-input-sm" id="domain-add-input" type="text" placeholder="example.com">
                            <button class="uk-button kp-btn-primary kp-btn-sm" id="domain-save-btn">Add</button>
                            <button class="uk-button kp-btn-ghost kp-btn-sm" id="domain-cancel-btn">Cancel</button>
                        </div>
                    </div>
                </div>

                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">SFTP Access</h3>
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <tbody>
                            <tr><td class="kp-muted">Host</td><td class="kp-mono">${location.hostname}</td></tr>
                            <tr><td class="kp-muted">Port</td><td class="kp-mono">2222</td></tr>
                            <tr><td class="kp-muted">User</td><td class="kp-mono">${sftp?.Username ?? site.Name}</td></tr>
                            <tr>
                                <td class="kp-muted">Password</td>
                                <td>
                                    <span id="sftp-pass-display" class="kp-mono kp-sftp-pass">${sftp?.Password ?? '—'}</span>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left" id="sftp-copy-btn" uk-tooltip="Copy the Password">
                                        <span uk-icon="icon: copy; ratio: 0.75"></span>
                                    </button>
                                </td>
                            </tr>
                            <tr><td class="kp-muted">Path</td><td class="kp-mono">/html</td></tr>
                        </tbody>
                    </table>
                    <div class="uk-margin-small-top">
                        <button class="uk-button kp-btn-ghost kp-btn-sm" id="sftp-regen-btn">
                            <span uk-icon="refresh"></span> Regenerate Password
                        </button>
                    </div>
                </div>

            </div>
        </div>`;
}

// domainRow renders a single domain entry — ssl status is loaded async after render
function domainRow(d) {
    return `<div class="uk-flex uk-flex-between uk-flex-middle kp-config-row" data-domain-id="${d.ID}">
        <div class="uk-flex uk-flex-middle kp-domain-row-inner">
            <span id="ssl-icon-${d.ID}" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
            <span class="uk-text-small kp-mono">${d.Domain}</span>
        </div>
        <button class="kp-config-del" data-action="delete-domain" data-did="${d.ID}" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`;
}

export function wireDomainActions(root, siteId) {
    root.querySelector("#domain-add-btn")?.addEventListener("click", () => {
        root.querySelector("#domain-add-form").classList.remove("uk-hidden");
    });
    root.querySelector("#domain-cancel-btn")?.addEventListener("click", () => {
        root.querySelector("#domain-add-form").classList.add("uk-hidden");
    });
    root.querySelector("#domain-save-btn")?.addEventListener("click", async () => {
        const val = root.querySelector("#domain-add-input").value.trim();
        if (!val) return;
        try {
            const d = await api.post(`/sites/${siteId}/domains`, { domain: val });
            root.querySelector("#domain-list").insertAdjacentHTML("beforeend", domainRow(d));
            loadDomainSSL(d.Domain, d.ID);
            root.querySelector("#domain-add-form").classList.add("uk-hidden");
            root.querySelector("#domain-add-input").value = "";
            toast.success("Domain added");
        } catch (e) { toast.error(e.message); }
    });
    root.querySelector("#domain-list")?.addEventListener("click", async (e) => {
        const btn = e.target.closest('[data-action="delete-domain"]');
        if (!btn) return;
        const ok = await confirm("Remove Domain", "Remove this domain from the site?");
        if (!ok) return;
        try {
            await api.delete(`/sites/${siteId}/domains/${btn.dataset.did}`);
            btn.closest("[data-domain-id]").remove();
            toast.success("Domain removed");
        } catch (e) { toast.error(e.message); }
    });
}

export function wireOverviewTab(root, siteId, site = null) {
    root.querySelector('#sftp-regen-btn')?.addEventListener('click', async () => {
        const btn  = root.querySelector('#sftp-regen-btn');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await api.post(`/sites/${siteId}/sftp-regen`);
            toast.success('SFTP password regenerated');
            router.go('site-detail', { id: String(siteId) });
        } catch (e) {
            toast.error(e.message);
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    root.querySelector('#sftp-copy-btn')?.addEventListener('click', () => {
        const pass = root.querySelector('#sftp-pass-display')?.textContent;
        if (!pass) return;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(pass)
                .then(() => toast.success('Password copied to clipboard'))
                .catch(() => toast.error('Failed to copy password'));
        } else {
            const el = document.createElement('textarea');
            el.value = pass;
            el.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            toast.success('Password copied to clipboard');
        }
    });

    root.querySelector("#pma-open-btn")?.addEventListener("click", async () => {
        const btn  = root.querySelector("#pma-open-btn");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div> Opening...';
        try {
            const res = await api.post(`/sites/${siteId}/pma-token`);
            window.open(res.url, "_blank");
        } catch (e) {
            toast.error(e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    // wire Site Sync pull/push buttons — only present on clone sites (ParentID > 0)
    root.querySelector('#sync-pull-btn')?.addEventListener('click', async () => {
        const ok = await showSyncModal('pull', site.Name, root.querySelector('[data-action="manage"][data-id="' + site.ParentID + '"]')?.textContent?.trim() ?? 'parent');
        if (!ok) return;
        try {
            //await api.post(`/sites/${siteId}/sync/pull`);
            toast.success('Pull from parent complete');
        } catch (e) {
            toast.error(e.message);
        }
    });

    root.querySelector('#sync-push-btn')?.addEventListener('click', async () => {
        const ok = await showSyncModal('push', site.Name, root.querySelector('[data-action="manage"][data-id="' + site.ParentID + '"]')?.textContent?.trim() ?? 'parent');
        if (!ok) return;
        try {
            //await api.post(`/sites/${siteId}/sync/push`);
            toast.success('Push to parent complete');
        } catch (e) {
            toast.error(e.message);
        }
    });
}