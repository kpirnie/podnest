"use strict";

import { api } from '../api.js';
import { errorState, isAdmin } from '../helpers.js';
import { toast } from '../toast.js';

// sslIcon returns the appropriate colored icon span for a given ssl status
function sslIcon(status) {
    switch (status) {
        case "valid":       return `<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>`;
        case "self-signed": return `<span class="kp-ssl-self-signed" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Self-signed certificate"></span>`;
        default:            return `<span class="kp-ssl-none" uk-icon="icon: warning; ratio: 0.85" uk-tooltip="No SSL certificate"></span>`;
    }
}

// loadAdminDomainSSL fetches and injects the ssl icon for the admin domain field
async function loadAdminDomainSSL(domain) {
    const el = document.getElementById("admin-domain-ssl");
    if (!el || !domain) return;
    try {
        const res = await api.get(`/ssl-status?domain=${encodeURIComponent(domain)}`);
        el.outerHTML = sslIcon(res.status);
    } catch (e) { /* silently ignore — icon stays pending */ }
}

export async function viewSettings(root) {
    if (!isAdmin()) { root.innerHTML = errorState("Access denied"); return; }
    // fetch the current settings from the API
    const settings = await api.get("/settings");

    root.innerHTML = `
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Settings</h1>
        </div>
        <div class="kp-card uk-padding kp-settings-wrap">
            <h3 class="kp-view-title uk-margin-bottom">Panel Configuration</h3>
            <form id="settings-form" class="uk-form-stacked">
                <div class="uk-margin">
                    <label class="kp-label" for="admin-domain">Management UI Domain</label>
                    <div class="uk-flex kp-settings-domain-wrap">
                        <span id="admin-domain-ssl" class="kp-ssl-pending" uk-icon="icon: more; ratio: 0.85"></span>
                        <input
                            class="uk-input kp-input"
                            id="admin-domain"
                            name="admin_domain"
                            type="text"
                            placeholder="panel.example.com"
                            value="${settings.admin_domain ?? ''}">
                    </div>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        When set, the proxy will route this domain to the management UI and issue
                        a Let's Encrypt certificate automatically. Leave blank to disable.
                    </p>
                </div>
                <div class="uk-flex uk-flex-right uk-margin-top">
                    <button type="submit" class="uk-button kp-btn-primary">
                        <span uk-icon="check"></span> Save Settings
                    </button>
                </div>
            </form>
        </div>
        `;

    // load the ssl status for the current admin domain if one is set
    if (settings.admin_domain) {
        loadAdminDomainSSL(settings.admin_domain);
    }

    // handle form submission
    document.getElementById("settings-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn  = e.target.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Saving...';

        const fd   = new FormData(e.target);
        const body = {
            admin_domain: fd.get("admin_domain").trim(),
        };

        try {
            await api.put("/settings", body);
            toast.success("Settings saved");

            // refresh the ssl icon for the newly saved domain
            loadAdminDomainSSL(body.admin_domain);
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });
}
