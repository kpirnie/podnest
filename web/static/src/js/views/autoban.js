// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { confirm, escapeHtml, isAdmin } from '../helpers.js';
import { toast } from '../toast.js';

// AB_FIELDS maps each settings input to its API key and the unit it is shown
// in — the API stores seconds, the form shows whatever reads naturally
const AB_FIELDS = [
    { id: "ab-threshold",   key: "threshold",        api: "Threshold",      mult: 1,    label: "Error Responses",      help: "4xx/5xx responses within the window that trigger the 429." },
    { id: "ab-window",      key: "window_secs",      api: "WindowSecs",     mult: 1,    label: "Window (seconds)",     help: "Span the error responses are counted over." },
    { id: "ab-cooldown",    key: "cooldown_secs",    api: "CooldownSecs",   mult: 60,   label: "429 Cooldown (minutes)", help: "Hitting the limit again during the cooldown converts it to a ban." },
    { id: "ab-ban",         key: "ban_secs",         api: "BanSecs",        mult: 60,   label: "Ban Length (minutes)", help: "How long a ban lasts." },
    { id: "ab-strikes",     key: "perm_strikes",     api: "PermStrikes",    mult: 1,    label: "Bans Before Permanent", help: "Bans within the strike window that make the ban permanent." },
    { id: "ab-strike-win",  key: "perm_window_secs", api: "PermWindowSecs", mult: 3600, label: "Strike Window (hours)", help: "Span the bans are counted over." },
];

// AB_ESCALATE is the global-only escalation field
const AB_ESCALATE = { id: "ab-escalate", key: "escalate_sites", api: "EscalateSites", mult: 1, label: "Sites Before Global Ban", help: "An IP banned on this many sites is banned on all of them." };

// abBase returns the API base for the global or a site's auto-ban routes
const abBase = (siteId) => siteId ? `/sites/${siteId}/security/autoban` : `/security/autoban`;

// renderAutoBanPanel returns the static HTML shell for the auto-ban settings
// and ban list. siteId is null on the global WAF page.
export function renderAutoBanPanel(siteId = null) {
    const fields = siteId ? AB_FIELDS : [...AB_FIELDS, AB_ESCALATE];
    return `
        <div id="autoban-panel">

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <ul class="kp-accordion uk-margin-remove" uk-accordion>
                    <li>
                        <a class="uk-accordion-title" href="#"><h3 class="kp-view-title">Auto-Ban Settings</h3></a>
                        <div class="uk-accordion-content">
                            <div class="uk-flex uk-flex-between uk-flex-top uk-margin-small-bottom" style="gap:8px">
                                <p class="kp-muted uk-text-small uk-margin-remove">
                                    ${siteId
                                        ? `Counts this site's 4xx/5xx responses per IP. Leave a field blank to inherit the global value shown.`
                                        : `The global scope counts hits on unregistered domains; per-site counters use these values unless a site overrides them.`}
                                    Bypassed and whitelisted IPs are never counted.
                                </p>
                                <button class="uk-button kp-btn-primary kp-btn-sm" id="ab-save" uk-tooltip="Save Auto-Ban Settings">
                                    <span uk-icon="check"></span>
                                </button>
                            </div>
                            ${siteId ? `
                            <div class="uk-margin-small-bottom">
                                <label class="kp-label">
                                    <input class="uk-checkbox" type="checkbox" id="ab-enabled">
                                    &nbsp;Enable auto-ban for this site
                                </label>
                            </div>` : ''}
                            <div class="uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m" uk-grid>
                                ${fields.map(f => `
                                <div>
                                    <label class="kp-label" for="${f.id}">${f.label}</label>
                                    <input class="uk-input kp-input" id="${f.id}" type="number" min="1" step="1">
                                    <p class="kp-muted uk-text-small uk-margin-small-top">${f.help}</p>
                                </div>`).join("")}
                            </div>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Banned IPs</h3>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="ab-refresh" uk-tooltip="Refresh the list">
                        <span uk-icon="refresh"></span>
                    </button>
                </div>
                <div id="ab-list"><span class="kp-muted uk-text-small">Loading…</span></div>
            </div>
        </div>`;
}

// renderBanList returns the ban table, or an empty-state line
function renderBanList(bans) {
    if (!bans.length) {
        return `<p class="kp-muted uk-text-small uk-margin-remove">No IPs are currently banned.</p>`;
    }

    const admin = isAdmin();
    const rows = bans.map(b => {
        const permanent = !b.Expires;
        return `
        <tr>
            <td class="kp-mono">${escapeHtml(b.IP)}</td>
            <td>${b.Hits}</td>
            <td>${b.Strikes}</td>
            <td>${new Date(b.Created).toLocaleString()}</td>
            <td>${permanent ? `<span class="kp-muted">Permanent</span>` : new Date(b.Expires).toLocaleString()}</td>
            <td>
                <div class="uk-flex uk-flex-right" style="gap:4px">
                    ${!permanent ? `
                    <button class="uk-button kp-btn-ghost kp-btn-sm" data-ab-action="permanent" data-id="${b.ID}" uk-tooltip="Ban permanently">
                        <span uk-icon="lock"></span>
                    </button>` : ''}
                    ${admin ? `
                    <button class="uk-button kp-btn-ghost kp-btn-sm" data-ab-action="allow" data-id="${b.ID}" uk-tooltip="Allow — add to Security Bypass">
                        <span uk-icon="check"></span>
                    </button>` : ''}
                    <button class="uk-button kp-btn-danger kp-btn-sm" data-ab-action="remove" data-id="${b.ID}" uk-tooltip="Remove the ban">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join("");

    return `
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-divider uk-table-small uk-table-middle kp-fm-table">
            <thead>
                <tr>
                    <th>IP</th>
                    <th>Hits</th>
                    <th>Strikes</th>
                    <th>Banned</th>
                    <th>Expires</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        </div>`;
}

