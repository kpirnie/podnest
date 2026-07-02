// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { emptyState, siteTypeLabel, statusBadge, versionLabel } from '../helpers.js';
import { showCreateSiteModal } from '../modals/create-site.js';

export async function viewSites(root) {
    const sites = (await api.get("/sites")) ?? [];

    root.innerHTML = `
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Sites</h1>
            <button class="uk-button kp-btn-primary" id="sites-new-btn" uk-tooltip="Create a New Site">
                <span uk-icon="plus"></span> New
            </button>
        </div>

        <!-- bulk action bar — always visible -->
        <div id="sites-bulk-bar" class="kp-bulk-bar">
            <div class="kp-bulk-actions">
                <span id="sites-bulk-count" class="kp-bulk-count">0 selected</span>
                <!-- desktop: individual buttons (hidden on mobile) -->
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-start" uk-tooltip="Start the Pod(s)" disabled>
                    <span uk-icon="play"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-stop" uk-tooltip="Stop the Pod(s)" disabled>
                    <span uk-icon="ban"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-restart" uk-tooltip="Restart the Pod(s)" disabled>
                    <span uk-icon="refresh"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm uk-visible@s" id="bulk-flush" uk-tooltip="Flush the Pod Cache(s)" disabled>
                    <span uk-icon="bolt"></span>
                </button>
                <!-- separator + dangerous bulk action -->
                <span class="uk-visible@s kp-vert-sep" aria-hidden="true"></span>
                <button class="uk-button kp-btn-danger kp-btn-recreate kp-btn-sm uk-visible@s" id="bulk-recreate" uk-tooltip="Recreate the Pod(s)" disabled>
                    <span uk-icon="cloud-download"></span>
                </button>
                <!-- mobile: actions dropdown (hidden on desktop), mirrors Manage dropdown -->
                <li id="kp-bulk-mobile-pill" class="uk-hidden@s" style="position:relative;list-style:none">
                    <a href="javascript:void(0);" class="kp-pill-dropdown-btn" id="kp-bulk-mobile-btn">
                        Actions <span uk-icon="icon: chevron-down; ratio: 0.8"></span>
                    </a>
                    <div class="kp-pill-dropdown" id="kp-bulk-mobile-dropdown" hidden>
                        <a href="#" id="bulk-mobile-start"><span uk-icon="icon: play; ratio: 0.85"></span> Start</a>
                        <a href="#" id="bulk-mobile-stop"><span uk-icon="icon: ban; ratio: 0.85"></span> Stop</a>
                        <a href="#" id="bulk-mobile-restart"><span uk-icon="icon: refresh; ratio: 0.85"></span> Restart</a>
                        <a href="#" id="bulk-mobile-flush"><span uk-icon="icon: bolt; ratio: 0.85"></span> Flush Caches</a>
                        <a href="#" id="bulk-mobile-recreate"><span uk-icon="icon: cloud-download; ratio: 0.85"></span> Recreate</a>
                    </div>
                </li>
            </div>
            <input class="uk-input kp-input kp-input-sm kp-sites-search"
                   id="sites-search" type="text" placeholder="Filter sites…" autocomplete="off">
        </div>

        ${sites.length === 0
            ? emptyState("world", "No sites yet — create one to get started")
            : `<div class="kp-table-wrap">
                <div class="uk-overflow-auto">
                    <table class="uk-table uk-table-hover uk-table-divider uk-table-small uk-margin-remove">
                        <thead>
                            <tr>
                                <th class="uk-table-shrink">
                                    <input class="uk-checkbox" type="checkbox" id="sites-select-all" uk-tooltip="Select All">
                                </th>
                                <th class="kp-sortable" data-col="status">Status <span class="kp-sort-icon" data-col="status"></span></th>
                                <th class="kp-sortable" data-col="name">Name <span class="kp-sort-icon" data-col="name"></span></th>
                                <th class="uk-visible@s kp-sortable" data-col="type">Type <span class="kp-sort-icon" data-col="type"></span></th>
                                <th class="uk-visible@m">Port</th>
                                <th class="uk-visible@m kp-sortable" data-col="domain">Domain <span class="kp-sort-icon" data-col="domain"></span></th>
                                <th class="uk-table-shrink">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sites.map(s => siteRow(s, sites)).join("")}
                        </tbody>
                    </table>
                </div>
            </div>`
        }`;

    document.getElementById("sites-new-btn")
        .addEventListener("click", () => showCreateSiteModal());

    // wire select-all and row checkboxes
    wireBulkSelection();
}

