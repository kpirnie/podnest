// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

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
    const [settings, backupSettings, wafSettings, trustedProxies, notificationSettings, resourceSettings] = await Promise.all([
        api.get("/settings"),
        api.get("/settings/backup"),
        api.get("/settings/waf"),
        api.get("/settings/trusted-proxies"),
        api.get("/settings/notifications"),
        api.get("/settings/resources"),
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
                    <div class="uk-flex uk-flex-right uk-margin-small-top" style="gap:8px">
                        <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/settings/export" download="podnest-settings.csv" uk-tooltip="Export all settings">
                            <span uk-icon="download"></span>
                        </a>
                        <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Import settings from CSV">
                            <span uk-icon="upload"></span>
                            <input type="file" id="settings-import" accept=".csv" style="display:none">
                        </label>
                    </div>
                </form>
            </div>
        </div>
        <div class="uk-width-1-2@m">
            <!-- smtp / email notifications -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">Email Notifications (SMTP)</h3>
                <form id="smtp-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="smtp-host">SMTP Host</label>
                        <input class="uk-input kp-input kp-mono" id="smtp-host" name="smtp_host" type="text"
                            placeholder="smtp.example.com" value="${notificationSettings.smtp_host ?? ''}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="smtp-port">Port</label>
                        <input class="uk-input kp-input kp-mono" id="smtp-port" name="smtp_port" type="text"
                            placeholder="587" value="${notificationSettings.smtp_port ?? ''}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="smtp-username">Username</label>
                        <input class="uk-input kp-input kp-mono" id="smtp-username" name="smtp_username" type="text"
                            placeholder="user@example.com" value="${notificationSettings.smtp_username ?? ''}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="smtp-password">Password</label>
                        <input class="uk-input kp-input kp-mono" id="smtp-password" name="smtp_password" type="password"
                            placeholder="${notificationSettings.smtp_password ? 'saved — enter new value to change' : 'enter password'}"
                            value="">
                        <p class="kp-muted uk-text-small uk-margin-small-top">Leave blank to keep the existing password.</p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="smtp-from">From Address</label>
                        <input class="uk-input kp-input kp-mono" id="smtp-from" name="smtp_from" type="email"
                            placeholder="podnest@example.com" value="${notificationSettings.smtp_from ?? ''}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label">
                            <input class="uk-checkbox" type="checkbox" id="smtp-tls" name="smtp_tls"
                                ${notificationSettings.smtp_tls === 'true' || notificationSettings.smtp_tls === '1' ? 'checked' : ''}>
                            &nbsp;Use implicit TLS (port 465)
                        </label>
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Unchecked uses STARTTLS (port 587). Check only for port 465 / SSL-only servers.
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
            <!-- aws sns / sms notifications -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">SMS Notifications (AWS SNS)</h3>
                <form id="sns-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="aws-access-key">Access Key ID</label>
                        <input class="uk-input kp-input kp-mono" id="aws-access-key" name="aws_access_key" type="text"
                            placeholder="AKIAIOSFODNN7EXAMPLE" value="${notificationSettings.aws_access_key ?? ''}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="aws-secret-key">Secret Access Key</label>
                        <input class="uk-input kp-input kp-mono" id="aws-secret-key" name="aws_secret_key" type="password"
                            placeholder="${notificationSettings.aws_secret_key ? 'saved — enter new value to change' : 'enter secret key'}"
                            value="">
                        <p class="kp-muted uk-text-small uk-margin-small-top">Leave blank to keep the existing key.</p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="aws-region">AWS Region</label>
                        <input class="uk-input kp-input kp-mono" id="aws-region" name="aws_region" type="text"
                            placeholder="us-east-1" value="${notificationSettings.aws_region ?? ''}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="aws-sns-sender-id">Sender ID <span class="kp-muted">(optional)</span></label>
                        <input class="uk-input kp-input kp-mono" id="aws-sns-sender-id" name="aws_sns_sender_id" type="text"
                            placeholder="PodNest" value="${notificationSettings.aws_sns_sender_id ?? ''}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Alphanumeric sender name shown on the recipient's phone. Supported in select AWS regions only.
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
            <!-- host resource reservation watcher -->
            <div class="kp-card uk-padding kp-settings-wrap uk-margin-top">
                <h3 class="kp-view-title uk-margin-bottom">Host Resource Watcher</h3>
                <form id="resource-form" class="uk-form-stacked">
                    <div class="uk-margin">
                        <label class="kp-label" for="resource-ram-reserve">RAM Reserve (GB)</label>
                        <input class="uk-input kp-input" id="resource-ram-reserve" name="resource_ram_reserve_gb" type="number"
                            min="0.5" max="64" step="0.5" placeholder="2"
                            value="${resourceSettings.resource_ram_reserve_gb ?? '2'}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Amount of RAM to keep free for the host OS. Throttling fires when aggregate pod usage exceeds total RAM minus this value.
                        </p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="resource-poll-interval">Poll Interval (seconds)</label>
                        <input class="uk-input kp-input" id="resource-poll-interval" name="resource_poll_interval" type="number"
                            min="5" max="300" step="5" placeholder="30"
                            value="${resourceSettings.resource_poll_interval ?? '30'}">
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="resource-throttle-pct">Throttle Aggressiveness (%)</label>
                        <input class="uk-input kp-input" id="resource-throttle-pct" name="resource_throttle_pct" type="number"
                            min="10" max="90" step="5" placeholder="50"
                            value="${resourceSettings.resource_throttle_pct ?? '50'}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            Percentage to reduce the offending pod's current memory usage by when throttling.
                        </p>
                    </div>
                    <div class="uk-margin">
                        <label class="kp-label" for="resource-webhook-url">Webhook URL <span class="kp-muted">(optional)</span></label>
                        <input class="uk-input kp-input kp-mono" id="resource-webhook-url" name="resource_webhook_url" type="url"
                            placeholder="https://hooks.example.com/notify"
                            value="${resourceSettings.resource_webhook_url ?? ''}">
                        <p class="kp-muted uk-text-small uk-margin-small-top">
                            HTTP POST with JSON payload on threshold breach and resolution. Compatible with Uptime Kuma, PagerDuty, Slack, etc.
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
        <div class="uk-width-1-1">
            <!-- leaving this here for future settings sections -->
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

    // -- settings CSV import -------------------------------------------------
    document.getElementById("settings-import").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res  = await fetch("/api/settings/import", { method: "POST", headers: { "X-CSRF-Token": window.KP?.csrf ?? "" }, body: fd });
            const data = res.status === 204 ? null : await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
            toast.success("Settings imported");
        } catch (err) {
            toast.error(err.message);
        } finally {
            e.target.value = "";
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

    // -- smtp notification settings form -------------------------------------
    document.getElementById("smtp-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn  = e.target.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Saving...';

        const fd   = new FormData(e.target);
        const body = {
            smtp_host:     fd.get("smtp_host").trim(),
            smtp_port:     fd.get("smtp_port").trim(),
            smtp_username: fd.get("smtp_username").trim(),
            smtp_from:     fd.get("smtp_from").trim(),
            smtp_tls:      fd.get("smtp_tls") ? "true" : "false",
        };

        // only include password if a new value was entered
        const pass = fd.get("smtp_password").trim();
        if (pass) body.smtp_password = pass;

        try {
            await api.put("/settings/notifications", body);
            toast.success("Email notification settings saved");
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    // -- aws sns notification settings form ----------------------------------
    document.getElementById("sns-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn  = e.target.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Saving...';

        const fd   = new FormData(e.target);
        const body = {
            aws_access_key:    fd.get("aws_access_key").trim(),
            aws_region:        fd.get("aws_region").trim(),
            aws_sns_sender_id: fd.get("aws_sns_sender_id").trim(),
        };

        // only include secret key if a new value was entered
        const secret = fd.get("aws_secret_key").trim();
        if (secret) body.aws_secret_key = secret;

        try {
            await api.put("/settings/notifications", body);
            toast.success("SMS notification settings saved");
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    // -- host resource watcher settings form ---------------------------------
    document.getElementById("resource-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn  = e.target.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Saving...';

        const fd   = new FormData(e.target);
        const body = {
            resource_ram_reserve_gb: fd.get("resource_ram_reserve_gb").trim(),
            resource_poll_interval:  fd.get("resource_poll_interval").trim(),
            resource_throttle_pct:   fd.get("resource_throttle_pct").trim(),
            resource_webhook_url:    fd.get("resource_webhook_url").trim(),
        };

        try {
            await api.put("/settings/resources", body);
            toast.success("Resource watcher settings saved");
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

}
