// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { normalizeUser } from '../helpers.js';
import { router } from '../router.js';
import { toast } from '../toast.js';
import { renderQR, showBackupCodes } from '../totp.js';

export async function showEditUserModal(root, uid) {
    // Remove any stale instance before opening a new one
    document.getElementById("kp-edit-user-modal")?.remove();

    let user;
    try {
        user = normalizeUser(await api.get(`/users/${uid}`));
    } catch (e) { toast.error(e.message); return; }

    const isAdmin = window.KP?.user?.role === 99;

    const html = `
        <div id="kp-edit-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">Edit User — ${user.uname}</h3>
                <form id="edit-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        ${isAdmin ? `
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" value="${user.uname}" autocomplete="off">
                        </div>` : ""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" value="${user.fname}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" value="${user.lname}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" value="${user.email}" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel" value="${user.phone || ""}" required>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label uk-margin-small-bottom">Notifications</label>
                            <div class="uk-flex" style="gap:24px">
                                <label><input class="uk-checkbox" type="checkbox" name="notify_email" ${user.notify_email ? "checked" : ""}> &nbsp;Email</label>
                                <label><input class="uk-checkbox" type="checkbox" name="notify_sms" ${user.notify_sms ? "checked" : ""}> &nbsp;SMS</label>
                            </div>
                        </div>
                        ${isAdmin ? `
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Role</label>
                            <select class="uk-select kp-select" name="role">
                                <option value="50" ${user.role===50?"selected":""}>Manager</option>
                                <option value="99" ${user.role===99?"selected":""}>Admin</option>
                            </select>
                        </div>` : ""}
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">New Password</label>
                            <input class="uk-input kp-input" name="password" type="password" placeholder="••••••••" uk-tooltip="leave blank to keep">
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Save Changes</button>
                    </div>
                </form>

                <hr class="uk-divider-muted uk-margin-top">

                <div id="totp-section">
                    <h4 class="uk-margin-small-bottom kp-view-title">Two-Factor Authentication</h4>
                    ${user.totp_enabled
                        ? `<div class="uk-flex uk-flex-middle" style="gap:12px">
                            <span class="kp-badge kp-badge-admin" style="font-size:0.75rem">Enabled</span>
                            <button id="totp-disable-btn" class="uk-button kp-btn-secondary kp-btn-sm">Disable TOTP</button>
                           </div>`
                        : `<div class="uk-flex uk-flex-middle" style="gap:12px">
                            <span class="kp-badge kp-badge-manager" style="font-size:0.75rem">Disabled</span>
                            <button id="totp-setup-btn" class="uk-button kp-btn-primary kp-btn-sm">Enable TOTP</button>
                           </div>`
                    }
                    <div id="totp-setup-area" style="display:none" class="uk-margin-top">
                        <p class="kp-muted uk-text-small">Scan the QR code with your authenticator app, then enter the 6-digit code to activate.</p>
                        <div class="uk-text-center uk-margin-small" id="totp-qr-wrap">
                            <img id="totp-qr-img" style="display:none;width:220px;height:220px;border-radius:6px" alt="TOTP QR Code">
                        </div>
                        <p class="kp-muted uk-text-small uk-text-center uk-margin-remove-top">
                            Manual key: <code id="totp-secret-text" style="word-break:break-all"></code>
                        </p>
                        <div class="uk-flex" style="gap:8px;margin-top:8px">
                            <input class="uk-input kp-input" id="totp-confirm-code" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="letter-spacing:0.2em">
                            <button id="totp-confirm-btn" class="uk-button kp-btn-primary" style="white-space:nowrap">Confirm &amp; Enable</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML("beforeend", html);
    const modal = UIkit.modal("#kp-edit-user-modal");
    modal.show();

    // wire main form submit
    document.getElementById("edit-user-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn  = e.target.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Saving...';

        const fd   = new FormData(e.target);
        const body = {
            fname:        fd.get("fname").trim(),
            lname:        fd.get("lname").trim(),
            email:        fd.get("email").trim(),
            phone:        fd.get("phone").trim(),
            notify_email: fd.get("notify_email") === "on",
            notify_sms:   fd.get("notify_sms") === "on",
        };
        if (isAdmin) {
            body.role = parseInt(fd.get("role"));
            const uname = fd.get("uname");
            if (uname) body.uname = uname.trim();
        }
        const pw = fd.get("password");
        if (pw) body.password = pw;

        try {
            await api.put(`/users/${uid}`, body);
            modal.hide();
            document.getElementById("kp-edit-user-modal")?.remove();
            toast.success("User updated");
            router.go("users");
        } catch (err) {
            toast.error(err.message);
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    // wire TOTP setup button
    const setupBtn = document.getElementById("totp-setup-btn");
    if (setupBtn) {
        setupBtn.addEventListener("click", async () => {
            setupBtn.disabled = true;
            setupBtn.textContent = "Setting up…";
            try {
                const data = await api.post(`/users/${uid}/totp/setup`, {});
                document.getElementById("totp-secret-text").textContent = data.secret;
                document.getElementById("totp-setup-area").style.display = "";
                await renderQR(data.uri);
            } catch (err) {
                toast.error(err.message);
                setupBtn.disabled = false;
                setupBtn.textContent = "Enable TOTP";
            }
        });
    }

    // wire TOTP confirm button
    const confirmBtn = document.getElementById("totp-confirm-btn");
    if (confirmBtn) {
        confirmBtn.addEventListener("click", async () => {
            const code = document.getElementById("totp-confirm-code").value.trim();
            if (code.length !== 6) { toast.error("Enter a 6-digit code"); return; }
            confirmBtn.disabled = true;
            try {
                const data = await api.post(`/users/${uid}/totp/confirm`, { code });
                modal.hide();
                document.getElementById("kp-edit-user-modal")?.remove();
                toast.success("TOTP enabled");
                if (data.backup_codes?.length) {
                    showBackupCodes(data.backup_codes);
                } else {
                    router.go("users");
                }
            } catch (err) {
                toast.error(err.message);
                confirmBtn.disabled = false;
            }
        });
    }

    // wire TOTP disable button
    const disableBtn = document.getElementById("totp-disable-btn");
    if (disableBtn) {
        disableBtn.addEventListener("click", async () => {
            disableBtn.disabled = true;
            try {
                await api.delete(`/users/${uid}/totp`);
                toast.success("TOTP disabled");
                modal.hide();
                document.getElementById("kp-edit-user-modal")?.remove();
                router.go("users");
            } catch (err) {
                toast.error(err.message);
                disableBtn.disabled = false;
            }
        });
    }

    document.getElementById("kp-edit-user-modal")
        .addEventListener("hidden", () => document.getElementById("kp-edit-user-modal")?.remove());
}

