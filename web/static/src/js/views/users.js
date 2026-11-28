// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { cardRow, confirm, errorState, escapeHtml, isAdmin, normalizeUser } from '../helpers.js';
import { showCreateUserModal } from '../modals/create-user.js';
import { showEditUserModal } from '../modals/edit-user.js';
import { toast } from '../toast.js';

export async function viewUsers(root, params, signal) {
    if (!isAdmin()) { root.innerHTML = errorState("Access denied"); return; }

    const users = await api.get("/users");

    if (signal?.aborted) return;

    root.innerHTML = `
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Users</h1>
            <button class="uk-button kp-btn-primary" id="users-new-btn">
                <span uk-icon="plus"></span> New User
            </button>
        </div>
        <div class="kp-list-grid" id="users-grid">
            ${users.map((u) => userCard(normalizeUser(u))).join("")}
        </div>`;

    document.getElementById("users-new-btn")
        .addEventListener("click", () => showCreateUserModal(root));
    wireUserActions(root);
}

export function userCard(u) {
    const roleTag = u.role === 99
        ? `<span class="kp-badge kp-badge-admin">Admin</span>`
        : `<span class="kp-badge kp-badge-manager">Manager</span>`;
    const notifyIcons = [
        u.notify_email ? `<span uk-icon="icon: mail; ratio: 0.85" uk-tooltip="Email notifications on" style="color:var(--kp-success)"></span>` : `<span uk-icon="icon: mail; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="Email notifications off"></span>`,
        u.notify_sms ? `<span uk-icon="icon: receiver; ratio: 0.85" uk-tooltip="SMS notifications on" style="color:var(--kp-success)"></span>` : `<span uk-icon="icon: receiver; ratio: 0.85" style="color:var(--kp-text-dim)" uk-tooltip="SMS notifications off"></span>`,
    ].join(" ");
    const initials = `${u.fname?.[0] ?? ""}${u.lname?.[0] ?? ""}`.toUpperCase();

    return `<div class="kp-list-card" data-user-id="${u.id}">
        <!-- avatar + full name -->
        <div class="kp-list-card-header">
            <span class="kp-list-card-avatar">${escapeHtml(initials)}</span>
            <span class="kp-list-card-title">${escapeHtml(u.fname)} ${escapeHtml(u.lname)}</span>
        </div>

        <!-- details -->
        <div class="kp-list-card-body">
            ${cardRow("Username", escapeHtml(u.uname), "kp-mono")}
            ${cardRow("Email", escapeHtml(u.email))}
            ${cardRow("Role", `${roleTag}${u.node_uid > 0 ? ` <span class="kp-badge kp-badge-manager" uk-tooltip="Synced from the parent node">Synced</span>` : ""}${u.blocked ? ` <span class="kp-status kp-status-error">Blocked</span>` : ""}`, "kp-list-card-value-wrap")}
            ${cardRow("2FA", u.totp_enabled
                ? `<span uk-icon="icon: check; ratio: 0.9" style="color:var(--kp-success)"></span>`
                : `<span uk-icon="icon: close; ratio: 0.9" style="color:var(--kp-text-dim)"></span>`)}
            ${cardRow("Notify", notifyIcons)}
            ${cardRow("Created", escapeHtml(u.created), "kp-muted kp-mono")}
        </div>

        <!-- action buttons -->
        <div class="kp-list-card-actions">
            <span class="kp-list-card-spacer"></span>
            ${u.node_uid > 0 && u.id !== window.KP.user.id ? `
            <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="toggle-block-user" data-uid="${u.id}" data-blocked="${u.blocked ? 1 : 0}" uk-tooltip="${u.blocked ? "Unblock" : "Block"} the User">
                <span uk-icon="icon: ${u.blocked ? "unlock" : "lock"};"></span>
            </button>` : ""}
            <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="edit-user" data-uid="${u.id}" title="Edit" uk-tooltip="Edit the User">
                <span uk-icon="icon: pencil;"></span>
            </button>
            <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="delete-user" data-uid="${u.id}" title="Delete" uk-tooltip="Delete the User">
                <span uk-icon="icon: trash;"></span>
            </button>
        </div>
    </div>`;
}

function wireUserActions(root) {
    root.addEventListener("click", async (e) => {
        const btn = e.target.closest('[data-action="delete-user"]');
        if (!btn) return;
        const ok = await confirm("Delete User", "Delete this user? This cannot be undone.");
        if (!ok) return;
        try {
            await api.delete(`/users/${btn.dataset.uid}`);
            btn.closest(".kp-list-card").remove();
            toast.success("User deleted");
        } catch (e) { toast.error(e.message); }
    });

    root.addEventListener("click", async (e) => {
        const btn = e.target.closest('[data-action="edit-user"]');
        if (!btn) return;
        showEditUserModal(root, btn.dataset.uid);
    });

    root.addEventListener("click", async (e) => {
        const btn = e.target.closest('[data-action="toggle-block-user"]');
        if (!btn) return;
        const blocked = btn.dataset.blocked !== "1";
        const ok = await confirm(
            blocked ? "Block User" : "Unblock User",
            blocked
                ? "Block this synced user? They are signed out here and can no longer sign in to this node from the parent."
                : "Unblock this synced user?"
        );
        if (!ok) return;
        try {
            await api.put(`/users/${btn.dataset.uid}/blocked`, { blocked });
            const fresh = normalizeUser(await api.get(`/users/${btn.dataset.uid}`));
            btn.closest(".kp-list-card").outerHTML = userCard(fresh);
            toast.success(blocked ? "User blocked" : "User unblocked");
        } catch (e) { toast.error(e.message); }
    });
}