// loadBanList fetches the active bans and renders them into the panel
async function loadBanList(panel, siteId) {
    const wrap = panel.querySelector("#ab-list");
    try {
        const bans = await api.get(abBase(siteId));
        wrap.innerHTML = renderBanList(bans ?? []);
    } catch (e) {
        wrap.innerHTML = `<p class="kp-muted uk-text-small uk-margin-remove">Failed to load bans: ${escapeHtml(e.message)}</p>`;
    }
}

// loadSettings fetches the auto-ban settings and fills the form. Per-site
// fields left at inherit stay blank with the global value as the placeholder.
async function loadSettings(panel, siteId) {
    try {
        const data = await api.get(`${abBase(siteId)}/settings`);
        const global = siteId ? data.global : data;
        const own    = siteId ? data.override : data;
        const fields = siteId ? AB_FIELDS : [...AB_FIELDS, AB_ESCALATE];

        fields.forEach(f => {
            const input = panel.querySelector(`#${f.id}`);
            if (!input) return;
            input.placeholder = String(global[f.api] / f.mult);
            input.value = own[f.api] == null ? "" : String(own[f.api] / f.mult);
        });

        const enabled = panel.querySelector("#ab-enabled");
        if (enabled) enabled.checked = !!data.override?.Enabled;
    } catch (e) {
        toast.error("Failed to load auto-ban settings: " + e.message);
    }
}

// saveSettings validates and saves the form. Global fields are required;
// a blank per-site field is sent as null so it inherits.
async function saveSettings(panel, siteId) {
    const fields = siteId ? AB_FIELDS : [...AB_FIELDS, AB_ESCALATE];
    const body = {};

    for (const f of fields) {
        const raw = panel.querySelector(`#${f.id}`).value.trim();
        if (raw === "") {
            if (!siteId) throw new Error(`${f.label} is required`);
            body[f.key] = null;
            continue;
        }
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1) throw new Error(`${f.label} must be a whole number above 0`);
        body[f.key] = n * f.mult;
    }

    if (siteId) body.enabled = panel.querySelector("#ab-enabled").checked;
    await api.put(`${abBase(siteId)}/settings`, body);
}

// initAutoBanPanel wires and loads the panel rendered by renderAutoBanPanel.
// Listeners bind to the panel element itself, which is replaced on every
// render, so re-initialising never stacks handlers.
export function initAutoBanPanel(root, siteId = null) {
    const panel = root.querySelector("#autoban-panel");
    if (!panel) return;

    // save settings
    panel.querySelector("#ab-save")?.addEventListener("click", async (e) => {
        const btn  = e.currentTarget;
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await saveSettings(panel, siteId);
            toast.success("Auto-ban settings saved");
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled  = false;
            btn.innerHTML = orig;
        }
    });

    // refresh the ban list
    panel.querySelector("#ab-refresh")?.addEventListener("click", () => loadBanList(panel, siteId));

    // row actions — delegated, since the list is re-rendered on every load
    panel.querySelector("#ab-list")?.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-ab-action]");
        if (!btn) return;
        const id     = btn.dataset.id;
        const action = btn.dataset.abAction;
        const ip     = btn.closest("tr")?.querySelector("td")?.textContent ?? "this IP";

        try {
            if (action === "permanent") {
                if (!await confirm("Ban Permanently", `Ban ${ip} permanently? It stays banned until removed.`)) return;
                await api.post(`${abBase(siteId)}/${id}/permanent`);
                toast.success(`${ip} banned permanently`);
            } else if (action === "allow") {
                if (!await confirm("Allow IP", `Add ${ip} to Security Bypass? It will skip every security check, including the WAF, on all sites.`)) return;
                await api.post(`${abBase(siteId)}/${id}/allow`);
                toast.success(`${ip} added to Security Bypass`);
            } else if (action === "remove") {
                if (!await confirm("Remove Ban", `Remove the ban on ${ip}? Its strike history is cleared too.`)) return;
                await api.delete(`${abBase(siteId)}/${id}`);
                toast.success(`Ban on ${ip} removed`);
            }
            await loadBanList(panel, siteId);
        } catch (err) {
            toast.error(err.message);
        }
    });

    loadSettings(panel, siteId);
    loadBanList(panel, siteId);
}
