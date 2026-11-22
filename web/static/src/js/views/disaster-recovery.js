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
    if (!status.key_enrolled) return ["Enroll the instance key before creating a recovery point.", "#disaster-recovery", "Disaster Recovery"];
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
        const link = banner.querySelector("a");
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

export async function viewDisasterRecovery(root) {
    if (window.KP?.user?.role !== 99) return;
    const status = await api.get(path);
    if (!status || window.location.hash !== "#disaster-recovery") return;

    renderWarning(status);
    const lastVerified = status.last_verified && !status.last_verified.startsWith("0001")
        ? new Date(status.last_verified).toLocaleString() : "None";
    const results = { running: "Running", failed: "Failed", succeeded: "Succeeded" };
    root.innerHTML = `
        <section class="kp-card uk-padding-small" data-dr-panel>
            <h3 class="kp-view-title">Disaster Recovery</h3>
            <dl class="uk-description-list">
                <dt>S3 configuration</dt><dd>${status.s3_configured ? "Configured" : "Required"}</dd>
                <dt>Recovery key enrollment</dt><dd>${status.key_enrolled ? "Enrolled" : "Required"}</dd>
                <dt>Latest run</dt><dd>${results[status.result] ?? "Pending"}</dd>
                <dt>Last verified recovery point</dt><dd>${escapeHtml(lastVerified)}</dd>
            </dl>
            ${status.error ? `<div class="uk-alert-danger uk-padding-small" role="alert"><div class="uk-text-break">${escapeHtml(status.error)}</div></div>` : ""}
            ${status.s3_configured && !status.key_enrolled
                ? '<p>Run <code>podnest dr-enroll --app-path /opt/podnest</code> in the application environment to protect the instance key.</p>' : ""}
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
        </section>`;

    const panel = root.querySelector("[data-dr-panel]");
    const refresh = () => {
        if (panel.isConnected) viewDisasterRecovery(root).catch((err) => toast.error(err.message));
    };
    panel.querySelector("#kp-dr-refresh").addEventListener("click", refresh);
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

    const run = panel.querySelector("#kp-dr-run");
    run.addEventListener("click", async () => {
        run.disabled = true;
        try {
            await api.post(path + "/run");
            toast.success("Disaster recovery queued");
            setTimeout(refresh, 1000);
        } catch (err) {
            toast.error(err.message);
            run.disabled = false;
        }
    });
    if (status.result === "running") setTimeout(refresh, 5000);
}
