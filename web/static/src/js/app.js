// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from './api.js';
import { confirm, escapeHtml, hideProgressModal, showProgressModal } from './helpers.js';
import { parseHash, router } from './router.js';
import { toast } from './toast.js';
import { viewAdminLogs } from './views/admin-logs.js';
import { viewAuditLog } from './views/audit-log.js';
import { viewDashboard } from './views/dashboard.js';
import { viewNodes } from './views/nodes.js';
import { viewSecurity } from './views/security.js';
import { viewSettings } from './views/settings.js';
import { viewSiteDetail } from './views/site-detail.js';
import { viewSites } from './views/sites.js';
import { viewUsers } from './views/users.js';
import { viewWAF } from './views/waf.js';

/* -- register routes ------------------------------------------------------- */
router.register("dashboard", (root) => viewDashboard(root));
router.register("sites", (root) => viewSites(root));
router.register("site-detail", (root, params) => viewSiteDetail(root, params));
router.register("users", (root) => viewUsers(root));
router.register("nodes", (root) => viewNodes(root));
router.register("settings", (root, params) => viewSettings(root, params));
router.register("security", (root, params) => viewSecurity(root, params));
router.register("waf", (root, params) => viewWAF(root, params));
router.register("admin-logs", (root) => viewAdminLogs(root));
router.register("audit-log", (root) => viewAuditLog(root));

/* -- protect native caret keys in form fields ------------------------------ */
// UIkit's tab/switcher keyboard nav intercepts arrow keys and preventDefaults
// them; since the panel's forms live inside switcher-connected tab panels, that
// kills caret movement in every field. Stop these keys in the capture phase so
// UIkit never receives them — the browser's default caret behavior then runs.
// The WP-CLI terminal is exempt for Up/Down only, and CodeMirror entirely.
document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (!t?.matches?.("input, textarea, select, [contenteditable='true']")) return;
    // CodeMirror binds its own caret keymap on the editor element, so stopping
    // propagation here would strand it
    if (t.closest?.(".CodeMirror")) return;
    // the WP-CLI terminal owns only Up/Down, for history
    if (t.id === "wpcli-input" && (e.key === "ArrowUp" || e.key === "ArrowDown")) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
        e.stopPropagation();
    }
}, true); // capture — runs before UIkit's handler

/* -- nav wiring ------------------------------------------------------------ */
document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (!link) return;
    e.preventDefault();
    router.go(link.dataset.view);
});

/* -- global site action handler -------------------------------------------- */
document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    e.stopPropagation();
    const { action, id } = btn.dataset;

    switch (action) {
        case "manage":
            router.go("site-detail", { id });
            break;
        case "start":
            await siteAction(id, "start", "Starting Site", "Starting all containers - please wait...");
            break;
        case "stop":
            await siteAction(id, "stop", "Stopping Site", "Gracefully stopping all containers - please wait...");
            break;
        case "restart":
            await siteAction(id, "restart", "Restarting Site", "Restarting all containers - please wait...");
            break;
        case "flush":
            await siteAction(id, "flush", "Flushing Caches", "Clearing container caches - please wait...");
            break;
        case "delete":
            await deleteSite(id);
            break;
        case "recreate":
            showProgressModal("Recreating Pod", "Recreating containers for this site - this may take a few minutes...");
            try {
                await api.post(`/sites/${id}/recreate`, { prune: true });
                hideProgressModal();
                toast.success("Pod recreated");
                router.go("sites");
            } catch (e) {
                hideProgressModal();
                toast.error(e.message);
            }
            break;
    }
});

