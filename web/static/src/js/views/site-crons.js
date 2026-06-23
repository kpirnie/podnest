"use strict";

import { api } from '../api.js';
import { confirm, escapeHtml, hideProgressModal, showProgressModal } from '../helpers.js';
import { toast } from '../toast.js';

// renderCronsTab returns the static HTML shell for the crons tab
export function renderCronsTab(siteId) {
    return `
        <div id="crons-panel" data-site-id="${siteId}">
            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Cron Jobs</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="cron-add-btn" uk-tooltip="Add Cron Job">
                        <span uk-icon="plus"></span>
                    </button>
                </div>
                <div id="cron-list-wrap">
                    <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>

            <!-- add / edit modal -->
            <div id="cron-modal" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title" id="cron-modal-title">Add Cron Job</h3>
                    <div class="uk-form-stacked uk-margin-top">
                        <div class="uk-grid-small" uk-grid>
                            <input type="hidden" id="cron-modal-id">
                            <div class="uk-width-1-1">
                                <label class="kp-label">Label</label>
                                <input class="uk-input kp-input" type="text" id="cron-modal-label" placeholder="e.g. Daily cleanup">
                            </div>
                            <div class="uk-width-1-1">
                                <label class="kp-label">Command</label>
                                <textarea class="uk-textarea kp-textarea kp-mono" id="cron-modal-command" rows="3"
                                    placeholder="e.g. php /var/www/html/artisan schedule:run"></textarea>
                            </div>
                            <div class="uk-width-1-1">
                                <label class="kp-label">Schedule <span class="kp-muted uk-text-small">(5-field cron expression)</span></label>
                                <input class="uk-input kp-input kp-mono" type="text" id="cron-modal-schedule" placeholder="e.g. 0 3 * * *">
                                <p class="kp-muted uk-text-small uk-margin-small-top uk-margin-remove-bottom" id="cron-schedule-preview"></p>
                            </div>
                            <div class="uk-width-1-1">
                                <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                                    <input type="checkbox" class="uk-checkbox" id="cron-modal-enabled" checked>
                                    <span class="kp-text">Enabled</span>
                                </label>
                            </div>
                        </div>
                        <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                            <button class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                            <button class="uk-button kp-btn-primary" id="cron-modal-save">Save</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>`;
}

