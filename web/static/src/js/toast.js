"use strict";

import { escapeHtml } from "./helpers.js";

export const toast = {
    show(msg, type = "info", duration = 7000) {
        const icons = { success: "check", error: "warning", info: "info" };
        const el = document.createElement("div");
        el.className = `kp-toast kp-toast-${type}`;
        el.innerHTML = `<span uk-icon="${icons[type] || "info"}"></span><span>${escapeHtml(msg)}</span>`;
        document.getElementById("kp-toasts").appendChild(el);
        UIkit.icon(el.querySelector("[uk-icon]"));
        setTimeout(() => el.remove(), duration);
    },
    success: (m) => toast.show(m, "success"),
    error:   (m) => toast.show(m, "error"),
    info:    (m) => toast.show(m, "info"),
};
