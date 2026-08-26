// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { escapeHtml } from '../helpers.js';
import { toast } from '../toast.js';

// renderBasicAuthTab returns the static HTML shell for the basic auth tab
export function renderBasicAuthTab() {
    return `
        <div class="kp-card uk-padding uk-margin-top" id="basicauth-panel">
            <h3 class="kp-view-title uk-margin-bottom">Basic Auth</h3>
            <p class="kp-muted uk-text-small uk-margin-small-bottom">
                Enforced at the proxy level — no nginx involvement. All requests to this
                site will require valid credentials before any content is served.
            </p>

            <div class="uk-grid-small uk-margin-bottom" uk-grid>
                <div class="uk-width-1-2@s">
                    <label class="kp-label">
                        <input class="uk-checkbox" type="checkbox" id="ba-enabled">
                        &nbsp;Enable Basic Auth
                    </label>
                </div>
                <div class="uk-width-1-2@s">
                    <label class="kp-label" for="ba-realm">Realm</label>
                    <input class="uk-input kp-input" type="text" id="ba-realm" placeholder="Restricted">
                </div>
            </div>

            <div class="uk-flex uk-flex-right uk-margin-bottom">
                <button class="uk-button kp-btn-primary kp-btn-sm" id="ba-config-save">
                    <span uk-icon="check"></span> Save Settings
                </button>
            </div>

            <hr class="kp-divider">

            <h4 class="kp-label uk-margin-small-bottom">Credentials</h4>
            <div id="ba-users-list" class="uk-margin-small-bottom"></div>

            <div class="uk-grid-small uk-margin-small-top" uk-grid>
                <div class="uk-width-1-3@s">
                    <input class="uk-input kp-input" type="text" id="ba-new-username" placeholder="Username">
                </div>
                <div class="uk-width-1-3@s">
                    <input class="uk-input kp-input" type="password" id="ba-new-password" placeholder="Password">
                </div>
                <div class="uk-width-1-3@s">
                    <button class="uk-button kp-btn-ghost" id="ba-add-user">
                        <span uk-icon="plus"></span> Add / Update
                    </button>
                </div>
            </div>
        </div>`;
}

// loadBasicAuthTab fetches the current config and credential list and populates the panel
export async function loadBasicAuthTab(id) {
    const panel = document.getElementById('basicauth-panel');
    if (!panel) return;

    try {
        const [cfg, users] = await Promise.all([
            api.get(`/sites/${id}/basicauth`),
            api.get(`/sites/${id}/basicauth/users`),
        ]);

        const enabled = panel.querySelector('#ba-enabled');
        const realm   = panel.querySelector('#ba-realm');
        if (enabled) enabled.checked = !!cfg.Enabled;
        if (realm)   realm.value     = cfg.Realm ?? 'Restricted';

        renderUserList(panel, users ?? []);
    } catch (e) {
        toast.error('Failed to load basic auth settings: ' + e.message);
    }
}

// renderUserList replaces the users list with current credential entries
function renderUserList(panel, users) {
    const list = panel.querySelector('#ba-users-list');
    if (!list) return;

    if (!users.length) {
        list.innerHTML = `<p class="kp-muted uk-text-small">No credentials configured.</p>`;
        return;
    }

    list.innerHTML = users.map(u => `
        <div class="uk-flex uk-flex-middle uk-margin-small-bottom ba-user-row" data-uid="${u.id}" style="gap:8px">
            <span class="kp-mono" style="flex:1">${escapeHtml(u.username)}</span>
            <a href="javascript:void(0);" class="kp-muted ba-delete-btn" uk-icon="trash" uk-tooltip="Remove credential"></a>
        </div>`).join('');
}

// wireBasicAuthTab attaches all event handlers for the basic auth panel
export function wireBasicAuthTab(root, id) {
    const ac   = new AbortController();
    const opts = { signal: ac.signal };

    // save config (enabled flag + realm)
    root.addEventListener('click', async (e) => {
        if (!e.target.closest('#ba-config-save')) return;
        const btn  = root.querySelector('#ba-config-save');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await api.put(`/sites/${id}/basicauth`, {
                enabled: root.querySelector('#ba-enabled').checked,
                realm:   root.querySelector('#ba-realm').value.trim() || 'Restricted',
            });
            toast.success('Basic auth settings saved');
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled  = false;
            btn.innerHTML = orig;
        }
    }, opts);

    // add or update a credential
    root.addEventListener('click', async (e) => {
        if (!e.target.closest('#ba-add-user')) return;
        const username = root.querySelector('#ba-new-username').value.trim();
        const password = root.querySelector('#ba-new-password').value;
        if (!username || !password) {
            toast.error('Username and password are required');
            return;
        }
        const btn  = root.querySelector('#ba-add-user');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await api.put(`/sites/${id}/basicauth/users`, { username, password });
            toast.success(`Credential saved for ${username}`);
            root.querySelector('#ba-new-username').value = '';
            root.querySelector('#ba-new-password').value = '';
            await loadBasicAuthTab(id);
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled  = false;
            btn.innerHTML = orig;
        }
    }, opts);

    // delete a credential row
    root.addEventListener('click', async (e) => {
        const btn = e.target.closest('.ba-delete-btn');
        if (!btn) return;
        const uid = btn.closest('.ba-user-row')?.dataset.uid;
        if (!uid) return;
        try {
            await api.delete(`/sites/${id}/basicauth/users/${uid}`);
            toast.success('Credential removed');
            await loadBasicAuthTab(id);
        } catch (err) {
            toast.error(err.message);
        }
    }, opts);

    // abort all listeners when navigating away
    root.__basicAuthAbort?.abort();
    root.__basicAuthAbort = ac;
}