"use strict";

import { spinner, errorState } from './helpers.js';

export const router = {
    routes: {},
    register(name, fn) { this.routes[name] = fn; },
    async go(view, params = {}) {
        const hash = Object.keys(params).length
            ? view + "/" + Object.values(params).join("/")
            : view;
        window.location.hash = hash;

        document.querySelectorAll(".kp-nav-link").forEach((el) => {
            el.classList.toggle("kp-active", el.dataset.view === view);
        });

        const fn = this.routes[view];
        if (!fn) return;
        const el = document.getElementById("kp-view");
        el.innerHTML = spinner();
        try {
            await fn(el, params);
        } catch (e) {
            el.innerHTML = errorState(e.message);
        }
    },
};

export function parseHash() {
    const raw   = window.location.hash.replace("#", "") || "dashboard";
    const parts = raw.split("/");
    const view  = parts[0];
    const params = {};
    if (view === "site-detail" && parts[1]) params.id = parts[1];
    return { view, params };
}
