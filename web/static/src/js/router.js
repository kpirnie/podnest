// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { errorState, spinner } from './helpers.js';

export const router = {
    routes: {},
    // prevents the hashchange we fire ourselves from re-invoking the view
    _ownHashChange: false,
    register(name, render, teardown) { this.routes[name] = { render, teardown }; },
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

        // sync bottom nav "More" menu, highlighting More when the view lives in it
        const moreLinks = [...document.querySelectorAll(".kp-bn-more-menu a[data-view]")];
        moreLinks.forEach((el) => el.classList.toggle("kp-dd-active", el.dataset.view === view));
        document.getElementById("kp-bn-more")
            ?.classList.toggle("kp-active", moreLinks.some((el) => el.dataset.view === view));

        const route = this.routes[view];
        if (!route) return;
        this._navigation?.abort();
        this._teardown?.();
        const navigation = new AbortController();
        this._navigation = navigation;
        this._teardown = route.teardown;
        const el = document.getElementById("kp-view");

        // destroy traffic charts before replacing the view
        if (window.Chart) {
            el.querySelectorAll('canvas[id^="site-traffic-"]').forEach(canvas => {
                window.Chart.getChart(canvas)?.destroy();
            });
        }

        el.innerHTML = spinner();
        try {
            await route.render(el, params, navigation.signal);
        } catch (e) {
            if (!navigation.signal.aborted) el.innerHTML = errorState(e.message);
        }
    },
};

export function parseHash() {
    const raw   = window.location.hash.replace("#", "") || "dashboard";
    const parts = raw.split("/");
    const view  = parts[0];
    const params = {};
    if (view === "site-detail" && parts[1]) params.id = parts[1];
    if (view === "settings" && parts[1]) params.tab = parts[1];
    if (view === "site-detail" && parts[2]) params.tab = parts[2];
    if (view === "security" && parts[1]) params.tab = parts[1];
    if (view === "waf" && parts[1]) params.tab = parts[1];
    return { view, params };
}
