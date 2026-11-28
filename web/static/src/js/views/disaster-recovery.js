// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { escapeHtml } from '../helpers.js';
import { toast } from '../toast.js';

const path = "/disaster-recovery";

function warning(status) {
    if (!status.s3_configured) return ["Configure S3 to enable disaster recovery.", "#settings/backups", "Backup settings"];
    if (status.disabled) return ["Automatic disaster recovery is disabled.", "#disaster-recovery", "Disaster Recovery"];
    if (!status.key_enrolled) return ["Recovery key enrollment required", "#disaster-recovery", "Enroll recovery key"];
    if (status.result === "failed") return ["The latest disaster recovery run failed.", "#disaster-recovery", "View details"];
    if (!status.last_verified || status.last_verified.startsWith("0001")) {
        return ["A verified recovery point is missing.", "#disaster-recovery", "Disaster Recovery"];
    }
    return null;
}

function renderWarning(status) {
    const banner = document.getElementById("kp-dr-warning");
    if (!banner) return;
    const content = warning(status);
    banner.hidden = !content;
    if (content) {
        const [message, href, label] = content;
        banner.querySelector("strong").textContent = message;
        const link = banner.querySelector(".kp-update-banner-row a");
        link.href = href;
        link.textContent = label;
    }
}

export async function refreshDRWarning() {
    try {
        const status = await api.get(path);
        if (status) renderWarning(status);
    } catch {
        // Keep the last warning visible during a transient API failure.
    }
}