function siteRow(site, allSites = []) {
    const primaryDomain = site.Domains?.[0] ?? null;
    const isRP          = site.SiteType === 6;
    // resolve parent only when this site is a clone
    const parent        = site.ParentID > 0
        ? (allSites.find(s => s.ID === site.ParentID) ?? null)
        : null;

    return `
        <tr data-site-id="${site.ID}" data-status="${site.SiteStatus}" data-type="${site.SiteType}">
            <!-- row checkbox -->
            <td class="uk-table-shrink">
                <input class="uk-checkbox kp-site-row-check" type="checkbox"
                       data-site-id="${site.ID}" data-site-type="${site.SiteType}">
            </td>
            <!-- status badge -->
            <td class="uk-table-shrink kp-site-row-status">${!isRP ? statusBadge(site.SiteStatus) : ""}</td>

            <!-- name + optional parent clone link -->
            <td>
                <a class="kp-site-row-name" href="javascript:void(0)"
                   data-action="manage" data-id="${site.ID}">${site.Name}</a>
                ${parent
                    ? `<div class="kp-muted uk-text-small kp-mono">
                           <span uk-icon="icon: git-fork; ratio: 0.7"></span>
                           <a href="javascript:void(0)" data-action="manage" data-id="${parent.ID}"
                              style="color:var(--kp-cyan)">${parent.Name}</a>
                       </div>`
                    : ""}
            </td>

            <!-- type / runtime version -->
            <td class="uk-visible@s kp-muted kp-mono uk-text-small">
                ${siteTypeLabel(site.SiteType)}${versionLabel(site) ? " / " + versionLabel(site) : ""}
            </td>

            <!-- internal port -->
            <td class="uk-visible@m kp-muted kp-mono uk-text-small">:${site.Port}</td>

            <!-- primary domain -->
            <td class="uk-visible@m uk-text-small">
                ${primaryDomain
                    ? `<a href="http://${primaryDomain}" target="_blank"
                          style="color:var(--kp-cyan)">${primaryDomain}</a>`
                    : `<span class="kp-muted">—</span>`}
            </td>

            <!-- action buttons -->
            <td class="uk-table-shrink">
                <div class="kp-site-row-actions">
                    <button class="uk-button kp-btn-secondary kp-btn-sm"
                            data-action="manage" data-id="${site.ID}"
                            uk-tooltip="Manage">
                        <span uk-icon="icon: cog;"></span>
                    </button>
                    ${!isRP ? `
                    ${site.SiteStatus === 1
                        ? `<button class="uk-button kp-btn-secondary kp-btn-sm"
                                   data-action="stop" data-id="${site.ID}"
                                   uk-tooltip="Stop">
                               <span uk-icon="icon: ban;"></span>
                           </button>`
                        : `<button class="uk-button kp-btn-secondary kp-btn-sm"
                                   data-action="start" data-id="${site.ID}"
                                   uk-tooltip="Start">
                               <span uk-icon="icon: play;"></span>
                           </button>`
                    }
                    <button class="uk-button kp-btn-secondary kp-btn-sm"
                            data-action="restart" data-id="${site.ID}"
                            uk-tooltip="Restart">
                        <span uk-icon="icon: refresh;"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm"
                            data-action="flush" data-id="${site.ID}"
                            uk-tooltip="Flush Caches">
                        <span uk-icon="icon: bolt;"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate"
                            data-action="recreate" data-id="${site.ID}"
                            uk-tooltip="Recreate Pod">
                        <span uk-icon="icon: history;"></span>
                    </button>
                    ` : ""}
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
                            data-action="clone" data-id="${site.ID}" data-name="${site.Name}"
                            uk-tooltip="Clone">
                        <span uk-icon="icon: move;"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
                            data-action="edit" data-id="${site.ID}"
                            uk-tooltip="Edit">
                        <span uk-icon="icon: pencil;"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate"
                            data-action="delete" data-id="${site.ID}"
                            uk-tooltip="Delete">
                        <span uk-icon="icon: trash;"></span>
                    </button>
                </div>
            </td>
        </tr>`;
}

