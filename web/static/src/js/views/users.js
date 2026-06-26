// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { confirm, errorState, isAdmin, normalizeUser } from '../helpers.js';
import { showCreateUserModal } from '../modals/create-user.js';
import { showEditUserModal } from '../modals/edit-user.js';
import { toast } from '../toast.js';

export async function viewUsers(root) {
    if (!isAdmin()) { root.innerHTML = errorState("Access denied"); return; }

    const users = await api.get("/users");

    root.innerHTML = `
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Users</h1>
            <button class="uk-button kp-btn-primary" id="users-new-btn">
                <span uk-icon="plus"></span> New User
            </button>
        </div>
        <div class="kp-table-wrap">
            <table class="uk-table uk-table-divider uk-table-middle uk-table-responsive uk-margin-remove">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th class="uk-text-center">2FA</th>
                        <th class="uk-text-center">Notify</th>
                        <th>Created</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="users-table-body">
                    ${users.map((u) => userRow(normalizeUser(u))).join("")}
                </tbody>
            </table>
        </div>`;

    document.getElementById("users-new-btn")
        .addEventListener("click", () => showCreateUserModal(root));
    wireUserActions(root);
}

export function userRow(u) {
    const roleTag = u.role === 99
        ? `<span class="kp-badge kp-badge-admin">Admin</span>`
        : `<span class="kp-badge kp-badge-manager">Manager</span>`;
    const notifyIcons = [
        u.notify_email ? `<span uk-icon="icon: mail; ratio: 0.85" uk-tooltip="Email notifications on" style="color:var(--kp-success)"></span>` : `<span uk-icon="icon: mail; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="Email notifications off"></span>`,
        u.notify_sms   ? `<span uk-icon="icon: receiver; ratio: 0.85" uk-tooltip="SMS notifications on" style="color:var(--kp-success)"></span>` : `<span uk-icon="icon: receiver; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="SMS notifications off"></span>`,
    ].join(" ");
    return `<tr data-user-id="${u.id}">
        <td><strong>${u.fname} ${u.lname}</strong></td>
        <td><span style="font-family:monospace">${u.uname}</span></td>
        <td>${u.email}</td>
        <td>${roleTag}</td>
        <td class="uk-text-center">${u.totp_enabled
            ? `<span uk-icon="icon: check; ratio: 0.9" style="color:var(--kp-success)"></span>`
            : `<span uk-icon="icon: close; ratio: 0.9" style="color:var(--kp-text-dim)"></span>`
        }</td>
        <td class="uk-text-center">${notifyIcons}</td>
        <td><span class="kp-muted">${u.created}</span></td>
        <td>
            <div class="uk-flex" style="gap:6px;justify-content:flex-end">
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit-user" data-uid="${u.id}" title="Edit" uk-tooltip="Edit the User">
                    <span uk-icon="icon: pencil;"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="delete-user" data-uid="${u.id}" title="Delete" uk-tooltip="Delete the User">
                    <span uk-icon="icon: trash;"></span>
                </button>
            </div>
        </td>
    </tr>`;
}

function wireUserActions(root) {
    root.addEventListener("click", async (e) => {
        const btn = e.target.closest('[data-action="delete-user"]');
        if (!btn) return;
        const ok = await confirm("Delete User", "Delete this user? This cannot be undone.");
        if (!ok) return;
        try {
            await api.delete(`/users/${btn.dataset.uid}`);
            btn.closest("tr").remove();
            toast.success("User deleted");
        } catch (e) { toast.error(e.message); }
    });

    root.addEventListener("click", async (e) => {
        const btn = e.target.closest('[data-action="edit-user"]');
        if (!btn) return;
        showEditUserModal(root, btn.dataset.uid);
    });
}