export async function viewDisasterRecovery(root, params, signal) {
    if (window.KP?.user?.role !== 99) return;
    const status = await api.get(path);
    if (!status || window.location.hash !== "#disaster-recovery") return;

    renderWarning(status);
    const lastVerified = status.last_verified && !status.last_verified.startsWith("0001")
        ? new Date(status.last_verified).toLocaleString() : "None";
    const results = { running: "Running", failed: "Failed", succeeded: "Succeeded" };
    if (signal?.aborted) return;

    root.innerHTML = `
        <section class="kp-card uk-padding-small" data-dr-panel>
            <h3 class="kp-view-title">Disaster Recovery</h3>
            <dl class="uk-description-list kp-dr-status">
                <div><dt>S3 configuration</dt><dd>${status.s3_configured ? "Configured" : "Required"}</dd></div>
                <div><dt>Recovery key enrollment</dt><dd>${status.key_enrolled ? "Enrolled" : "Required"}</dd></div>
                <div><dt>Latest run</dt><dd data-dr-result>${results[status.result] ?? "Pending"}</dd></div>
                <div><dt>Last verified recovery point</dt><dd>${escapeHtml(lastVerified)}</dd></div>
            </dl>
            ${status.error ? `<div class="uk-alert-danger uk-padding-small" role="alert"><div class="uk-text-break">${escapeHtml(status.error)}</div></div>` : ""}
            ${status.s3_configured && !status.key_enrolled
                ? `
                    <form class="uk-form-stacked uk-margin-small-bottom" id="kp-dr-enroll">
                        <label class="kp-label" for="kp-dr-passphrase">Recovery passphrase</label>
                        <input class="uk-input kp-input" type="password" id="kp-dr-passphrase"
                            name="passphrase" autocomplete="new-password" required>
                        <label class="kp-label uk-margin-small-top" for="kp-dr-confirmation">Confirm recovery passphrase</label>
                        <input class="uk-input kp-input" type="password" id="kp-dr-confirmation"
                            name="confirmation" autocomplete="new-password" required>
                        <p>Use at least 8 characters and save the passphrase outside PodNest and S3. You’ll need it to recover this server.</p>
                        <button type="submit" class="kp-btn-primary">Enroll recovery key</button>
                    </form>` : ""}
            <form class="uk-form-stacked uk-margin-small-top" id="kp-dr-form">
                <label class="uk-display-block uk-margin-small-bottom">
                    <input type="checkbox" class="uk-checkbox" name="automatic" ${status.disabled ? "" : "checked"}>
                    Enable automatic disaster recovery
                </label>
                <label class="kp-label" for="kp-dr-schedule">Five-field cron schedule</label>
                <input id="kp-dr-schedule" class="uk-input kp-input" name="schedule" maxlength="128" required
                    value="${escapeHtml(status.schedule)}">
                <div class="uk-margin-small-top">
                    <button type="submit" class="kp-btn-primary">Save schedule</button>
                    <button type="button" class="kp-btn-secondary" id="kp-dr-run"
                        ${status.result === "running" || !status.s3_configured || !status.key_enrolled ? "disabled" : ""}>
                        Run Disaster Recovery
                    </button>
                    <button type="button" class="kp-btn-secondary" id="kp-dr-refresh">Refresh</button>
                </div>
            </form>
            <div class="uk-margin-top" data-dr-progress hidden>
                <p id="kp-dr-progress-label" role="status"></p>
                <progress class="uk-progress" aria-labelledby="kp-dr-progress-label"></progress>
            </div>
            <div class="uk-margin-top" data-dr-site-results hidden>
                <h4 class="kp-view-title">Site backup results</h4>
                <ul class="uk-list uk-list-divider"></ul>
                <p class="kp-muted" data-dr-archive-error hidden>Site downloads are temporarily unavailable.</p>
            </div>
            <div class="uk-margin-top" id="kp-dr-restore" hidden>
                <h4 class="kp-view-title">Site restoration</h4>
                <button type="button" class="kp-btn-secondary" id="kp-dr-retry-all">Retry Failed Sites</button>
                <ul class="uk-list uk-list-divider" id="kp-dr-restore-sites"></ul>
            </div>
            ${lastVerified !== "None" ? `
                <div class="uk-margin-top" id="kp-dr-archives">
                    <h4 class="kp-view-title">Recovery archives</h4>
                    <a class="kp-btn-secondary kp-btn-sm" href="/api/disaster-recovery/download">Download application archive</a>
                </div>` : ""}
        </section>`;

    const panel = root.querySelector("[data-dr-panel]");
    if (status.result !== "running") showSiteBackupResults(panel, status, lastVerified !== "None");

    const refresh = () => {
        if (panel.isConnected) viewDisasterRecovery(root, params, signal).catch((err) => toast.error(err.message));
    };
    panel.querySelector("#kp-dr-refresh").addEventListener("click", refresh);
    panel.querySelector("#kp-dr-enroll")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const passphrase = form.elements.passphrase.value;
        if (passphrase !== form.elements.confirmation.value) {
            toast.error("Recovery passphrases do not match");
            return;
        }
        const button = form.querySelector("button");
        button.disabled = true;
        form.reset();
        try {
            await api.post(path + "/enroll", { passphrase });
            toast.success("Recovery key enrolled");
            refresh();
        } catch (err) {
            toast.error(err.message);
        } finally {
            button.disabled = false;
        }
    });
    panel.querySelector("#kp-dr-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        try {
            await api.put(path, { disabled: !values.has("automatic"), schedule: values.get("schedule") });
            toast.success("Disaster recovery schedule saved");
            refresh();
        } catch (err) {
            toast.error(err.message);
        }
    });

    updateRestoreResults(panel);

    const run = panel.querySelector("#kp-dr-run");
    run.addEventListener("click", async () => {
        run.disabled = true;
        try {
            await api.post(path + "/run");
            toast.success("Disaster recovery queued");
        } catch (err) {
            toast.error(err.message);
            run.disabled = false;
        }
    });
    watchDRProgress(panel, status, refresh);
}

async function showSiteBackupResults(panel, status, hasArchive) {
    const section = panel.querySelector("[data-dr-site-results]");
    const list = section.querySelector("ul");
    const rows = new Map();

    function addSite(site, result) {
        const row = document.createElement("li");
        row.className = "kp-dr-site-result";

        const summary = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = site.name;
        const detail = document.createElement("div");
        detail.textContent = result;
        summary.append(name, detail);
        row.append(summary);
        list.append(row);
        rows.set(String(site.id), row);
        section.hidden = false;
        return row;
    }

    for (const site of status.site_backups ?? []) {
        addSite(site, site.error ? `${site.state} — ${site.error}` : site.state);
    }

    if (!hasArchive) return;
    const canShowDownloads = () => panel.isConnected && panel.querySelector("[data-dr-progress]").hidden;
    try {
        const archives = await api.get(path + "/archives");
        if (!canShowDownloads()) return;
        for (const site of archives ?? []) {
            const row = rows.get(String(site.id)) ?? addSite(site, "Last verified recovery point");
            const download = document.createElement("a");
            download.className = "kp-btn-secondary kp-btn-sm";
            download.href = "/api/disaster-recovery/download/" + encodeURIComponent(site.id);
            download.textContent = "Download";
            download.setAttribute("aria-label", `Download the last verified archive for ${site.name}`);
            row.append(download);
        }
    } catch {
        if (!canShowDownloads()) return;
        section.hidden = false;
        section.querySelector("[data-dr-archive-error]").hidden = false;
    }
}

