"use strict";

import { api } from './api.js';
import { confirm, hideProgressModal, showProgressModal } from './helpers.js';
import { showEditSiteModal } from './modals/edit-site.js';
import { parseHash, router } from './router.js';
import { toast } from './toast.js';
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

/* -- nav wiring ------------------------------------------------------------ */
document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (!link) return;
    e.preventDefault();
    router.go(link.dataset.view);
    const oc = document.getElementById("kp-offcanvas");
    if (oc) UIkit.offcanvas(oc).hide();
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
        case "delete":
            await deleteSite(id);
            break;
        case "update":
            await siteAction(id, "update", "Updating Images", "Pulling latest container images - this may take a few minutes...");
            break;
        case "recreate":
            showProgressModal("Recreating Pod", "Recreating containers for this site - this may take a few minutes...");
            try {
                await api.post(`/sites/${id}/recreate`);
                hideProgressModal();
                toast.success("Pod recreated");
                router.go("site-detail", { id });
            } catch (e) {
                hideProgressModal();
                toast.error(e.message);
            }
            break;
    }
});

/* -- helpers --------------------------------------------------------------- */
async function siteAction(id, action, title, message) {
    showProgressModal(title, message);
    try {
        await api.post(`/sites/${id}/${action}`);
        hideProgressModal();
        toast.success(title + ' complete');
        if (['start', 'stop', 'restart'].includes(action)) router.go('sites');
    } catch (e) {
        hideProgressModal();
        toast.error(e.message);
    }
}

async function deleteSite(id) {
    const ok = await confirm("Delete Site", "This will stop and permanently remove the pod and all its data. Are you sure?");
    if (!ok) return;

    showProgressModal("Deleting Site", "Stopping containers and removing the pod - please wait...");

    try { await api.delete(`/sites/${id}`); } catch (e) { /* poll below */ }

    let gone = false, tries = 0;
    while (!gone && tries < 10) {
        try {
            await new Promise((r) => setTimeout(r, 2000));
            const sites = await api.get("/sites");
            gone = !sites.find((s) => s.ID === parseInt(id));
        } catch (e) { /* transient */ }
        tries++;
    }

    hideProgressModal();
    if (gone) { toast.success("Site deleted"); router.go("sites"); }
    else toast.error("Delete failed - site still exists after 20s");
}

/* -- hash routing ---------------------------------------------------------- */
window.addEventListener("hashchange", () => {
    const { view, params } = parseHash();
    router.go(view, params);
});

/* -- boot ------------------------------------------------------------------ */
const { view: initialView, params: initialParams } = parseHash();
router.go(initialView, initialParams);
