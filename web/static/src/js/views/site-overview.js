// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { confirm, hideProgressModal, showProgressModal, showSyncModal, siteTypeLabel, statusBadge, versionLabel } from '../helpers.js';
import { router } from '../router.js';
import { toast } from '../toast.js';

// sslIcon returns the appropriate colored icon span for a given ssl status
function sslIcon(status) {
    switch (status) {
        case "valid":       return `<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>`;
        case "self-signed": return `<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>`;
        case "expired":     return `<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Expired certificate"></span>`;
        case "mismatch":    return `<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="Certificate does not match this domain"></span>`;
        default:            return `<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>`;
    }
}

// loadDomainSSL fetches and injects the ssl icon for a single domain row
async function loadDomainSSL(domain, id) {
    try {
        const res = await api.get(`/ssl-status?domain=${encodeURIComponent(domain)}`);
        const el  = document.getElementById(`ssl-icon-${id}`);
        if (el) el.outerHTML = sslIcon(res.status);
        // no cert at all — fall back to http
        if (res.status === "none") {
            const link = document.getElementById(`domain-link-${id}`);
            if (link) link.href = `http://${domain}`;
        }
    } catch (e) { /* silently ignore — icon stays pending */ }
}

// loadAllDomainSSL triggers ssl checks for all rendered domain rows
export function loadAllDomainSSL(domains) {
    domains.forEach((d) => loadDomainSSL(d.Domain, d.ID));
}

