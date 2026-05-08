"use strict";

import { api }     from '../api.js';
import { toast }   from '../toast.js';
import { confirm } from '../helpers.js';

const configLabels = { 1: "Nginx", 2: "PHP", 3: "MariaDB", 4: "Redis" };

export function renderConfigTab(siteId, type, cfg) {
    const entries = cfg ? Object.entries(cfg) : [];
    return `
        <div>
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <span class="kp-muted uk-text-small">${entries.length} configuration keys</span>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-add-row" data-type="${type}">
                        <span uk-icon="plus"></span> Add Key
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm cfg-save" data-type="${type}" data-site="${siteId}">
                        <span uk-icon="check"></span> Save
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cfg-reset" data-type="${type}" data-site="${siteId}">
                        <span uk-icon="refresh"></span> Reset
                    </button>
                </div>
            </div>
            <div class="kp-config-grid cfg-rows" data-type="${type}">
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
}