async function updateRestoreResults(panel) {
    if (!panel.isConnected) return;
    const endpoint = path + "/restore";
    const section = panel.querySelector("#kp-dr-restore");
    const list = panel.querySelector("#kp-dr-restore-sites");
    const all = panel.querySelector("#kp-dr-retry-all");
    const retry = async (site) => {
        try {
            await api.post(endpoint, { retry: true, site });
            toast.success("Site recovery queued");
            await updateRestoreResults(panel);
        } catch (err) {
            toast.error(err.message);
        }
    };
    try {
        const status = await api.get(endpoint);
        if (!panel.isConnected || !status || !status.sites.length) return;
        section.hidden = false;
        all.disabled = status.busy || !status.sites.some(site => ["failed", "running"].includes(site.state));
        all.onclick = () => retry("");
        list.replaceChildren(...status.sites.map(site => {
            const item = document.createElement("li");
            const label = document.createElement("span");
            label.textContent = site.name + " — " + site.state + (site.error ? ": " + site.error : "");
            item.append(label);
            if (["failed", "running"].includes(site.state)) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "kp-btn-secondary kp-btn-sm uk-margin-small-left";
                button.textContent = "Retry";
                button.disabled = status.busy;
                button.onclick = () => retry(site.name);
                item.append(button);
            }
            return item;
        }));
        if (status.busy) setTimeout(() => updateRestoreResults(panel), 3000);
    } catch (err) {
        if (panel.isConnected) toast.error(err.message);
    }
}

function watchDRProgress(panel, initial, refresh) {
    const progress = panel.querySelector("[data-dr-progress]");
    const bar = progress.querySelector("progress");
    const label = progress.querySelector("p");
    const run = panel.querySelector("#kp-dr-run");
    const result = panel.querySelector("[data-dr-result]");
    let previous = initial;
    let socket;

    function render(status) {
        progress.hidden = status.result !== "running";
        if (progress.hidden) return;
        run.disabled = true;
        panel.querySelector("[data-dr-site-results]").hidden = true;
        result.textContent = "In progress";
        const sites = status.site_backups ?? [];
        const current = sites.find(site => site.state === "running");
        const completed = sites.filter(site => site.state !== "running").length;
        if (completed > 0 && completed < status.site_total) {
            bar.max = status.site_total;
            bar.value = completed;
        } else {
            bar.removeAttribute("value");
        }
        label.textContent = current ? `Backing up ${current.name} · ${status.site_total ? `${completed} of ${status.site_total} sites processed` : "In progress"}`
            : status.site_total && completed === status.site_total ? "Verifying the recovery point" : "Preparing disaster recovery";
    }

    const observer = new MutationObserver(() => {
        if (!panel.isConnected) {
            observer.disconnect();
            socket?.close();
        }
    });
    observer.observe(panel.parentNode, { childList: true });

    function connect() {
        if (!panel.isConnected) return;
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(`${protocol}//${location.host}/api${path}/progress`);
        socket.addEventListener("message", event => {
            if (!panel.isConnected) return;
            const status = JSON.parse(event.data);
            if (status.result !== "running" && (status.result !== previous.result || status.started !== previous.started)) {
                previous = status;
                refresh();
                return;
            }
            render(status);
            previous = status;
        });
        socket.addEventListener("close", () => {
            if (!panel.isConnected) return;
            if (previous.result === "running") label.textContent = "Reconnecting to backup progress…";
            setTimeout(connect, 2000);
        });
    }

    render(initial);
    connect();
}
