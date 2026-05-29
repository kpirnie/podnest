"use strict";

import { errorState, spinner } from './helpers.js';

export const router = {
    routes: {},
    // prevents the hashchange we fire ourselves from re-invoking the view
    _ownHashChange: false,
    register(name, fn) { this.routes[name] = fn; },
    async go(view, params = {}) {
        const hash = Object.keys(params).length
            ? view + "/" + Object.values(params).join("/")
            : view;

        // mark before setting hash so the resulting hashchange event is ignored;
        // setTimeout(0) fires as the next macrotask — after hashchange — to reset the flag
        this._ownHashChange = true;
        window.location.hash = hash;
        setTimeout(() => { this._ownHashChange = false; }, 0);

        document.querySelectorAll(".kp-nav-link").forEach((el) => {
            el.classList.toggle("kp-active", el.dataset.view === view);
        });

        // sync bottom nav active state
        document.querySelectorAll(".kp-bn-item[data-view]").forEach((el) => {
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