export function siteCard(site, allSites = []) {
    const primaryDomain = site.Domains?.[0] ?? null;
    const isRP          = site.SiteType === 6;
    // resolve parent only when this site is a clone
    const parent        = site.ParentID > 0
        ? (allSites.find(s => s.ID === site.ParentID) ?? null)
        : null;
    return `
        <div class="kp-site-card" data-site-id="${site.ID}" data-status="${site.SiteStatus}" data-type="${site.SiteType}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${site.ID}">${site.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${site.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${siteTypeLabel(site.SiteType)}${versionLabel(site) ? " / " + versionLabel(site) : ""}</span>
                        ${primaryDomain ? `<span class="kp-site-meta-item" style="width:100%"><a href="http://${primaryDomain}" target="_blank" style="color:var(--kp-cyan)">${primaryDomain}</a></span>` : ""}
                    </div>
                    ${parent ? `<div class="kp-site-meta kp-muted uk-text-small uk-margin-small-top"><span uk-icon="icon: git-fork; ratio: 0.75"></span> <a href="javascript:void(0)" data-action="manage" data-id="${parent.ID}" style="color:var(--kp-cyan)">${parent.Name}</a></div>` : ""}
                </div>
                ${!isRP ? statusBadge(site.SiteStatus) : ""}
            </div>
            <div class="kp-site-actions">
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="manage" data-id="${site.ID}" uk-tooltip="Manage This Site"><span uk-icon="icon: cog;"></span></button>
                ${!isRP ? `
                ${site.SiteStatus === 1
                    ? `<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="stop" data-id="${site.ID}" uk-tooltip="Stop the Site"><span uk-icon="icon: ban;"></span></button>`
                    : `<button class="uk-button kp-btn-secondary kp-btn-sm" data-action="start" data-id="${site.ID}" uk-tooltip="Start the Site"><span uk-icon="icon: play;"></span></button>`
                }
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="restart" data-id="${site.ID}" uk-tooltip="Restart the Site"><span uk-icon="icon: refresh;"></span></button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="flush" data-id="${site.ID}" title="Flush cache" uk-tooltip="Flush the Caches"><span uk-icon="icon: bolt;"></span></button>
                <div class="kp-site-actions-break"></div>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="recreate" data-id="${site.ID}" title="Recreate pod" uk-tooltip="Recreate the Pod"><span uk-icon="icon: history;"></span></button>
                ` : ""}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="clone" data-id="${site.ID}" data-name="${site.Name}" uk-tooltip="Clone"><span uk-icon="icon: move;"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit" data-id="${site.ID}" title="Edit" uk-tooltip="Edit the Site"><span uk-icon="icon: pencil;"></span></button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="delete" data-id="${site.ID}" title="Delete" uk-tooltip="Delete the Site"><span uk-icon="icon: trash;"></span></button>
            </div>
        </div>`;
}

