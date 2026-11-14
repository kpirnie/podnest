// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { escapeHtml } from '../helpers.js';
import { toast } from '../toast.js';

// roleManager is the role value of a manager account
const roleManager = 50;

// userLabel returns the username with the full name when one is set
function userLabel(u) {
    const name = [u.fname, u.lname].filter(Boolean).join(' ');
    return name ? `${u.uname} (${name})` : u.uname;
}

// renderManagersTab returns the static HTML shell for the managers tab
export function renderManagersTab() {
    return `
        <div class="kp-card uk-padding uk-margin-top" id="managers-panel">
            <h3 class="kp-view-title uk-margin-bottom">Managers</h3>
            <p class="kp-muted uk-text-small uk-margin-small-bottom">
                Assigned managers have the same rights as the site owner on this site.
            </p>
            <p class="uk-text-small uk-margin-small-bottom">
                <span class="kp-label">Owner</span>&nbsp;<span id="mgr-owner">-</span>
            </p>
            <label class="kp-label" for="mgr-select">Assigned Managers</label>
            <select multiple class="uk-select kp-select" id="mgr-select" size="8"></select>
            <p class="kp-muted uk-text-small uk-margin-small-top">Hold Ctrl or Cmd to select more than one.</p>
            <div class="uk-flex uk-flex-right uk-margin-top">
                <button class="uk-button kp-btn-primary kp-btn-sm" id="mgr-save">
                    <span uk-icon="check"></span> Save Managers
                </button>
            </div>
        </div>`;
}

// loadManagersTab fetches the assignments and the user list and populates the panel
export async function loadManagersTab(root, id) {
    const panel = root.querySelector('#managers-panel');
    if (!panel) return;

    try {
        const [assigned, users] = await Promise.all([
            api.get(`/sites/${id}/managers`),
            api.get('/users'),
        ]);
        const all = Array.isArray(users) ? users : [];

        // the owner is shown as a fixed entry and never offered in the picker
        const owner = all.find(u => u.id === assigned.owner_id);
        panel.querySelector('#mgr-owner').textContent = owner ? userLabel(owner) : `User ${assigned.owner_id}`;

        // only active manager-role users can be assigned
        const picked = new Set(assigned.uids ?? []);
        panel.querySelector('#mgr-select').innerHTML = all
            .filter(u => u.role === roleManager && !u.blocked && u.id !== assigned.owner_id)
            .map(u => `<option value="${u.id}" ${picked.has(u.id) ? 'selected' : ''}>${escapeHtml(userLabel(u))}</option>`)
            .join('');
    } catch (e) {
        toast.error('Failed to load site managers: ' + e.message);
    }
}

// wireManagersTab attaches the save handler to the managers panel
export function wireManagersTab(root, id) {
    root.querySelector('#mgr-save')?.addEventListener('click', async () => {
        const uids = [...root.querySelectorAll('#mgr-select option:checked')].map(o => parseInt(o.value, 10));
        try {
            await api.put(`/sites/${id}/managers`, { uids });
            toast.success('Site managers saved');
        } catch (e) {
            toast.error(e.message);
        }
    });
}
