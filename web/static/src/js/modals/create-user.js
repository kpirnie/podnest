"use strict";

import { api } from '../api.js';
import { normalizeUser } from '../helpers.js';
import { router } from '../router.js';
import { toast } from '../toast.js';
import { renderQR, showBackupCodes } from '../totp.js';
import { userRow } from '../views/users.js';

export function showCreateUserModal(root) {
    const html = `
        <div id="kp-create-user-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">New User</h3>
                <form id="create-user-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">First Name</label>
                            <input class="uk-input kp-input" name="fname" type="text" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Last Name</label>
                            <input class="uk-input kp-input" name="lname" type="text" required>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label">Username</label>
                            <input class="uk-input kp-input" name="uname" type="text" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Email</label>
                            <input class="uk-input kp-input" name="email" type="email" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Phone</label>
                            <input class="uk-input kp-input" name="phone" type="tel">
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Password</label>
                            <input class="uk-input kp-input" name="password" type="password" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Role</label>
                            <select class="uk-select kp-select" name="role">
                                <option value="50">Manager</option>
                                <option value="99">Admin</option>
                            </select>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">Create User</button>
                    </div>
                </form>

                <div id="cu-totp-section" style="display:none">
                    <hr class="uk-divider-muted uk-margin-top">
                    <h4 class="uk-margin-small-bottom kp-view-title">Two-Factor Authentication</h4>
                    <div class="uk-flex uk-flex-middle" style="gap:12px">
                        <span class="kp-badge kp-badge-manager" style="font-size:0.75rem">Disabled</span>
                        <button id="cu-totp-setup-btn" class="uk-button kp-btn-primary kp-btn-sm">Enable TOTP</button>
                    </div>
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
                            <button id="cu-totp-confirm-btn" class="uk-button kp-btn-primary" style="white-space:nowrap">Confirm &amp; Enable</button>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top">
                        <button id="cu-totp-skip-btn" class="uk-button kp-btn-ghost">Skip for now</button>
                    </div>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML("beforeend", html);
    const modal = UIkit.modal("#kp-create-user-modal");
    modal.show();

    document.getElementById("create-user-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn  = e.target.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Creating...';

        const fd   = new FormData(e.target);
        const body = {
            fname:    fd.get("fname").trim(),
            lname:    fd.get("lname").trim(),
            uname:    fd.get("uname").trim(),
            email:    fd.get("email").trim(),
            phone:    fd.get("phone").trim(),
            password: fd.get("password"),
            role:     parseInt(fd.get("role")),
        };
        try {
            const u = normalizeUser(await api.post("/users", body));
            document.getElementById("users-table-body")
                .insertAdjacentHTML("beforeend", userRow(u));
            toast.success(`User '${u.uname}' created`);

            // hide the form, show TOTP setup section
            document.getElementById("create-user-form").style.display = "none";
            document.getElementById("cu-totp-section").style.display = "";
            wireTOTP(u.id, modal);
        } catch (err) {
            toast.error(err.message);
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    document.getElementById("kp-create-user-modal")
        .addEventListener("hidden", () => document.getElementById("kp-create-user-modal")?.remove());
}

function wireTOTP(uid, modal) {
    const close = () => {
        modal.hide();
        document.getElementById("kp-create-user-modal")?.remove();
        router.go("users");
    };

    document.getElementById("cu-totp-skip-btn").addEventListener("click", close);

    document.getElementById("cu-totp-setup-btn").addEventListener("click", async () => {
        const btn = document.getElementById("cu-totp-setup-btn");
        btn.disabled = true;
        btn.textContent = "Setting up…";
        try {
            const data = await api.post(`/users/${uid}/totp/setup`, {});
            document.getElementById("totp-secret-text").textContent = data.secret;
            document.getElementById("totp-setup-area").style.display = "";
            document.getElementById("cu-totp-skip-btn").style.display = "none";
            await renderQR(data.uri);
        } catch (err) {
            toast.error(err.message);
            btn.disabled = false;
            btn.textContent = "Enable TOTP";
        }
    });

    document.getElementById("cu-totp-confirm-btn").addEventListener("click", async () => {
        const code = document.getElementById("totp-confirm-code").value.trim();
        if (code.length !== 6) { toast.error("Enter a 6-digit code"); return; }
        const btn = document.getElementById("cu-totp-confirm-btn");
        btn.disabled = true;
        try {
            const data = await api.post(`/users/${uid}/totp/confirm`, { code });
            modal.hide();
            document.getElementById("kp-create-user-modal")?.remove();
            toast.success("TOTP enabled");
            if (data.backup_codes?.length) {
                showBackupCodes(data.backup_codes);
            } else {
                router.go("users");
            }
        } catch (err) {
            toast.error(err.message);
            btn.disabled = false;
        }
    });
}
