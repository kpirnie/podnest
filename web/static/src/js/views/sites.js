// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { cardRow, emptyState, siteTypeLabel, statusBadge, versionLabel } from '../helpers.js';
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
                <input class="uk-checkbox" type="checkbox" id="sites-select-all" uk-tooltip="Select All">
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

            <div class="kp-bulk-tools">
                <!-- line 1: sort + direction + reset -->
                <div class="kp-bulk-tools-row">
                    <div class="uk-inline kp-sites-sort">
                        <a class="uk-form-icon kp-sort-dir kp-sort-asc" href="javascript:void(0)" id="sites-sort-dir"
                           uk-icon="icon: arrow-down-arrow-up" uk-tooltip="Toggle Sort Direction" aria-label="Toggle Sort Direction"></a>
                        <select class="uk-select kp-select kp-input-sm" id="sites-sort" uk-tooltip="Sort">
                            <option value="name" selected>Name</option>
                            <option value="status">Status</option>
                            <option value="type">Type</option>
                            <option value="domain">Domain</option>
                        </select>
                    </div>
                    <button class="uk-button kp-btn-secondary kp-btn-icon kp-btn-sm" id="sites-reset" uk-tooltip="Reset Sort & Filters">
                        <span uk-icon="refresh"></span>
                    </button>
                </div>
                <!-- line 2: type + status filters + search -->
                <div class="kp-bulk-tools-row">
                    <select class="uk-select kp-select kp-input-sm kp-sites-filter" id="sites-type" uk-tooltip="Filter by Type">
                        <option value="" selected>All Types</option>
                        ${[...new Set(sites.map(s => s.SiteType))]
                            .sort((a, b) => siteTypeLabel(a).localeCompare(siteTypeLabel(b)))
                            .map(t => `<option value="${t}">${siteTypeLabel(t)}</option>`).join("")}
                    </select>
                    <select class="uk-select kp-select kp-input-sm kp-sites-filter" id="sites-status" uk-tooltip="Filter by Status">
                        <option value="" selected>All Statuses</option>
                        <option value="1">Running</option>
                        <option value="2">Stopped</option>
                        <option value="3">Restarting</option>
                        <option value="4">Error</option>
                    </select>
                    <div class="uk-inline kp-sites-search">
                        <span class="uk-form-icon" uk-icon="icon: search"></span>
                        <input class="uk-input kp-input kp-input-sm"
                               id="sites-search" type="text" placeholder="Filter sites…" autocomplete="off">
                    </div>
                </div>
            </div>
        </div>

        ${sites.length === 0
            ? emptyState("world", "No sites yet — create one to get started")
            : `<div class="kp-list-grid" id="sites-grid">
                ${sites.map(s => siteListCard(s, sites)).join("")}
            </div>`
        }`;

    document.getElementById("sites-new-btn")
        .addEventListener("click", () => showCreateSiteModal());

    // wire select-all and row checkboxes
    wireBulkSelection();
}

function siteListCard(site, allSites = []) {
    const primaryDomain = site.Domains?.[0] ?? null;
    const isRP          = site.SiteType === 6;
    // resolve parent only when this site is a clone
    const parent        = site.ParentID > 0
        ? (allSites.find(s => s.ID === site.ParentID) ?? null)
        : null;

    return `
        <div class="kp-list-card" data-site-id="${site.ID}" data-status="${!isRP ? site.SiteStatus : ""}"
             data-type="${site.SiteType}" data-domain="${primaryDomain ?? ""}">
            <!-- row checkbox + name -->
            <div class="kp-list-card-header">
                <input class="uk-checkbox kp-site-row-check" type="checkbox"
                       data-site-id="${site.ID}" data-site-type="${site.SiteType}">
                <a class="kp-site-row-name" href="javascript:void(0)"
                   data-action="manage" data-id="${site.ID}">${site.Name}</a>
            </div>

            <!-- details -->
            <div class="kp-list-card-body">
                ${!isRP ? cardRow("Status", statusBadge(site.SiteStatus)) : ""}
                ${cardRow("Type", `${siteTypeLabel(site.SiteType)}${!isRP && versionLabel(site) ? " / " + versionLabel(site) : ""}`, "kp-muted kp-mono")}
                ${cardRow("Port", `:${site.Port}`, "kp-muted kp-mono")}
                ${cardRow("UID", site.HostUID ?? "—", "kp-muted kp-mono")}
                ${cardRow("Domain", primaryDomain
                    ? `<a href="http://${primaryDomain}" target="_blank"
                          style="color:var(--kp-cyan)">${primaryDomain}</a>`
                    : `<span class="kp-muted">—</span>`)}
                ${parent
                    ? cardRow("Clone of", `<span uk-icon="icon: git-fork; ratio: 0.7"></span>
                          <a href="javascript:void(0)" data-action="manage" data-id="${parent.ID}"
                             style="color:var(--kp-cyan)">${parent.Name}</a>`, "kp-mono")
                    : ""}
            </div>

            <!-- action buttons -->
            <div class="kp-list-card-actions">
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
                ` : ""}
                <span class="kp-list-card-spacer"></span>
                ${!isRP ? `
                <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate"
                        data-action="recreate" data-id="${site.ID}"
                        uk-tooltip="Recreate Pod">
                    <span uk-icon="icon: cloud-download;"></span>
                </button>
                ` : ""}
                <button class="uk-button kp-btn-ghost kp-btn-sm kp-btn-recreate"
                        data-action="delete" data-id="${site.ID}"
                        uk-tooltip="Delete">
                    <span uk-icon="icon: trash;"></span>
                </button>
            </div>
        </div>`;
}

