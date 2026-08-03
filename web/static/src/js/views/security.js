// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { errorState, isAdmin } from '../helpers.js';
import { loadSecurityPanel, renderSecurityPanel, wireSecurityPanel } from './site-security.js';

export async function viewSecurity(root) {
    if (!isAdmin()) { root.innerHTML = errorState("Access denied"); return; }

    root.innerHTML = `
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Global Security</h1>
        </div>
        <p class="kp-muted uk-text-small uk-margin-bottom">
            Global rules apply to all sites before per-site rules are evaluated.
            Blacklist always wins — except for IP rules, where a whitelist match
            in either scope allows the request outright.
        </p>
        ${renderSecurityPanel(null)}`;

    wireSecurityPanel(root);
    loadSecurityPanel(root);
}