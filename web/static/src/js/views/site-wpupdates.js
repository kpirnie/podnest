// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { confirm, escapeHtml } from '../helpers.js';
import { toast } from '../toast.js';

// update run buttons — label shown on button, scope sent to the server
const updateScopes = [
    { label: "Core Only",    scope: "core"    },
    { label: "Themes Only",  scope: "themes"  },
    { label: "Plugins Only", scope: "plugins" },
    { label: "All",          scope: "all"     },
];

// renderWPUpdatesTab returns the HTML markup for the WordPress tab
export function renderWPUpdatesTab() {
    return `
        <div id="wpupdates-panel">
            <!-- wp-admin sso -->
            <div class="kp-card uk-padding-small uk-margin-small-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">wp-admin Sign-In</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="wpsso-open" uk-tooltip="Sign in to wp-admin in a new tab">
                        <span uk-icon="sign-in"></span> Open wp-admin
                    </button>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Signs in as the administrator selected below — every panel user signs in as the same account.
                    With none selected, the site's first administrator is used.
                </p>
                <div class="uk-flex uk-flex-middle" style="gap:8px;max-width:480px">
                    <select class="uk-select kp-input" id="wpsso-user" disabled>
                        <option value="0">First administrator (default)</option>
                    </select>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-top" id="wpsso-error" hidden></p>
            </div>

            <!-- updates -->
            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Updates</h3>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="wpu-check" uk-tooltip="Check for updates now">
                        <span uk-icon="refresh"></span>
                    </button>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    Checked nightly at 11 PM. Last checked: <span id="wpu-checked">never</span>
                </p>
                <div id="wpu-status">
                    <div uk-spinner="ratio: 0.6"></div>
                </div>

                <div class="kp-log-controls uk-margin-small-top" style="flex-wrap:wrap;gap:6px">
                    ${updateScopes.map((u) => `
                        <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="wpu-run" data-scope="${u.scope}">
                            ${u.label}
                        </button>`).join("")}
                </div>

                <div class="kp-log-header uk-margin-small-top">
                    <div class="kp-log-dot kp-log-dot-red"></div>
                    <div class="kp-log-dot kp-log-dot-yellow"></div>
                    <div class="kp-log-dot kp-log-dot-green"></div>
                    <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px" id="wpu-run-status">Ready</span>
                </div>
                <div class="kp-log-wrap" id="wpu-output" style="height:400px"></div>
            </div>
        </div>`;
}

// renderItems returns a table of plugins or themes with updates available
function renderItems(title, items) {
    if (!items?.length) {
        return `<p class="kp-muted uk-text-small uk-margin-small-top">${title}: up to date.</p>`;
    }
    return `
        <h4 class="uk-margin-small-top uk-margin-remove-bottom uk-text-small">${title} (${items.length})</h4>
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead><tr><th>Name</th><th>Installed</th><th>Available</th></tr></thead>
            <tbody>
                ${items.map((i) => `
                    <tr>
                        <td>${escapeHtml(i.title || i.name)}<div class="kp-muted uk-text-small kp-mono">${escapeHtml(i.name)}</div></td>
                        <td class="kp-mono">${escapeHtml(i.version)}</td>
                        <td class="kp-mono">${escapeHtml(i.update_version)}</td>
                    </tr>`).join("")}
            </tbody>
        </table>
        </div>`;
}

// renderStatus returns the cached update summary
function renderStatus(status) {
    if (!status) {
        return `<p class="kp-muted uk-text-small uk-margin-remove">Not checked yet.</p>`;
    }
    return `
        ${status.error ? `<p class="kp-log-line-err uk-text-small uk-margin-small-bottom">${escapeHtml(status.error)}</p>` : ""}
        <p class="uk-text-small uk-margin-remove">
            Core: <span class="kp-mono">${escapeHtml(status.core_version || "unknown")}</span>
            ${status.core_update
                ? `→ <span class="kp-mono kp-log-line-warn">${escapeHtml(status.core_update)}</span> available`
                : `<span class="kp-muted">(up to date)</span>`}
        </p>
        ${renderItems("Plugins", status.plugins)}
        ${renderItems("Themes", status.themes)}`;
}

// showStatus paints the cached status and its check time
function showStatus(root, status) {
    root.querySelector("#wpu-status").innerHTML = renderStatus(status);
    root.querySelector("#wpu-checked").textContent = status?.checked ? new Date(status.checked).toLocaleString() : "never";
}

