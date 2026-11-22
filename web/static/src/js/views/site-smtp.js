// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { exportMigration, importMigration } from '../migration.js';
import { api } from '../api.js';
import { confirm } from '../helpers.js';
import { toast } from '../toast.js';

// renderSMTPTab returns the per-site settings, credential, and test forms.
export function renderSMTPTab(isApp) {
    return `
        <div class="kp-card uk-padding uk-margin-top" id="smtp-panel">
            <h3 class="kp-view-title uk-margin-bottom">Outbound SMTP</h3>
            ${isApp ? '<p class="kp-muted uk-text-small">Your app can read <code>/etc/podnest/smtp/settings.json</code> when SMTP is enabled.</p>' : ""}
            <p class="kp-muted uk-text-small" id="site-smtp-status" role="status"></p>
            <button class="uk-button kp-btn-ghost kp-btn-sm" type="button" id="site-smtp-retry" hidden>Retry</button>

            <fieldset class="uk-fieldset" id="site-smtp-actions" disabled>
                <div class="uk-flex uk-grid-small uk-margin-small-bottom" uk-grid>
                    <div><button class="uk-button kp-btn-ghost kp-btn-sm" type="button" id="site-smtp-export">Export encrypted SMTP</button></div>
                    <div><label class="uk-button kp-btn-ghost kp-btn-sm">Import encrypted SMTP
                        <input type="file" id="site-smtp-import" accept=".pnm" hidden>
                    </label></div>
                </div>
                <form class="uk-form-stacked" id="site-smtp-settings">
                    <label class="kp-label">
                        <input class="uk-checkbox" type="checkbox" name="enabled">
                        Enable outbound SMTP
                    </label>

                    <div class="uk-grid-small uk-margin-small-top" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label" for="site-smtp-host">SMTP Host</label>
                            <input class="uk-input kp-input" id="site-smtp-host" name="host" type="text" autocomplete="off">
                        </div>
                        <div class="uk-width-1-4@s">
                            <label class="kp-label" for="site-smtp-port">Port</label>
                            <input class="uk-input kp-input" id="site-smtp-port" name="port" type="number" min="1" max="65535" step="1" required>
                        </div>
                        <div class="uk-width-1-4@s">
                            <label class="kp-label" for="site-smtp-encryption">Encryption</label>
                            <select class="uk-select kp-select" id="site-smtp-encryption" name="encryption">
                                <option value="starttls">STARTTLS</option>
                                <option value="tls">TLS</option>
                            </select>
                        </div>
                        <div class="uk-width-1-3@s">
                            <label class="kp-label" for="site-smtp-username">Username</label>
                            <input class="uk-input kp-input" id="site-smtp-username" name="username" type="text" autocomplete="off">
                        </div>
                        <div class="uk-width-1-3@s">
                            <label class="kp-label" for="site-smtp-from-email">From Email</label>
                            <input class="uk-input kp-input" id="site-smtp-from-email" name="from_email" type="email">
                        </div>
                        <div class="uk-width-1-3@s">
                            <label class="kp-label" for="site-smtp-from-name">From Name</label>
                            <input class="uk-input kp-input" id="site-smtp-from-name" name="from_name" type="text">
                        </div>
                    </div>

                    <button class="uk-button kp-btn-primary kp-btn-sm uk-margin-small-top" type="submit">Save Settings</button>
                </form>

                <hr class="kp-divider">

                <form class="uk-form-stacked" id="site-smtp-credentials">
                    <label class="kp-label" for="site-smtp-password">SMTP Password</label>
                    <p class="kp-muted uk-text-small uk-margin-small" id="site-smtp-password-state" role="status"></p>
                    <input class="uk-input kp-input" id="site-smtp-password" type="password" autocomplete="new-password" maxlength="4096" required>
                    <div class="uk-flex uk-flex-wrap uk-margin-small-top uk-grid-small" uk-grid>
                        <div><button class="uk-button kp-btn-primary kp-btn-sm" type="submit">Save Password</button></div>
                        <div><button class="uk-button kp-btn-ghost kp-btn-sm" id="site-smtp-remove" type="button">Remove Password</button></div>
                    </div>
                </form>

                <hr class="kp-divider">

                <form class="uk-form-stacked" id="site-smtp-test">
                    <label class="kp-label" for="site-smtp-recipient">Test Recipient</label>
                    <input class="uk-input kp-input" id="site-smtp-recipient" type="email" maxlength="254" required>
                    <button class="uk-button kp-btn-ghost kp-btn-sm uk-margin-small-top" type="submit">Send Test Email</button>
                </form>
            </fieldset>
        </div>`;
}

