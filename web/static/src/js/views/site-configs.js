"use strict";

import { api } from '../api.js';
import { confirm } from '../helpers.js';
import { toast } from '../toast.js';

const configLabels = { 1: "Nginx", 2: "PHP", 3: "MariaDB", 4: "Redis", 5: "Varnish" };

export function renderConfigTab(siteId, type, cfg) {
    const entries = cfg ? Object.entries(cfg) : [];
    return `
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">${configLabels[type]}</h4>
                    <span class="kp-muted uk-text-small">${entries.length} keys</span>
                </div>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="${type}" uk-tooltip="Add a Key">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="${type}" data-site="${siteId}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="${type}" data-site="${siteId}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/sites/${siteId}/configs/${type}/export" download="${siteId}-config-${type}.csv" uk-tooltip="Export config as CSV">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="${type}" data-site="${siteId}" uk-tooltip="Import config from CSV" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".csv" style="display:none" data-type="${type}" data-site="${siteId}">
                    </label>
                </div>
            </div>
            <div class="kp-config-grid cfg-rows" data-type="${type}">
                ${entries.map(([k, v]) => configRow(k, v)).join("")}
            </div>
        </div>`;
}

export function renderVarnishTab(siteId, cfg) {
    const enabled = cfg?.enabled === "true";
    // exclude 'enabled' from the KV grid — rendered as a dedicated toggle instead
    const entries = cfg ? Object.entries(cfg).filter(([k]) => k !== "enabled") : [];
    return `
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom" uk-tooltip="Add a Key">
                <div class="uk-flex uk-flex-middle" style="gap:10px">
                    <h4 class="kp-view-title uk-margin-remove">Varnish</h4>
                    <span class="kp-muted uk-text-small">${entries.length} keys</span>
                </div>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="5">
                        <span uk-icon="plus"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="5" data-site="${siteId}" uk-tooltip="Save the Configuration">
                        <span uk-icon="check"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="5" data-site="${siteId}" uk-tooltip="Reset to Defaults">
                        <span uk-icon="refresh"></span>
                    </button>
                    <a class="uk-button kp-btn-ghost kp-btn-sm" href="/api/sites/${siteId}/configs/5/export" download="${siteId}-config-5.csv" uk-tooltip="Export config as CSV">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost kp-btn-sm cfg-import-label" data-type="5" data-site="${siteId}" uk-tooltip="Import config from CSV" style="cursor:pointer">
                        <span uk-icon="upload"></span>
                        <input type="file" class="cfg-import-input" accept=".csv" style="display:none" data-type="5" data-site="${siteId}">
                    </label>
                </div>
            </div>

            <!-- enable/disable toggle — requires pod recreate to take effect -->
            <div class="uk-margin-small-bottom" style="background:var(--kp-surface-2);padding:10px 12px;border-radius:6px">
                <label class="uk-flex uk-flex-middle" style="gap:10px;cursor:pointer">
                    <input type="checkbox" class="uk-checkbox varnish-enabled-toggle" ${enabled ? "checked" : ""}>
                    <span>Enable Varnish Cache</span>
                    <span class="kp-muted uk-text-small">— requires pod recreate to take effect</span>
                </label>
            </div>

            <div class="kp-config-grid cfg-rows" data-type="5">
                ${entries.map(([k, v]) => configRow(k, v)).join("")}
            </div>
        </div>`;
}

export function configRow(k = "", v = "") {
    return `<div class="kp-config-row">
        <div class="kp-config-key">
            <input class="cfg-key" type="text" value="${k}" placeholder="key">
        </div>
        <div class="kp-config-val">
            <input class="cfg-val" type="text" value="${v}" placeholder="value">
        </div>
        <button class="kp-config-del cfg-del-row" title="Remove">
            <span uk-icon="icon: close; ratio: 0.8"></span>
        </button>
    </div>`;
}

export function wireConfigTabs(root, siteId) {
    root.addEventListener("click", (e) => {
        if (e.target.closest(".cfg-add-row")) {
            const btn  = e.target.closest(".cfg-add-row");
            const grid = root.querySelector(`.cfg-rows[data-type="${btn.dataset.type}"]`);
            grid.insertAdjacentHTML("beforeend", configRow());
        }
    });

    root.addEventListener("click", (e) => {
        if (e.target.closest(".cfg-del-row")) {
            e.target.closest(".kp-config-row").remove();
        }
    });

    root.addEventListener("click", async (e) => {
        const btn = e.target.closest(".cfg-save");
        if (!btn) return;
        const { type, site } = btn.dataset;
        const rows = root.querySelectorAll(`.cfg-rows[data-type="${type}"] .kp-config-row`);
        const body = {};
        rows.forEach((row) => {
            const k = row.querySelector(".cfg-key").value.trim();
            const v = row.querySelector(".cfg-val").value.trim();
            if (k) body[k] = v;
        });
        // include the enabled toggle value for the varnish config
        if (type === "5") {
            const toggle = root.querySelector(".varnish-enabled-toggle");
            body["enabled"] = toggle?.checked ? "true" : "false";
        }
        try {
            await api.put(`/sites/${site}/configs/${type}`, body);
            toast.success(`${configLabels[type]} config saved`);
        } catch (e) { toast.error(e.message); }
    });

    root.addEventListener("click", async (e) => {
        const btn = e.target.closest(".cfg-reset");
        if (!btn) return;
        const { type, site } = btn.dataset;
        const ok = await confirm("Reset Config", `Reset ${configLabels[type]} config to defaults?`);
        if (!ok) return;
        try {
            const defaults = await api.post(`/sites/${site}/configs/${type}/reset`);
            const grid = root.querySelector(`.cfg-rows[data-type="${type}"]`);
            grid.innerHTML = Object.entries(defaults).map(([k, v]) => configRow(k, v)).join("");
            toast.success(`${configLabels[type]} reset to defaults`);
        } catch (e) { toast.error(e.message); }
    });

    // handle csv import file selection
    root.addEventListener("change", async (e) => {
        const input = e.target.closest(".cfg-import-input");
        if (!input) return;
        const { type, site } = input.dataset;
        const file = input.files[0];
        if (!file) return;

        const fd = new FormData();
        fd.append("file", file);

        try {
            const res = await fetch(`/api/sites/${site}/configs/${type}/import`, { method: "POST", body: fd });
            const data = res.status === 204 ? null : await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

            // refresh the grid rows with the returned merged config
            const grid = root.querySelector(`.cfg-rows[data-type="${type}"]`);
            grid.innerHTML = Object.entries(data).map(([k, v]) => configRow(k, v)).join("");
            toast.success(`${configLabels[type]} config imported`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            // reset so the same file can be re-selected if needed
            input.value = "";
        }
    });
}
