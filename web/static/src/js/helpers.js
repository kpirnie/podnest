"use strict";

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
                    This may take several minutes while images are pulled and containers are initialized.
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