export function renderOverviewTab(site, domains, sftp, parentID = 0, parentName = null, pushTargets = []) {
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
                
                ${pushTargets.length ? `
                <div class="kp-card uk-padding-small uk-margin-small-top">
                    <h3 class="kp-view-title uk-margin-bottom">Site Sync</h3>
                    <p class="kp-muted uk-text-small uk-margin-remove-bottom">
                        Push files and/or database from this site onto its parent or one of its clones.
                    </p>
                    <div class="uk-flex uk-margin-small-top" style="gap:8px">
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="sync-push-btn">
                            <span uk-icon="cloud-upload"></span> Push Site
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
                            <tr>
                                <td class="kp-muted">Host</td>
                                <td>
                                    <div class="kp-sftp-hostip">
                                        <div class="kp-sftp-hostip-col">
                                            <span id="sftp-host-val" class="kp-mono">${location.hostname}</span>
                                            <button class="uk-button kp-btn-secondary kp-btn-sm" id="sftp-host-copy-btn" uk-tooltip="Copy the Host">
                                                <span uk-icon="icon: copy; ratio: 0.75"></span>
                                            </button>
                                        </div>
                                        <div class="kp-sftp-hostip-col">
                                            <span id="sftp-ip-val" class="kp-mono kp-muted">…</span>
                                            <button class="uk-button kp-btn-secondary kp-btn-sm" id="sftp-ip-copy-btn" uk-tooltip="Copy the IP" disabled>
                                                <span uk-icon="icon: copy; ratio: 0.75"></span>
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr><td class="kp-muted">Port</td><td class="kp-mono">2222</td></tr>
                            <tr>
                                <td class="kp-muted">User</td>
                                <td>
                                    <span id="sftp-user-val" class="kp-mono">${sftp?.Username ?? site.Name}</span>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left" id="sftp-user-copy-btn" uk-tooltip="Copy the Username">
                                        <span uk-icon="icon: copy; ratio: 0.75"></span>
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td class="kp-muted">Password</td>
                                <td>
                                    <span id="sftp-pass-display" class="kp-mono kp-sftp-pass" data-revealed="0">••••••••••••</span>
                                    <button class="uk-button kp-btn-secondary kp-btn-sm uk-margin-small-left" id="sftp-reveal-btn" uk-tooltip="Reveal the Password">
                                        <span uk-icon="icon: eye; ratio: 0.75"></span>
                                    </button>
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
            <a id="domain-link-${d.ID}" class="uk-text-small kp-mono" href="https://${d.Domain}" target="_blank" rel="noopener noreferrer" style="color:var(--kp-cyan)">${d.Domain}</a>
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

export function wireOverviewTab(root, siteId, site = null, pushTargets = []) {
    root.querySelector('#sftp-regen-btn')?.addEventListener('click', async () => {
        const btn  = root.querySelector('#sftp-regen-btn');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            const res = await api.post(`/sites/${siteId}/sftp-regen`);
            const disp = root.querySelector('#sftp-pass-display');
            if (disp && res?.password) {
                disp.textContent = res.password;
                disp.dataset.revealed = '1';
                const rb = root.querySelector('#sftp-reveal-btn');
                if (rb) rb.innerHTML = '<span uk-icon="icon: eye-slash; ratio: 0.75"></span>';
            }
            toast.success('SFTP password regenerated');
            router.go('site-detail', { id: String(siteId) });
        } catch (e) {
            toast.error(e.message);
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    // fetchSftpPassword pulls the plaintext on demand — it is no longer part of
    // the site-detail payload
    const fetchSftpPassword = async () => {
        const res = await api.get(`/sites/${siteId}/sftp-password`);
        return res?.password ?? '';
    };

    const writeClipboard = (value, label) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(value)
                .then(() => toast.success(`${label} copied to clipboard`))
                .catch(() => toast.error(`Failed to copy ${label.toLowerCase()}`));
        } else {
            const el = document.createElement('textarea');
            el.value = value;
            el.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            toast.success(`${label} copied to clipboard`);
        }
    };

    root.querySelector('#sftp-reveal-btn')?.addEventListener('click', async () => {
        const disp = root.querySelector('#sftp-pass-display');
        const btn  = root.querySelector('#sftp-reveal-btn');
        if (!disp) return;

        if (disp.dataset.revealed === '1') {
            disp.textContent = '••••••••••••';
            disp.dataset.revealed = '0';
            btn.innerHTML = '<span uk-icon="icon: eye; ratio: 0.75"></span>';
            return;
        }

        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            disp.textContent = await fetchSftpPassword();
            disp.dataset.revealed = '1';
            btn.innerHTML = '<span uk-icon="icon: eye-slash; ratio: 0.75"></span>';
        } catch (e) {
            toast.error(e.message);
            btn.innerHTML = orig;
        } finally {
            btn.disabled = false;
        }
    });

    root.querySelector('#sftp-copy-btn')?.addEventListener('click', async () => {
        const btn  = root.querySelector('#sftp-copy-btn');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            const pass = await fetchSftpPassword();
            if (pass) writeClipboard(pass, 'Password');
        } catch (e) {
            toast.error(e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    root.querySelector('#sftp-user-copy-btn')?.addEventListener('click', () => {
        const val = root.querySelector('#sftp-user-val')?.textContent.trim();
        if (val) writeClipboard(val, 'Username');
    });

    // host + ip copy buttons — ip is resolved async so it never blocks the render
    root.querySelector('#sftp-host-copy-btn')?.addEventListener('click', () => {
        const val = root.querySelector('#sftp-host-val')?.textContent.trim();
        if (val) writeClipboard(val, 'Host');
    });

    root.querySelector('#sftp-ip-copy-btn')?.addEventListener('click', () => {
        const btn = root.querySelector('#sftp-ip-copy-btn');
        const val = btn?.dataset.ip;
        if (val) writeClipboard(val, 'IP');
    });

    (async () => {
        const ipEl  = root.querySelector('#sftp-ip-val');
        const ipBtn = root.querySelector('#sftp-ip-copy-btn');
        if (!ipEl || !ipBtn) return;
        try {
            const res = await api.get(`/sites/${siteId}/security/asn/lookup?q=${encodeURIComponent(location.hostname)}`);
            if (!res?.ip) throw new Error('no ip');
            ipEl.textContent = res.ip;
            ipEl.classList.remove('kp-muted');
            ipBtn.dataset.ip = res.ip;
            ipBtn.disabled = false;
        } catch (_) {
            ipEl.textContent = 'unavailable';
        }
    })();

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

    // wire Site Sync push button — only present when the site has a parent or clones
    root.querySelector('#sync-push-btn')?.addEventListener('click', async () => {
        const opts = await showSyncModal(site, pushTargets, site.SiteType !== 3 && site.PMAPort > 0);
        if (!opts) return;
        const targetName = pushTargets.find(t => t.ID === opts.target_id)?.Name ?? 'target';
        try {
            await api.post(`/sites/${siteId}/push`, opts);
        } catch (e) {
            toast.error(e.message);
            return;
        }

        showProgressModal('Push Running', `Backing up ${targetName}, then pushing ${site.Name} onto it.`);

        // poll the job status every 4 seconds until it finishes, or 30 min timeout
        const deadline = Date.now() + 30 * 60 * 1000;
        const poll = setInterval(async () => {
            try {
                const res = await api.get(`/sites/${siteId}/push-status`);
                if (!res?.active || Date.now() > deadline) {
                    clearInterval(poll);
                    hideProgressModal();
                    if (res?.active) {
                        // push is still running in the background — check logs
                        toast.error('Push is taking longer than expected — check server logs for status');
                    } else if (res?.error) {
                        toast.error(`Push failed: ${res.error}`);
                    } else {
                        toast.success(`Push to ${targetName} complete`);
                    }
                }
            } catch (_) { /* keep polling on transient errors */ }
        }, 4000);
    });

}