// loadWPUpdatesTab fetches the cached update status and the SSO admin list
export async function loadWPUpdatesTab(root, siteId) {
    if (!root.querySelector("#wpupdates-panel")) return;

    try {
        const { status } = await api.get(`/sites/${siteId}/wpupdates`);
        showStatus(root, status);
    } catch (e) {
        root.querySelector("#wpu-status").innerHTML = `<p class="kp-log-line-err uk-text-small">${escapeHtml(e.message)}</p>`;
    }

    try {
        const data = await api.get(`/sites/${siteId}/wpsso`);
        const sel = root.querySelector("#wpsso-user");
        sel.innerHTML = `<option value="0">First administrator (default)</option>` + data.admins.map((a) => `
            <option value="${a.id}" ${a.id === data.selected ? "selected" : ""}>
                ${escapeHtml(a.display_name || a.login)} (${escapeHtml(a.login)})
            </option>`).join("");

        // keep a stored selection visible even when the list could not be loaded
        if (data.selected && !data.admins.some((a) => a.id === data.selected)) {
            sel.insertAdjacentHTML("beforeend", `<option value="${data.selected}" selected>User #${data.selected}</option>`);
        }
        sel.disabled = false;

        const err = root.querySelector("#wpsso-error");
        err.hidden = !data.error;
        err.textContent = data.error ? `Could not list administrators: ${data.error}` : "";
    } catch (e) {
        toast.error("Failed to load wp-admin sign-in settings: " + e.message);
    }
}

// wireWPUpdatesTab attaches all event handlers for the WordPress tab.
// Must be called after renderWPUpdatesTab has been inserted into the DOM.
export function wireWPUpdatesTab(root, siteId) {
    const output    = root.querySelector("#wpu-output");
    const runStatus = root.querySelector("#wpu-run-status");
    const checkBtn  = root.querySelector("#wpu-check");
    const runBtns   = root.querySelectorAll('[data-action="wpu-run"]');

    // append streamed output, colouring by content
    function appendLine(text, cls = "") {
        text.split("\n").forEach((line) => {
            if (!line) return;
            const div = document.createElement("div");
            div.className = cls || (line.match(/error|fatal|critical/i) ? "kp-log-line-err"
                : line.match(/warning|warn/i)                          ? "kp-log-line-warn"
                : line.match(/success|^\$ wp|done\]/i)                 ? "kp-log-line-info"
                : "");
            div.textContent = line;
            output.appendChild(div);
        });
        output.scrollTop = output.scrollHeight;
    }

    // toggle every control that would start a competing check or run
    function setBusy(busy, label) {
        runBtns.forEach((b) => { b.disabled = busy; });
        checkBtn.disabled = busy;
        runStatus.textContent = label;
    }

    // save the selected sso administrator as soon as it changes
    root.querySelector("#wpsso-user").addEventListener("change", async (e) => {
        try {
            await api.put(`/sites/${siteId}/wpsso`, { wp_user_id: parseInt(e.target.value, 10) });
            toast.success("wp-admin sign-in user saved");
        } catch (err) {
            toast.error(err.message);
        }
    });

    // open the tab first, inside the click, so popup blockers allow it
    root.querySelector("#wpsso-open").addEventListener("click", async () => {
        const win = window.open("", "_blank");
        if (win) win.opener = null;
        try {
            const { url } = await api.post(`/sites/${siteId}/wpsso/login`);
            if (win) win.location.href = url;
            else window.location.href = url;
        } catch (e) {
            win?.close();
            toast.error(e.message);
        }
    });

    // manual update check
    checkBtn.addEventListener("click", async () => {
        const orig = checkBtn.innerHTML;
        setBusy(true, "Checking...");
        checkBtn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            const { status } = await api.post(`/sites/${siteId}/wpupdates/check`, undefined, 300000);
            showStatus(root, status);
            toast.success("Update check complete");
        } catch (e) {
            toast.error(e.message);
        } finally {
            checkBtn.innerHTML = orig;
            setBusy(false, "Ready");
        }
    });

    // update runs stream into this tab's own terminal, then refresh the summary
    runBtns.forEach((btn) => {
        btn.addEventListener("click", async () => {
            const label = btn.textContent.trim();
            if (!await confirm("Apply Updates", `Run "${label}" updates on this site now? Take a backup first if you need a way back.`)) return;

            setBusy(true, `Running ${label}...`);
            appendLine(`== ${label} ==`, "kp-log-line-info");

            const proto = location.protocol === "https:" ? "wss" : "ws";
            const ws    = new WebSocket(`${proto}://${location.host}/api/sites/${siteId}/wpupdates/run?scope=${encodeURIComponent(btn.dataset.scope)}`);

            ws.onmessage = (e) => {
                const text = e.data;
                if (text.trim() === "[done]") {
                    appendLine(text, "kp-log-line-info");
                    ws.close();
                    return;
                }
                if (text.trimStart().startsWith("[error]")) {
                    appendLine(text, "kp-log-line-err");
                    ws.close();
                    return;
                }
                appendLine(text);
            };

            ws.onerror = () => {
                appendLine("[error] WebSocket connection failed", "kp-log-line-err");
            };

            ws.onclose = () => {
                setBusy(false, "Ready");
                loadWPUpdatesTab(root, siteId);
            };
        });
    });
}