function wireBulkSelection() {
    const bar     = document.getElementById("sites-bulk-bar");
    const countEl = document.getElementById("sites-bulk-count");
    const selAll  = document.getElementById("sites-select-all");
    const search  = document.getElementById("sites-search");
    const tbody   = document.querySelector(".kp-table-wrap tbody");
    if (!bar || !selAll) return;

    // -- sort state
    let sortCol = null, sortAsc = true;

    const getChecked = () =>
        [...document.querySelectorAll(".kp-site-row-check:checked")];

    const updateBulk = () => {
        const checked = getChecked();
        const n = checked.length;
        countEl.textContent = `${n} selected`;

        // sync desktop buttons
        ["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = n === 0;
        });

        // sync mobile dropdown trigger
        const mobileBtn = document.getElementById("kp-bulk-mobile-btn");
        if (mobileBtn) mobileBtn.disabled = n === 0;

        const all = document.querySelectorAll(".kp-site-row-check");
        selAll.indeterminate = n > 0 && n < all.length;
        selAll.checked = all.length > 0 && n === all.length;
    };

    // -- filtering
    const applyFilter = () => {
        const q = search.value.trim().toLowerCase();
        document.querySelectorAll(".kp-table-wrap tbody tr").forEach(row => {
            const name   = row.querySelector(".kp-site-row-name")?.textContent.toLowerCase() ?? "";
            const domain = row.querySelector("td:nth-child(6)")?.textContent.toLowerCase() ?? "";
            row.style.display = (!q || name.includes(q) || domain.includes(q)) ? "" : "none";
        });
    };

    // -- sorting
    const applySort = (col) => {
        if (sortCol === col) {
            sortAsc = !sortAsc;
        } else {
            sortCol = col; sortAsc = true;
        }

        document.querySelectorAll(".kp-sort-icon").forEach(el => {
            el.textContent = el.dataset.col === col ? (sortAsc ? " ↑" : " ↓") : " ↕";
        });

        const rows = [...tbody.querySelectorAll("tr")];
        rows.sort((a, b) => {
            let av = "", bv = "";
            if (col === "name") {
                av = a.querySelector(".kp-site-row-name")?.textContent ?? "";
                bv = b.querySelector(".kp-site-row-name")?.textContent ?? "";
            } else if (col === "status") {
                av = a.dataset.status ?? "";
                bv = b.dataset.status ?? "";
            } else if (col === "type") {
                av = a.dataset.type ?? "";
                bv = b.dataset.type ?? "";
            } else if (col === "domain") {
                av = a.querySelector("td:nth-child(6)")?.textContent.trim() ?? "";
                bv = b.querySelector("td:nth-child(6)")?.textContent.trim() ?? "";
            }
            return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
        rows.forEach(r => tbody.appendChild(r));
    };

    // -- events
    selAll.addEventListener("change", () => {
        document.querySelectorAll(".kp-site-row-check").forEach(cb => {
            cb.checked = selAll.checked;
        });
        updateBulk();
    });

    tbody?.addEventListener("change", (e) => {
        if (e.target.classList.contains("kp-site-row-check")) updateBulk();
    });

    search?.addEventListener("input", applyFilter);

    document.querySelectorAll(".kp-sortable").forEach(th => {
        th.addEventListener("click", () => applySort(th.dataset.col));
    });

    // desktop button clicks
    ["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(action => {
        const btnId = action.replace("bulk-","");
        document.getElementById(action)?.addEventListener("click", () => {
            const ids = getChecked().map(cb => cb.dataset.siteId);
            document.dispatchEvent(new CustomEvent("kp:bulk-action", {
                detail: { action: btnId, ids }
            }));
        });
    });

    // mobile dropdown toggle
    const mobilePill     = document.getElementById("kp-bulk-mobile-pill");
    const mobileDropdown = document.getElementById("kp-bulk-mobile-dropdown");
    document.getElementById("kp-bulk-mobile-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        mobileDropdown.hidden = !mobileDropdown.hidden;
    });
    document.addEventListener("click", (e) => {
        if (mobileDropdown && !mobilePill?.contains(e.target)) mobileDropdown.hidden = true;
    }, { capture: true });

    // mobile dropdown item clicks
    ["start","stop","restart","flush","recreate"].forEach(action => {
        document.getElementById(`bulk-mobile-${action}`)?.addEventListener("click", (e) => {
            e.preventDefault();
            mobileDropdown.hidden = true;
            const ids = getChecked().map(cb => cb.dataset.siteId);
            document.dispatchEvent(new CustomEvent("kp:bulk-action", {
                detail: { action, ids }
            }));
        });
    });

    document.querySelectorAll(".kp-sort-icon").forEach(el => { el.textContent = " ↕"; });
    updateBulk();
}