export function siteCard(site, allSites = []) {
    const primaryDomain = site.Domains?.[0] ?? null;
    const isRP          = site.SiteType === 6;
    // resolve parent only when this site is a clone
    const parent        = site.ParentID > 0
        ? (allSites.find(s => s.ID === site.ParentID) ?? null)
        : null;
    return `
        <div class="kp-site-card uk-margin" data-site-id="${site.ID}" data-status="${!isRP ? site.SiteStatus : ""}" data-type="${site.SiteType}">
            <div class="kp-site-card-header">
                <div>
                    <h2 class="kp-view-title" data-action="manage" data-id="${site.ID}">${site.Name}</h2>
                    <div class="kp-site-meta">
                        <span class="kp-site-meta-item"><span uk-icon="icon: server; ratio: 0.75"></span> :${site.Port}</span>
                        <span class="kp-site-meta-item"><span uk-icon="icon: code; ratio: 0.75"></span> ${siteTypeLabel(site.SiteType)}${!isRP && versionLabel(site) ? " / " + versionLabel(site) : ""}</span>
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
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="recreate" data-id="${site.ID}" title="Recreate pod" uk-tooltip="Recreate the Pod"><span uk-icon="icon: cloud-download;"></span></button>
                ` : ""}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="delete" data-id="${site.ID}" title="Delete" uk-tooltip="Delete the Site"><span uk-icon="icon: trash;"></span></button>
            </div>
        </div>`;
}

function wireBulkSelection() {
    const bar     = document.getElementById("sites-bulk-bar");
    const countEl = document.getElementById("sites-bulk-count");
    const selAll  = document.getElementById("sites-select-all");
    const search  = document.getElementById("sites-search");
    const sortSel = document.getElementById("sites-sort");
    const typeSel = document.getElementById("sites-type");
    const statSel = document.getElementById("sites-status");
    const dirBtn  = document.getElementById("sites-sort-dir");
    const reset   = document.getElementById("sites-reset");
    let sortDir   = 1;
    const grid    = document.getElementById("sites-grid");
    if (!bar || !selAll || !grid) return;

    const getChecked = () =>
        [...document.querySelectorAll(".kp-site-row-check:checked")];

    // -- row checkboxes on cards not hidden by the filter
    const visibleChecks = () =>
        [...grid.querySelectorAll(".kp-site-row-check")]
            .filter(cb => cb.closest(".kp-list-card").style.display !== "none");

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

        const all = visibleChecks();
        selAll.indeterminate = n > 0 && n < all.length;
        selAll.checked = all.length > 0 && n === all.length;
    };

    // -- sort/filter value for a card, reverse proxies count as running
    const cardVal = (card, key) => {
        if (key === "name") return card.querySelector(".kp-site-row-name")?.textContent.trim().toLowerCase() ?? "";
        if (key === "status" && card.dataset.type === "6") return "1";
        return (card.dataset[key] ?? "").toLowerCase();
    };

    // -- filtering, hidden cards are unchecked so bulk actions only hit visible ones
    const applyFilter = () => {
        const q  = search.value.trim().toLowerCase();
        const t  = typeSel?.value ?? "";
        const st = statSel?.value ?? "";
        grid.querySelectorAll(".kp-list-card").forEach(card => {
            const show = (!q || cardVal(card, "name").includes(q) || cardVal(card, "domain").includes(q))
                && (!t || cardVal(card, "type") === t)
                && (!st || cardVal(card, "status") === st);
            card.style.display = show ? "" : "none";
            if (!show) card.querySelector(".kp-site-row-check").checked = false;
        });
        updateBulk();
    };

    // -- sorting, ties fall back to name
    const applySort = () => {
        const key   = sortSel?.value ?? "name";
        const cards = [...grid.querySelectorAll(".kp-list-card")];
        cards.sort((a, b) =>
            sortDir * cardVal(a, key).localeCompare(cardVal(b, key), undefined, { numeric: true })
            || cardVal(a, "name").localeCompare(cardVal(b, "name")));
        cards.forEach(c => grid.appendChild(c));
    };

    // -- direction icon state
    const setDir = (d) => {
        sortDir = d;
        dirBtn?.classList.toggle("kp-sort-asc", d === 1);
        dirBtn?.classList.toggle("kp-sort-desc", d === -1);
    };

    // -- events
    selAll.addEventListener("change", () => {
        visibleChecks().forEach(cb => {
            cb.checked = selAll.checked;
        });
        updateBulk();
    });

    grid.addEventListener("change", (e) => {
        if (e.target.classList.contains("kp-site-row-check")) updateBulk();
    });

    search?.addEventListener("input", applyFilter);
    sortSel?.addEventListener("change", applySort);
    typeSel?.addEventListener("change", applyFilter);
    statSel?.addEventListener("change", applyFilter);
    dirBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        setDir(-sortDir);
        applySort();
    });
    reset?.addEventListener("click", () => {
        search.value = "";
        if (typeSel) typeSel.value = "";
        if (statSel) statSel.value = "";
        if (sortSel) sortSel.value = "name";
        setDir(1);
        applyFilter();
        applySort();
    });

    // desktop button clicks
    ["bulk-start","bulk-stop","bulk-restart","bulk-flush","bulk-recreate"].forEach(action => {
        const btnId = action.replace("bulk-","");
        document.getElementById(action)?.addEventListener("click", () => {
            const ids = getChecked().filter(cb => cb.dataset.siteType !== "6").map(cb => cb.dataset.siteId);
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
            const ids = getChecked().filter(cb => cb.dataset.siteType !== "6").map(cb => cb.dataset.siteId);
            document.dispatchEvent(new CustomEvent("kp:bulk-action", {
                detail: { action, ids }
            }));
        });
    });

    applySort();
    updateBulk();
}