// renderCronList returns the table HTML for a list of cron jobs
function renderCronList(crons) {
    if (!crons || crons.length === 0) {
        return `<p class="kp-muted uk-text-small uk-margin-remove">No cron jobs configured.</p>`;
    }

    const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—';

    const rows = crons.map((c) => `
        <tr>
            <td class="kp-text">${c.Label || '<span class="kp-muted">—</span>'}</td>
            <td class="kp-mono kp-text-sm">${c.Schedule}</td>
            <td class="kp-muted uk-text-small">${fmtDate(c.LastRun)}</td>
            <td>
                ${c.LastError
                    ? `<span class="kp-badge kp-badge-error">Error</span>`
                    : (c.LastRun ? `<span class="kp-badge kp-badge-success">OK</span>` : `<span class="kp-muted uk-text-small">—</span>`)
                }
                ${(c.LastOutput || c.LastError)
                    ? `<a class="kp-cron-detail-btn cron-detail-btn" data-id="${c.ID}" uk-tooltip="View Run Details">
                            <span uk-icon="icon: info; ratio: 0.75"></span>
                        </a>`
                    : ''
                }
            </td>
            <td>
                <input type="checkbox" class="uk-checkbox cron-toggle"
                    data-id="${c.ID}" ${c.Enabled ? 'checked' : ''}>
            </td>
            <td>
                <div class="uk-flex kp-cron-actions">
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-run-btn"
                        data-id="${c.ID}" uk-tooltip="Run Now">
                        <span uk-icon="play"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm cron-edit-btn"
                        data-id="${c.ID}" uk-tooltip="Edit">
                        <span uk-icon="pencil"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm cron-delete-btn"
                        data-id="${c.ID}" uk-tooltip="Delete">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("");

    return `
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead>
                <tr>
                    <th>Label</th>
                    <th>Schedule</th>
                    <th>Last Run</th>
                    <th>Status</th>
                    <th>Enabled</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// loadCronsPanel fetches cron jobs and populates the panel
export async function loadCronsPanel(root, siteId) {
    const wrap = root.querySelector("#cron-list-wrap");
    if (!wrap) return;
    try {
        const crons = await api.get(`/sites/${siteId}/crons`);
        wrap.innerHTML = renderCronList(crons);
    } catch (err) {
        wrap.innerHTML = `<p class="kp-muted uk-text-small">Failed to load cron jobs: ${escapeHtml(err.message)}</p>`;
    }
}

// wireCronsPanel attaches all event listeners for the crons tab
export function wireCronsPanel(root, siteId) {
    // store fetched crons for edit and detail lookups
    let cronCache = [];

    const modal     = root.querySelector("#cron-modal");
    const titleEl   = root.querySelector("#cron-modal-title");
    const idInput   = root.querySelector("#cron-modal-id");
    const labelEl   = root.querySelector("#cron-modal-label");
    const cmdEl     = root.querySelector("#cron-modal-command");
    const schedEl   = root.querySelector("#cron-modal-schedule");
    const previewEl = root.querySelector("#cron-schedule-preview");
    const enabledEl = root.querySelector("#cron-modal-enabled");

    // -- schedule preview ----------------------------------------------------
    schedEl?.addEventListener("input", () => {
        previewEl.textContent = describeSchedule(schedEl.value.trim());
    });

    // -- open modal for add --------------------------------------------------
    root.querySelector("#cron-add-btn")?.addEventListener("click", () => {
        titleEl.textContent   = "Add Cron Job";
        idInput.value         = "";
        labelEl.value         = "";
        cmdEl.value           = "";
        schedEl.value         = "";
        previewEl.textContent = "";
        enabledEl.checked     = true;
        UIkit.modal(modal).show();
    });

    // -- save (create or update) ---------------------------------------------
    root.querySelector("#cron-modal-save")?.addEventListener("click", async () => {
        const command  = cmdEl.value.trim();
        const schedule = schedEl.value.trim();
        if (!command || !schedule) {
            toast.error("Command and schedule are required");
            return;
        }

        const body = {
            label:   labelEl.value.trim(),
            command,
            schedule,
            enabled: enabledEl.checked,
        };

        const cid = idInput.value;
        try {
            if (cid) {
                await api.put(`/sites/${siteId}/crons/${cid}`, body);
                toast.success("Cron job updated");
            } else {
                await api.post(`/sites/${siteId}/crons`, body);
                toast.success("Cron job created");
            }
            UIkit.modal(modal).hide();
            await loadCronsPanel(root, siteId);
            cronCache = await api.get(`/sites/${siteId}/crons`);
        } catch (err) {
            toast.error(err.message);
        }
    });

    // -- delegated list actions ----------------------------------------------
    root.querySelector("#cron-list-wrap")?.addEventListener("click", async (e) => {

        // show run details — fresh modal each time to avoid UIkit stale state
        const detailBtn = e.target.closest(".cron-detail-btn");
        if (detailBtn) {
            const cid  = detailBtn.dataset.id;
            const cron = cronCache.find((c) => String(c.ID) === cid);
            if (!cron) return;

            document.body.insertAdjacentHTML("beforeend", `
                <div id="cron-detail-modal" uk-modal>
                    <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                        <button class="uk-modal-close-default" type="button" uk-close></button>
                        <h3 class="kp-view-title uk-margin-bottom">Run Details — ${escAttr(cron.Label || String(cron.ID))}</h3>
                        <div class="uk-margin-small-bottom">
                            <label class="kp-label">Output</label>
                            <pre class="kp-cron-output">${escAttr(cron.LastOutput || '(no output)')}</pre>
                        </div>
                        <div class="uk-margin-small-top">
                            <label class="kp-label">Error</label>
                            <pre class="kp-cron-output kp-cron-output-error">${escAttr(cron.LastError || '(no error)')}</pre>
                        </div>
                    </div>
                </div>`);

            const el = document.getElementById("cron-detail-modal");
            UIkit.modal(el).show();
            // remove from DOM on close so the next open always gets a clean element
            el.addEventListener("hidden", () => el.remove(), { once: true });
            return;
        }

        // edit
        const editBtn = e.target.closest(".cron-edit-btn");
        if (editBtn) {
            const cid  = editBtn.dataset.id;
            const cron = cronCache.find((c) => String(c.ID) === cid);
            if (!cron) return;

            titleEl.textContent   = "Edit Cron Job";
            idInput.value         = cron.ID;
            labelEl.value         = cron.Label || "";
            cmdEl.value           = cron.Command;
            schedEl.value         = cron.Schedule;
            previewEl.textContent = describeSchedule(cron.Schedule);
            enabledEl.checked     = cron.Enabled;
            UIkit.modal(modal).show();
            return;
        }

        // delete
        const deleteBtn = e.target.closest(".cron-delete-btn");
        if (deleteBtn) {
            const cid = deleteBtn.dataset.id;
            const ok  = await confirm("Delete Cron Job", "This will permanently remove the cron job. Continue?");
            if (!ok) return;
            try {
                await api.delete(`/sites/${siteId}/crons/${cid}`);
                toast.success("Cron job deleted");
                await loadCronsPanel(root, siteId);
                cronCache = await api.get(`/sites/${siteId}/crons`);
            } catch (err) {
                toast.error(err.message);
            }
            return;
        }

        // run now
        const runBtn = e.target.closest(".cron-run-btn");
        if (runBtn) {
            const cid = runBtn.dataset.id;
            try {
                await api.post(`/sites/${siteId}/crons/${cid}/run`);
            } catch (err) {
                toast.error(err.message);
                return;
            }

            showProgressModal("Running Cron Job", "Executing the job inside the container — please wait.");

            // poll last_run timestamp until it changes, then reload the list
            let before = null;
            try {
                const all = await api.get(`/sites/${siteId}/crons`);
                before = all.find((c) => String(c.ID) === cid)?.LastRun ?? null;
            } catch (_) { /* non-fatal */ }

            const deadline = Date.now() + 5 * 60 * 1000;
            const poll = setInterval(async () => {
                try {
                    const all = await api.get(`/sites/${siteId}/crons`);
                    const job = all.find((c) => String(c.ID) === cid);
                    if (!job || job.LastRun !== before || Date.now() > deadline) {
                        clearInterval(poll);
                        hideProgressModal();
                        cronCache = all ?? [];
                        const wrap = root.querySelector("#cron-list-wrap");
                        if (wrap) wrap.innerHTML = renderCronList(all);
                        if (job?.LastError) toast.error(`Job failed: ${job.LastError}`);
                        else toast.success("Cron job complete");
                    }
                } catch (_) { /* keep polling */ }
            }, 2000);

            return;
        }
    });

    // -- enable/disable toggle (delegated) -----------------------------------
    root.querySelector("#cron-list-wrap")?.addEventListener("change", async (e) => {
        const toggle = e.target.closest(".cron-toggle");
        if (!toggle) return;
        const cid = toggle.dataset.id;
        try {
            await api.patch(`/sites/${siteId}/crons/${cid}/toggle`, { enabled: toggle.checked });
            toast.success(toggle.checked ? "Cron job enabled" : "Cron job disabled");
        } catch (err) {
            toast.error(err.message);
            toggle.checked = !toggle.checked; // revert on failure
        }
    });

    // initial cache load
    api.get(`/sites/${siteId}/crons`).then((c) => { cronCache = c ?? []; }).catch(() => {});
}

// -- helpers -----------------------------------------------------------------

// escAttr escapes a string for use in an HTML attribute value or text content
function escAttr(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// describeSchedule returns a human-readable summary of a 5-field cron expression
function describeSchedule(expr) {
    if (!expr) return "";
    const f = expr.trim().split(/\s+/);
    if (f.length !== 5) return "invalid expression";

    const [min, hr, dom, mon, dow] = f;

    // common shorthand patterns
    if (expr === "* * * * *") return "every minute";
    if (min !== "*" && hr !== "*" && dom === "*" && mon === "*" && dow === "*") {
        return `daily at ${hr.padStart(2, "0")}:${min.padStart(2, "0")}`;
    }
    if (min !== "*" && hr !== "*" && dom === "*" && mon === "*" && dow !== "*") {
        const days  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const label = dow.split(",").map((d) => days[parseInt(d)] ?? d).join(", ");
        return `weekly on ${label} at ${hr.padStart(2, "0")}:${min.padStart(2, "0")}`;
    }
    if (min.startsWith("*/")) return `every ${min.slice(2)} minutes`;
    if (hr.startsWith("*/"))  return `every ${hr.slice(2)} hours`;

    return expr;
}
