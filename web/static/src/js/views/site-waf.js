// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { toast } from '../toast.js';

// renderWAFOverride returns the static HTML shell for the WAF override tab
function renderWAFOverride() {
    return `
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">WAF Override</h3>
            <form id="waf-override-form" class="uk-form-stacked">
                <div class="uk-margin">
                    <label class="kp-label" for="waf-override">Site Behaviour</label>
                    <select class="uk-select kp-select" id="waf-override" name="override">
                        <option value="0">Inherit global setting</option>
                        <option value="1">Force ON for this site</option>
                        <option value="2">Force OFF for this site</option>
                    </select>
                </div>
                <div class="uk-margin">
                    <label class="kp-label">CRS Plugins</label>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Select OWASP CRS plugins to enable for this site. Only plugins present in the
                        local CRS install are shown. Changes recompile the site WAF engine in the background.
                    </p>
                    <div id="waf-plugins-list" class="uk-margin-small-top">
                        <span class="kp-muted uk-text-small">Loading available plugins…</span>
                    </div>
                </div>
                <div class="uk-margin">
                    <label class="kp-label" for="waf-site-exclusions">Additional Rule Exclusions</label>
                    <textarea
                        class="uk-textarea kp-input kp-mono kp-waf-exclusions"
                        id="waf-site-exclusions"
                        name="exclusions"
                        rows="15"
                        placeholder="# Numeric = rule ID, text = tag name, one per line&#10;942100&#10;attack-xss"></textarea>
                    <p class="kp-muted uk-text-small uk-margin-small-top">
                        Merged on top of global exclusions. Useful for WooCommerce, contact forms, or file upload paths that trigger false positives.
                    </p>
                </div>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <a class="uk-button kp-btn-ghost" id="waf-export-btn" href="#" uk-tooltip="Export WAF settings">
                        <span uk-icon="download"></span>
                    </a>
                    <label class="uk-button kp-btn-ghost" style="cursor:pointer" uk-tooltip="Import WAF settings">
                        <span uk-icon="upload"></span>
                        <input type="file" id="waf-import" accept=".json" style="display:none">
                    </label>
                    <button type="submit" class="uk-button kp-btn-primary">
                        <span uk-icon="check"></span> Save
                    </button>
                </div>
            </form>
        </div>`;
}

// loadWAFTab fetches the current WAF override for the site and populates the form
export async function loadWAFTab(id) {
    const panel = document.getElementById("waf-tab-panel");
    if (!panel) return;
    panel.innerHTML = renderWAFOverride();
    const exportBtn = document.getElementById("waf-export-btn");
    if (exportBtn) exportBtn.href = `/api/sites/${id}/waf/export`;

    try {
        const data = await api.get(`/sites/${id}/waf`);
        const sel  = document.getElementById("waf-override");
        const exc  = document.getElementById("waf-site-exclusions");
        if (sel) sel.value = String(data.Override ?? 0);
        if (exc) exc.value = data.Exclusions ?? '';

        // populate plugin checkboxes
        const pluginsList = document.getElementById("waf-plugins-list");
        if (pluginsList) {
            const [available, selected] = await Promise.all([
                api.get(`/settings/waf/plugins`),
                api.get(`/sites/${id}/waf/plugins`),
            ]);
            const enabledSet = new Set(selected ?? []);
            if (!available || available.length === 0) {
                pluginsList.innerHTML = `<span class="kp-muted uk-text-small">No plugins found in local CRS install.</span>`;
            } else if (window.matchMedia("(max-width: 959px)").matches) {
                // mobile — styled multiselect instead of pills
                pluginsList.innerHTML = `
                    <select multiple class="uk-select kp-select waf-plugin-select" size="${Math.min(available.length, 8)}">
                        ${available.map(p => `
                        <option value="${p}" ${enabledSet.has(p) ? 'selected' : ''}>${p}</option>
                        `).join("")}
                    </select>`;
            } else {
                pluginsList.innerHTML = `
                    <div class="waf-plugin-pills">
                        ${available.map(p => `
                        <span class="waf-plugin-pill ${enabledSet.has(p) ? 'active' : ''}"
                            data-plugin="${p}">${p}</span>
                        `).join("")}
                    </div>`;

                // toggle active state on click
                pluginsList.querySelectorAll(".waf-plugin-pill").forEach(pill => {
                    pill.addEventListener("click", () => pill.classList.toggle("active"));
                });
            }
        }
    } catch (e) {
        toast.error("Failed to load WAF settings: " + e.message);
    }
}

// wireWAFTab binds the WAF override form submit handler
export function wireWAFTab(root, id, signal) {

    root.addEventListener("submit", async (e) => {
        if (e.target.id !== "waf-override-form") return;
        e.preventDefault();
        const btn  = e.target.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Saving...';

        const fd   = new FormData(e.target);
        const body = {
            override:   parseInt(fd.get("override"), 10),
            exclusions: fd.get("exclusions").trim(),
        };

        try {
            await api.put(`/sites/${id}/waf`, body);

            // save plugin selection — pills on desktop, multiselect on mobile
            const sel = document.querySelector(".waf-plugin-select");
            const plugins = sel
                ? [...sel.selectedOptions].map(o => o.value)
                : [...document.querySelectorAll(".waf-plugin-pill.active")].map(p => p.dataset.plugin);
            await api.put(`/sites/${id}/waf/plugins`, plugins);

            toast.success("WAF override saved — engine recompiling in background");
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    }, { signal });

    // WAF JSON import
    root.querySelector("#waf-import")?.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res  = await fetch(`/api/sites/${id}/waf/import`, { method: "POST", headers: { "X-CSRF-Token": window.KP?.csrf ?? "" }, body: fd });
            const data = res.status === 204 ? null : await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
            await loadWAFTab(id);
            toast.success("WAF settings imported");
        } catch (err) {
            toast.error(err.message);
        } finally {
            e.target.value = "";
        }
    });
}

