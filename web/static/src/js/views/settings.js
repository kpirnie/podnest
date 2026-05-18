"use strict";

import { api } from '../api.js';
import { errorState, isAdmin } from '../helpers.js';
import { toast } from '../toast.js';

// sslIcon returns the appropriate colored icon span for a given ssl status
function sslIcon(status) {
    switch (status) {
        case "valid":       
        case "self-signed": return `<span class="kp-ssl-valid" uk-icon="icon: lock; ratio: 0.85" uk-tooltip="Valid SSL certificate"></span>`;
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

    // fetch panel settings and backup/S3 settings in parallel
    const [settings, backupSettings, wafSettings] = await Promise.all([
        api.get("/settings"),
        api.get("/settings/backup"),
        api.get("/settings/waf"),
    ]);

    root.innerHTML = `
    <div class="kp-view-header">
        <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Settings</h1>
    </div>
    <div class="uk-grid uk-grid-medium uk-margin-large-bottom" uk-grid>
        <div class="uk-width-1-1">
            <!-- panel configuration -->
            <div class="kp-card uk-padding">
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
        </div>
        <div class="uk-width-1-2@m">
            <!-- backup schedule / retention -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">Backup Schedule</h3>
                <form id="backup-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="backup-schedule">Cron Schedule</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="backup-schedule"
                            name="backup_schedule"
                            type="text"
                            placeholder="0 2 * * *"
                            value="${backupSettings.backup_schedule ?? ''}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Standard 5-field cron expression. Leave blank to disable automatic backups.<br>
                            Examples: <span class="kp-mono">0 2 * * *</span> (daily at 2am) &nbsp;
                            <span class="kp-mono">0 */6 * * *</span> (every 6 hours)
                        </p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="backup-retain-days">Retain Backups (days)</label>
                        <input
                            class="uk-input kp-input"
                            id="backup-retain-days"
                            name="backup_retain_days"
                            type="number"
                            min="1"
                            max="365"
                            placeholder="30"
                            value="${backupSettings.backup_retain_days ?? '30'}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Snapshots older than this many days will be pruned automatically after each backup run.
                        </p>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
        <div class="uk-width-1-2@m">
            <!-- S3 backup storage -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">S3 Backup Storage</h3>
                <form id="s3-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-endpoint">Endpoint URL</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-endpoint"
                            name="s3_endpoint"
                            type="url"
                            placeholder="https://s3.amazonaws.com"
                            value="${backupSettings.s3_endpoint ?? ''}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            AWS S3 or any S3-compatible endpoint (Backblaze B2, MinIO, Wasabi, etc.)
                        </p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-bucket">Bucket</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-bucket"
                            name="s3_bucket"
                            type="text"
                            placeholder="my-podnest-backups"
                            value="${backupSettings.s3_bucket ?? ''}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-region">Region</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-region"
                            name="s3_region"
                            type="text"
                            placeholder="us-east-1"
                            value="${backupSettings.s3_region ?? ''}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-access-key">Access Key ID</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-access-key"
                            name="s3_access_key"
                            type="text"
                            placeholder="AKIAIOSFODNN7EXAMPLE"
                            value="${backupSettings.s3_access_key ?? ''}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="s3-secret-key">Secret Access Key</label>
                        <input
                            class="uk-input kp-input kp-mono"
                            id="s3-secret-key"
                            name="s3_secret_key"
                            type="password"
                            placeholder="${backupSettings.s3_secret_key ? 'saved — enter new value to change' : 'enter secret key'}"
                            value="">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Leave blank to keep the existing key.
                        </p>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="check"></span> Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    // load the ssl status for the current admin domain if one is set
    if (settings.admin_domain) {
        loadAdminDomainSSL(settings.admin_domain);
    }

    // -- panel configuration form --------------------------------------------
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
            loadAdminDomainSSL(body.admin_domain);
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    // -- backup schedule / retention form ------------------------------------
    document.getElementById("backup-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn  = e.target.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Saving...';

        const fd   = new FormData(e.target);
        const body = {
            backup_schedule:    fd.get("backup_schedule").trim(),
            backup_retain_days: fd.get("backup_retain_days").trim(),
        };

        try {
            await api.put("/settings/backup", body);
            toast.success("Backup settings saved");
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    // -- S3 settings form ----------------------------------------------------
    document.getElementById("s3-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn  = e.target.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Saving...';

        const fd = new FormData(e.target);

        // always send these fields
        const body = {
            s3_endpoint:   fd.get("s3_endpoint").trim(),
            s3_bucket:     fd.get("s3_bucket").trim(),
            s3_region:     fd.get("s3_region").trim(),
            s3_access_key: fd.get("s3_access_key").trim(),
        };

        // only include the secret key if the user actually typed a new value
        const secret = fd.get("s3_secret_key").trim();
        if (secret) body.s3_secret_key = secret;

        try {
            await api.put("/settings/backup", body);
            toast.success("S3 settings saved");
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

}