/* -- bulk site actions ----------------------------------------------------- */
document.addEventListener("kp:bulk-action", async (e) => {
    const { action, ids } = e.detail;
    if (!ids.length) return;

    const labels = { start: "Starting", stop: "Stopping", restart: "Restarting", flush: "Flushing Caches", recreate: "Recreating" };

    // recreate is destructive and slow — its own note, a long per-call ceiling, and a
    // prune flag so the server sweeps dangling images at the tail of each rebuild
    const message = action === "recreate" ? "Please hold while we update your Pods" : "Please wait...";
    const body = action === "recreate" ? { prune: true } : undefined;
    const timeout = action === "recreate" ? 20 * 60 * 1000 : undefined;
    showProgressModal(`${labels[action]} ${ids.length} Site${ids.length !== 1 ? "s" : ""}`, message);

    const results = await Promise.allSettled(
        ids.map(id => api.post(`/sites/${id}/${action}`, body, timeout))
    );

    hideProgressModal();

    const failed = results.filter(r => r.status === "rejected").length;
    if (failed === 0) {
        toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} complete for ${ids.length} site${ids.length !== 1 ? "s" : ""}`);
    } else {
        toast.error(`${failed} of ${ids.length} sites failed — check logs`);
    }

    if (["start", "stop", "restart", "recreate"].includes(action)) router.go("sites");
});

/* -- helpers --------------------------------------------------------------- */
async function siteAction(id, action, title, message) {
    showProgressModal(title, message);
    try {
        await api.post(`/sites/${id}/${action}`);
        hideProgressModal();
        toast.success(title + ' complete');
        // the status badge and start/stop button are baked into the rendered
        // markup — re-render the current view so they reflect the new state
        if (action !== "flush") {
            const { view, params } = parseHash();
            router.go(view, params);
        }
    } catch (e) {
        hideProgressModal();
        toast.error(e.message);
    }
}

async function deleteSite(id) {
    const ok = await confirm("Delete Site", "This will stop and permanently remove the pod and all its data. Are you sure?\n\nA final backup will be created before deletion. This may take a moment.");
    if (!ok) return;

    showProgressModal("Deleting Site", "Creating final backup and removing the pod — please wait...");

    let resp;

    // send CSRF token — raw fetch bypasses api.js which normally adds it
    try { resp = await fetch(`/api/sites/${id}`, { method: "DELETE", headers: { "X-CSRF-Token": window.KP?.csrf ?? "" } }); } catch (e) { /* poll below */ }

    hideProgressModal();

    // browser-download final backup if S3 is not configured
    if (resp?.ok && resp.headers.get("Content-Type")?.includes("gzip")) {
        const cd = resp.headers.get("Content-Disposition") ?? "";
        const name = cd.match(/filename="([^"]+)"/)?.[1] ?? `${id}_final.tar.gz`;
        const blob = await resp.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success("Site deleted. Final backup downloaded.");
        router.go("sites");
        return;
    }

    let gone = false, tries = 0;
    while (!gone && tries < 10) {
        try {
            await new Promise((r) => setTimeout(r, 2000));
            const sites = await api.get("/sites");
            gone = !sites.find((s) => s.ID === parseInt(id));
        } catch (e) { /* transient */ }
        tries++;
    }

    if (gone) { toast.success("Site deleted. Final backup saved to S3."); router.go("sites"); }
    else toast.error("Delete failed - site still exists after 20s");
}

/* -- resource warning banner ----------------------------------------------- */
// only poll for admin users; non-admins never see the banner
if (window.KP?.user?.role === 99) {
    const warningEl = document.getElementById("kp-resource-warning");
    const msgEl = document.getElementById("kp-resource-warning-msg");

    const pollWarning = async () => {
        try {
            const data = await api.get("/settings/resource-warning");
            if (data?.active && warningEl && msgEl) {
                msgEl.textContent = `${data.current_mb}MB used, threshold ${data.threshold_mb}MB — throttling ${data.offender}.`;
                warningEl.style.display = "";
            } else if (warningEl) {
                warningEl.style.display = "none";
            }
        } catch (_) { /* non-fatal — banner stays in last state */ }
    };

    pollWarning();
    setInterval(pollWarning, 30_000);
}

/* -- hash routing ---------------------------------------------------------- */
// guard against re-entry when router.go() itself changed the hash
window.addEventListener("hashchange", () => {
    if (router._ownHashChange) return;
    const { view, params } = parseHash();
    router.go(view, params);
});

/* -- scroll to top --------------------------------------------------------- */
(() => {
    const btn = document.getElementById("kp-totop");
    if (!btn) return;

    // reveal the button once the page is scrolled past a threshold
    const onScroll = () => {
        btn.classList.toggle("is-visible", window.scrollY > 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // smooth-scroll back to the top on click
    btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
})();

/* -- logout ---------------------------------------------------------------- */
(() => {
    const links = document.querySelectorAll(".kp-logout-link");
    if (!links.length) return;

    // logout is a state change — POST it with the CSRF token rather than a GET link
    links.forEach(el => {
        el.addEventListener("click", async e => {
            e.preventDefault();
            await fetch("/logout", {
                method: "POST",
                headers: { "X-CSRF-Token": window.KP?.csrf ?? "" },
            });
            window.location.href = "/login";
        });
    });
})();

/* -- bottom nav "More" menu ------------------------------------------------ */
(() => {
    const more     = document.getElementById("kp-bn-more");
    const menu     = document.getElementById("kp-bn-more-menu");
    const backdrop = document.getElementById("kp-bn-backdrop");
    if (!more || !menu || !backdrop) return;

    const setOpen = (open) => {
        menu.hidden     = !open;
        backdrop.hidden = !open;
        more.classList.toggle("kp-bn-open", open);
    };

    more.addEventListener("click", () => setOpen(menu.hidden));
    backdrop.addEventListener("click", () => setOpen(false));
    menu.addEventListener("click", (e) => {
        if (e.target.closest("[data-view]")) setOpen(false);
    });
})();

/* -- node pairing code ----------------------------------------------------- */
(() => {
    const links = document.querySelectorAll(".kp-pair-code-link");
    if (!links.length) return;

    links.forEach(el => {
        el.addEventListener("click", async e => {
            e.preventDefault();
            try {
                showPairCodeModal(await api.post("/nodes/pair-code"));
            } catch (err) {
                toast.error(err.message);
            }
        });
    });
})();

function showPairCodeModal({ code, url, expires_in }) {
    const id = "kp-pair-code-modal";
    document.getElementById(id)?.remove();

    const html = `
        <div id="${id}" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:460px">
                <h3 class="uk-modal-title">Pairing Code</h3>
                <p class="kp-muted uk-text-small">
                    On the parent node, choose Add Node and enter this URL and code.
                    The code works once, and only for this URL.
                </p>
                <label class="kp-label">URL</label>
                <input class="uk-input kp-input" type="text" readonly value="${escapeHtml(url)}">
                <label class="kp-label uk-margin-small-top">Code</label>
                <input class="uk-input kp-input" type="text" readonly value="${escapeHtml(code)}"
                    style="letter-spacing:0.2em;font-size:1.2rem;text-align:center">
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    Expires in <span id="kp-pair-code-ttl"></span>
                </p>
                <div class="uk-flex uk-flex-right uk-margin-top">
                    <button class="uk-button kp-btn-ghost uk-modal-close">Close</button>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML("beforeend", html);
    const el = document.getElementById(id);
    const ttlEl = document.getElementById("kp-pair-code-ttl");

    let left = expires_in;
    const tick = () => {
        if (left <= 0) {
            ttlEl.textContent = "— expired";
            clearInterval(timer);
            return;
        }
        ttlEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        left--;
    };
    const timer = setInterval(tick, 1000);
    tick();

    el.addEventListener("hidden", () => {
        clearInterval(timer);
        setTimeout(() => el.remove(), 300);
    }, { once: true });

    UIkit.modal(el).show();
}

/* -- boot ------------------------------------------------------------------ */
const { view: initialView, params: initialParams } = parseHash();
router.go(initialView, initialParams);