// wireSMTPTab loads settings on first open and keeps credential writes separate.
export function wireSMTPTab(panel, link, id) {
    const endpoint = `/sites/${id}/smtp`;
    const actions = panel.querySelector("#site-smtp-actions");
    const status = panel.querySelector("#site-smtp-status");
    const retry = panel.querySelector("#site-smtp-retry");
    const settings = panel.querySelector("#site-smtp-settings");
    const credentials = panel.querySelector("#site-smtp-credentials");
    const password = panel.querySelector("#site-smtp-password");
    const passwordState = panel.querySelector("#site-smtp-password-state");
    const remove = panel.querySelector("#site-smtp-remove");
    const test = panel.querySelector("#site-smtp-test");
    const recipient = panel.querySelector("#site-smtp-recipient");
    const send = test.querySelector('button[type="submit"]');

    let loaded = false;
    let busy = false;
    let savedEnabled = false;
    let passwordSet = false;

    const syncControls = () => {
        passwordState.textContent = passwordSet ? "Password configured" : "No password configured";
        remove.disabled = !passwordSet;
        send.disabled = !savedEnabled || !passwordSet;
    };

    panel.querySelector("#site-smtp-export").addEventListener("click", async () => {
        try {
            await exportMigration(`/api${endpoint}/export`, `site-${id}-smtp.pnm`);
        } catch (err) {
            toast.error(err.message);
        }
    });

    const importInput = panel.querySelector("#site-smtp-import");
    importInput.addEventListener("change", async () => {
        const file = importInput.files[0];
        if (!file) return;
        try {
            if (!await importMigration(`/api${endpoint}/import`, file)) return;
            loaded = false;
            await load();
            toast.success("SMTP settings imported");
        } catch (err) {
            toast.error(err.message);
        } finally {
            importInput.value = "";
        }
    });

    const load = async () => {
        if (loaded || busy) return;
        busy = true;
        retry.hidden = true;
        status.textContent = "Loading SMTP settings…";
        try {
            const saved = await api.get(endpoint);
            if (!saved) return;

            savedEnabled = saved.enabled === "true";
            passwordSet = saved.password_set === "true";
            settings.elements.enabled.checked = savedEnabled;
            settings.elements.host.value = saved.host ?? "";
            settings.elements.port.value = saved.port ?? "587";
            settings.elements.encryption.value = saved.encryption ?? "starttls";
            settings.elements.username.value = saved.username ?? "";
            settings.elements.from_email.value = saved.from_email ?? "";
            settings.elements.from_name.value = saved.from_name ?? "";

            syncControls();
            loaded = true;
            actions.disabled = false;
            status.textContent = "";
        } catch (error) {
            status.textContent = error.message;
            retry.hidden = false;
        } finally {
            busy = false;
        }
    };

    // Serialize writes so password and enabled states cannot get out of sync in the panel.
    const run = async (action) => {
        if (busy || !loaded) return;
        busy = true;
        actions.disabled = true;
        try {
            await action();
        } catch (error) {
            if (panel.isConnected) toast.error(error.message);
        } finally {
            busy = false;
            actions.disabled = false;
            syncControls();
        }
    };

    link.addEventListener("click", load);
    retry.addEventListener("click", load);

    settings.addEventListener("submit", (event) => {
        event.preventDefault();
        run(async () => {
            const fields = settings.elements;
            const enabled = fields.enabled.checked;
            if (enabled && !passwordSet) {
                toast.error("Save the SMTP password before enabling outbound SMTP.");
                return;
            }
            const result = await api.put(endpoint, {
                enabled: String(enabled),
                host: fields.host.value.trim(),
                port: fields.port.value,
                encryption: fields.encryption.value,
                username: fields.username.value.trim(),
                from_email: fields.from_email.value.trim(),
                from_name: fields.from_name.value.trim(),
            }, 105000);
            if (!result) return;
            savedEnabled = enabled;
            if (panel.isConnected) toast.success("SMTP settings saved");
        });
    });

    credentials.addEventListener("submit", (event) => {
        event.preventDefault();
        run(async () => {
            // The API serializes the password synchronously. Clear the input before waiting.
            const request = api.put(`${endpoint}/password`, { password: password.value }, 105000);
            password.value = "";
            const result = await request;
            if (!result) return;
            passwordSet = result.password_set === "true";
            if (panel.isConnected) toast.success("SMTP password saved");
        });
    });

    remove.addEventListener("click", () => {
        run(async () => {
            if (!await confirm("Remove SMTP Password", "Removing the password disables outbound SMTP for this site.")) return;
            const result = await api._req("DELETE", `${endpoint}/password`, undefined, 105000);
            if (!result) return;
            password.value = "";
            passwordSet = false;
            savedEnabled = false;
            settings.elements.enabled.checked = false;
            if (panel.isConnected) toast.success("SMTP password removed");
        });
    });

    test.addEventListener("submit", (event) => {
        event.preventDefault();
        run(async () => {
            const result = await api.post(`${endpoint}/test`, { recipient: recipient.value.trim() });
            if (result && panel.isConnected) toast.success("SMTP server accepted the test email");
        });
    });
}
