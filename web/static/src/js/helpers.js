"use strict";

// escapeHtml escapes the HTML-significant characters so dynamic text can be
// interpolated into innerHTML without markup/attribute injection
export const escapeHtml = (s) =>
    String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

export const spinner = () =>
    `<div class="kp-spinner"><div uk-spinner="ratio: 1.25"></div></div>`;

export const errorState = (msg) =>
    `<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: warning; ratio: 2.5"></div>
        <div class="kp-empty-text">${msg}</div>
    </div>`;

export const emptyState = (icon, text) =>
    `<div class="kp-empty">
        <div class="kp-empty-icon" uk-icon="icon: ${icon}; ratio: 2.5"></div>
        <div class="kp-empty-text">${text}</div>
    </div>`;

export const statusBadge = (status) => {
    const map = {
        1: ["running",    "Running"],
        2: ["stopped",    "Stopped"],
        3: ["restarting", "Restarting"],
        4: ["error",      "Error"],
    };
    const [cls, label] = map[status] || ["stopped", "Unknown"];
    return `<span class="kp-status kp-status-${cls}">${label}</span>`;
};

export const phpLabel = (v) =>
    ({ 3: "8.2", 4: "8.3", 5: "8.4", 6: "8.5" })[v] || "?";

export const siteTypeLabel = (t) =>
    ({ 1: "WordPress", 2: "PHP", 3: "Static", 4: "Node.js", 5: ".NET", 6: "Reverse Proxy" })[t] || "?";

export const isAdmin = () => window.KP.user.role === window.KP.roles.admin;

export const versionLabel = (site) => {
    switch (site.SiteType) {
        case 1: case 2: return `PHP ${phpLabel(site.PHPVersion)}`;
        case 4: return `Node ${{ 2: "22", 4: "24", 5: "25", 6: "26" }[site.RuntimeVersion] || "?"}`;
        case 5: return `.NET ${{ 1: "8.0", 2: "9.0", 3: "10.0" }[site.RuntimeVersion] || "?"}`;
        case 6: return "Reverse Proxy";
        default: return "";
    }
};

export const normalizeUser = (u) => ({
    id:           u.id           ?? u.ID,
    uname:        u.uname        ?? u.UName,
    uhash:        u.uhash        ?? u.UHash,
    fname:        u.fname        ?? u.FName,
    lname:        u.lname        ?? u.LName,
    email:        u.email        ?? u.Email,
    phone:        u.phone        ?? u.Phone,
    role:         u.role         ?? u.Role,
    totp_enabled: u.totp_enabled ?? false,
    notify_email: u.notify_email ?? false,
    notify_sms:   u.notify_sms   ?? false,
    created:      u.created      ?? u.Created,
});

export function confirm(title, message) {
    return new Promise((resolve) => {
        document.getElementById("kp-confirm-title").textContent = title;
        document.getElementById("kp-confirm-message").textContent = message;
        const modal = UIkit.modal("#kp-confirm-modal");
        const btn   = document.getElementById("kp-confirm-ok");
        btn.addEventListener("click", () => { modal.hide(); resolve(true); }, { once: true });
        modal.show();
        document.getElementById("kp-confirm-modal")
            .addEventListener("hidden", () => resolve(false), { once: true });
    });
}

export function showProgressModal(title, message) {
    const html = `
        <div id="kp-progress-modal" uk-modal="bg-close: false; esc-close: false; keyboard: false">
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-text-center" style="max-width:420px">
                <div uk-spinner="ratio: 1.5" style="color:var(--kp-blue)"></div>
                <h3 class="uk-modal-title uk-margin-small-top" id="kp-progress-title">${title}</h3>
                <p class="kp-muted uk-text-small" id="kp-progress-message">${message}</p>
                <p class="kp-muted">
                    This may take several minutes while the task(s) complete, make sure to keep screen open until it has completed.
                </p>
            </div>
        </div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    UIkit.modal("#kp-progress-modal").show();
}

export function hideProgressModal() {
    const el = document.getElementById("kp-progress-modal");
    if (el) { UIkit.modal(el).hide(); setTimeout(() => el.remove(), 300); }
}

// showCloneModal prompts for a clone name and resolves with the entered value,
// or null if the user cancelled
export function showCloneModal(sourceName) {
    return new Promise((resolve) => {
        const id  = "kp-clone-modal";
        const html = `
            <div id="${id}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:420px">
                    <h3 class="uk-modal-title">Clone Site</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Enter a name for the clone of <strong>${sourceName}</strong>.
                        Files, database, and configuration will be copied — domains will not.
                    </p>
                    <input id="kp-clone-name" class="uk-input kp-input" type="text"
                        placeholder="clone-name" autocomplete="off">
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-clone-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-clone-ok">
                            <span uk-icon="move"></span> Clone
                        </button>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML("beforeend", html);
        const modal  = UIkit.modal(`#${id}`);
        const input  = document.getElementById("kp-clone-name");
        const okBtn  = document.getElementById("kp-clone-ok");
        const cancel = document.getElementById("kp-clone-cancel");

        const cleanup = (val) => {
            modal.hide();
            setTimeout(() => document.getElementById(id)?.remove(), 300);
            resolve(val);
        };

        okBtn.addEventListener("click", () => cleanup(input.value.trim() || null), { once: true });
        cancel.addEventListener("click", () => cleanup(null), { once: true });

        // resolve null on backdrop/esc dismiss
        document.getElementById(id)
            .addEventListener("hidden", () => cleanup(null), { once: true });

        modal.show();
        // focus the input after the modal animates in
        setTimeout(() => input.focus(), 150);

        // allow submitting with Enter
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") okBtn.click();
        });
    });
}

// showSyncModal prompts the user to confirm a destructive Pull or Push sync
// operation between a clone and its parent site
export function showSyncModal(direction, cloneName, parentName) {
    return new Promise((resolve) => {
        const id       = "kp-sync-modal";
        const isPull   = direction === "pull";
        const title    = isPull ? "Pull From Parent" : "Push To Parent";
        const icon     = isPull ? "cloud-download" : "cloud-upload";
        const srcName  = isPull ? parentName : cloneName;
        const dstName  = isPull ? cloneName  : parentName;
        const html = `
            <div id="${id}" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                    <h3 class="uk-modal-title">${title}</h3>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        This will overwrite all files and database content on
                        <strong>${dstName}</strong> with data from <strong>${srcName}</strong>.
                        This action cannot be undone.
                    </p>
                    <p class="kp-muted uk-text-small" style="color:var(--kp-red, #e05c5c)">
                        <span uk-icon="icon: warning; ratio: 0.85"></span>
                        <strong>${dstName}</strong> will be temporarily unavailable during the sync.
                    </p>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" id="kp-sync-cancel">Cancel</button>
                        <button class="uk-button kp-btn-primary" id="kp-sync-ok">
                            <span uk-icon="${icon}"></span> ${title}
                        </button>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML("beforeend", html);
        const modal  = UIkit.modal(`#${id}`);
        const okBtn  = document.getElementById("kp-sync-ok");
        const cancel = document.getElementById("kp-sync-cancel");

        const cleanup = (val) => {
            modal.hide();
            setTimeout(() => document.getElementById(id)?.remove(), 300);
            resolve(val);
        };

        okBtn.addEventListener("click",    () => cleanup(true),  { once: true });
        cancel.addEventListener("click",   () => cleanup(false), { once: true });
        document.getElementById(id)
            .addEventListener("hidden",    () => cleanup(false), { once: true });

        modal.show();
    });
}
