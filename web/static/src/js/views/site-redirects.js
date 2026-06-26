// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { toast } from '../toast.js';

// renderRedirectsTab returns the static HTML shell for the redirects tab
export function renderRedirectsTab() {
    return `
        <div class="kp-card uk-padding uk-margin-top">
            <h3 class="kp-view-title uk-margin-bottom">Redirects</h3>
            <p class="kp-muted uk-text-small uk-margin-small-bottom">
                Rules are evaluated in order. The first matching source wins.
                Source is a path (e.g. <code>/old-page</code>) or a regular expression (e.g. <code>^/blog/(\d+)$</code>). Target is a full URL or path.
            </p>
            <div id="redirects-list" class="uk-margin-small-bottom"></div>
            <div class="uk-flex uk-flex-middle uk-margin-small-top" style="gap:8px">
                <button type="button" class="uk-button kp-btn-ghost uk-button-small" id="redirect-add-btn">
                    <span uk-icon="plus"></span> Add Rule
                </button>
            </div>
            <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                <button type="button" class="uk-button kp-btn-primary" id="redirect-save-btn">
                    <span uk-icon="check"></span> Save
                </button>
            </div>
        </div>`;
}

// renderRedirectRow returns a single editable redirect rule row
function renderRedirectRow(source = '', target = '', code = 301) {
    return `
        <div class="redirect-row uk-flex uk-flex-middle uk-margin-small-bottom" style="gap:8px">
            <input class="uk-input kp-input redirect-source" type="text" placeholder="/old-path" value="${source}" style="flex:1">
            <input class="uk-input kp-input redirect-target" type="text" placeholder="https://example.com/new-path" value="${target}" style="flex:2">
            <select class="uk-select kp-select redirect-code" style="width:90px">
                <option value="301" ${code === 301 ? 'selected' : ''}>301</option>
                <option value="302" ${code === 302 ? 'selected' : ''}>302</option>
                <option value="307" ${code === 307 ? 'selected' : ''}>307</option>
                <option value="308" ${code === 308 ? 'selected' : ''}>308</option>
            </select>
            <a href="javascript:void(0);" class="kp-muted redirect-remove-btn" uk-icon="trash"></a>
        </div>`;
}

// loadRedirectsTab fetches existing redirects and populates the editor
export async function loadRedirectsTab(id) {
    const list = document.getElementById('redirects-list');
    if (!list) return;
    list.innerHTML = '';
    const redirects = await api.get(`/sites/${id}/redirects`);
    list.innerHTML = redirects.map(rd => renderRedirectRow(rd.Source, rd.Target, rd.Code)).join('');
}

// wireRedirectsTab binds add-row, remove-row, and save actions
export function wireRedirectsTab(root, id) {
    const ac = new AbortController();
    const opts = { signal: ac.signal };

    root.addEventListener('click', e => {
        if (e.target.closest('#redirect-add-btn')) {
            document.getElementById('redirects-list').insertAdjacentHTML('beforeend', renderRedirectRow());
        }
        if (e.target.closest('.redirect-remove-btn')) {
            e.target.closest('.redirect-row').remove();
        }
    }, opts);

    root.addEventListener('click', async e => {
        if (!e.target.closest('#redirect-save-btn')) return;
        const redirects = [...document.querySelectorAll('.redirect-row')].map(row => ({
            Source: row.querySelector('.redirect-source').value.trim(),
            Target: row.querySelector('.redirect-target').value.trim(),
            Code:   parseInt(row.querySelector('.redirect-code').value, 10),
        }));
        try {
            await api.put(`/sites/${id}/redirects`, redirects);
            toast.success('Redirects saved');
        } catch (err) {
            toast.error(err.message || 'Failed to save redirects');
        }
    }, opts);

    // abort all listeners when navigating away
    root.__redirectsAbort?.abort();
    root.__redirectsAbort = ac;
}