// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from './api.js';
import { confirm, hideProgressModal, showCloneModal, showProgressModal } from './helpers.js';
import { showEditSiteModal } from './modals/edit-site.js';
import { parseHash, router } from './router.js';
import { toast } from './toast.js';
import { viewAdminLogs } from './views/admin-logs.js';
import { viewAuditLog } from './views/audit-log.js';
import { viewDashboard } from './views/dashboard.js';
import { viewSecurity } from './views/security.js';
import { viewSettings } from './views/settings.js';
import { viewSiteDetail } from './views/site-detail.js';
import { viewSites } from './views/sites.js';
import { viewUsers } from './views/users.js';

/* -- register routes ------------------------------------------------------- */
router.register("dashboard",   (root)         => viewDashboard(root));
router.register("sites",       (root)         => viewSites(root));
router.register("site-detail", (root, params) => viewSiteDetail(root, params));
router.register("users",       (root)         => viewUsers(root));
router.register("settings",    (root)         => viewSettings(root));
router.register("security",    (root)         => viewSecurity(root));
router.register("admin-logs",  (root)         => viewAdminLogs(root));
router.register("audit-log",   (root)         => viewAuditLog(root));

/* -- protect native caret keys in form fields ------------------------------ */
// UIkit's tab/switcher keyboard nav intercepts arrow keys and preventDefaults
// them; since the panel's forms live inside switcher-connected tab panels, that
// kills caret movement in every field. Stop these keys in the capture phase so
// UIkit never receives them — the browser's default caret behavior then runs.
// The WP-CLI terminal deliberately uses Up/Down for history, so it's exempt.
document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (!t?.matches?.("input, textarea, select, [contenteditable='true']")) return;
    if (t.id === "wpcli-input") return; // keep its Up/Down history handler
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
        case "edit": {
            const siteData = await api.get(`/sites/${id}`);
            showEditSiteModal(siteData.site);
            break;
        }
        case "clone": {
            const name = await showCloneModal(btn.dataset.name ?? id);
            if (!name) break;
            showProgressModal("Cloning Site", "Copying files and database — this may take a few minutes...");
            try {
                const res = await api.post(`/sites/${id}/clone`, { name });
                // poll until the cloned site appears in the list
                let found = false, tries = 0;
                while (!found && tries < 60) {
                    await new Promise((r) => setTimeout(r, 3000));
                    const sites = await api.get("/sites");
                    found = sites.some((s) => s.ID === res.id && s.SiteStatus === 1);
                    tries++;
                }
                hideProgressModal();
                if (found) {
                    toast.success(`Site cloned as '${name}'`);
                    router.go("sites");
                } else {
                    toast.error("Clone timed out — check container logs");
                }
            } catch (e) {
                hideProgressModal();
                toast.error(e.message);
            }
            break;
        }
        case "delete":
            await deleteSite(id);
            break;
        case "recreate":
            showProgressModal("Recreating Pod", "Recreating containers for this site - this may take a few minutes...");
            try {
                await api.post(`/sites/${id}/recreate`);
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
    const body    = action === "recreate" ? { prune: true } : undefined;
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
        const cd   = resp.headers.get("Content-Disposition") ?? "";
        const name = cd.match(/filename="([^"]+)"/)?.[1] ?? `${id}_final.tar.gz`;
        const blob = await resp.blob();
        const a    = document.createElement("a");
        a.href     = URL.createObjectURL(blob);
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
    const msgEl     = document.getElementById("kp-resource-warning-msg");

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

/* -- boot ------------------------------------------------------------------ */
const { view: initialView, params: initialParams } = parseHash();
router.go(initialView, initialParams);
