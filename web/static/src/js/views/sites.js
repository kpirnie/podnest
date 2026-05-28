"use strict";

import { api } from '../api.js';
import { emptyState, siteTypeLabel, statusBadge, versionLabel } from '../helpers.js';
import { showCreateSiteModal } from '../modals/create-site.js';

export async function viewSites(root) {
    const sites = (await api.get("/sites")) ?? [];

    root.innerHTML = `
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Sites</h1>
            <button class="uk-button kp-btn-primary" id="sites-new-btn">
                <span uk-icon="plus"></span> New Site
            </button>
        </div>
        ${sites.length === 0
            ? emptyState("world", "No sites yet — create one to get started")
            : `<div class="kp-table-wrap">
                <div class="uk-overflow-auto">
                    <table class="uk-table uk-table-hover uk-table-divider uk-table-small uk-margin-remove">
                        <thead>
                            <tr>
                                <th class="uk-table-shrink">Status</th>
                                <th>Name</th>
                                <th class="uk-visible@s">Type</th>
                                <th class="uk-visible@m">Port</th>
                                <th class="uk-visible@m">Domain</th>
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
}

export function siteRow(site, allSites = []) {
    const primaryDomain = site.Domains?.[0] ?? null;
    const isRP          = site.SiteType === 6;
    // resolve parent only when this site is a clone
    const parent        = site.ParentID > 0
        ? (allSites.find(s => s.ID === site.ParentID) ?? null)
        : null;

    return `
        <tr data-site-id="${site.ID}" data-status="${site.SiteStatus}" data-type="${site.SiteType}">
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
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
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
                    <button class="uk-button kp-btn-ghost kp-btn-sm"
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