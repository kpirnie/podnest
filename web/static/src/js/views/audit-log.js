// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { errorState, escapeHtml, isAdmin } from '../helpers.js';

const PAGE_SIZE = 50;

// -- render ------------------------------------------------------------------

function renderAuditLog(data, filter, page) {
    const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    const rows = (data.entries ?? []).map(rowHTML).join("") ||
        `<tr><td colspan="8" class="uk-text-center" style="color:var(--kp-text-dim)">No records found</td></tr>`;

    return `
        <div id="audit-log-panel">
            <div class="kp-view-header">
                <h1 class="kp-view-title" style="font-size:2rem;">Audit Log</h1>
            </div>

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-middle uk-flex-wrap kp-filter-bar">
                    <input class="uk-input kp-input" id="al-filter-user" type="text"
                        placeholder="Username" value="${esc(filter.username)}">
                    <input class="uk-input kp-input" id="al-filter-action" type="text"
                        placeholder="Action" value="${esc(filter.action)}">
                    <input class="uk-input kp-input" id="al-filter-target" type="text"
                        placeholder="Target type" value="${esc(filter.target_type)}">
                    <input class="uk-input kp-input" id="al-filter-date-from" type="date"
                        value="${esc(filter.date_from)}">
                    <input class="uk-input kp-input" id="al-filter-date-to" type="date"
                        value="${esc(filter.date_to)}">
                    <select class="uk-select kp-select" id="al-filter-auth">
                        <option value=""  ${filter.auth === ""  ? "selected" : ""}>All requests</option>
                        <option value="1" ${filter.auth === "1" ? "selected" : ""}>Authenticated</option>
                        <option value="0" ${filter.auth === "0" ? "selected" : ""}>Unauthenticated</option>
                    </select>
                    <div class="uk-flex uk-flex-middle" style="gap:4px">
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="al-filter-apply">
                            <span uk-icon="icon: search; ratio: 0.85"></span>
                        </button>
                        <button class="uk-button kp-btn-ghost kp-btn-sm" id="al-filter-clear">
                            <span uk-icon="icon: close; ratio: 0.85"></span>
                        </button>
                    </div>
                    <span id="al-record-count" class="uk-margin-auto-left kp-text-dim kp-text-sm">
                        ${data.total} record${data.total !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            <div class="kp-table-wrap">
                <div class="uk-overflow-auto">
                <table class="uk-table uk-table-divider uk-table-small uk-table-middle uk-margin-remove">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>User</th>
                            <th>IP</th>
                            <th>Method</th>
                            <th>Action</th>
                            <th>Status</th>
                            <th>Details</th>
                            <th>State diff</th>
                        </tr>
                    </thead>
                    <tbody id="al-table-body">${rows}</tbody>
                </table>
                </div>
            </div>

            ${totalPages > 1 ? `<div id="al-pager">${pagerHTML(page, totalPages)}</div>` : `<div id="al-pager"></div>`}
        </div>`;
}

function rowHTML(e) {
    const ts      = new Date(e.ts).toLocaleString();
    const user    = e.username ? `<span style="font-family:monospace">${esc(e.username)}</span>`
                               : `<span style="color:var(--kp-text-dim)">—</span>`;
    const status  = statusBadge(e.status);
    const hasDiff = e.prior_state || e.new_state;
    const diff = hasDiff
        ? `<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="${esc(e.prior_state)}" data-new="${esc(e.new_state)}">
               <span uk-icon="icon: git-fork; ratio: 0.85"></span>
           </button>`
        : `<span>—</span>`;
    const details = e.details
        ? `<button class="uk-button kp-btn-ghost kp-btn-sm al-diff-btn"
                data-prior="" data-new="${esc(e.details)}">
               <span uk-icon="icon: info; ratio: 0.85"></span>
           </button>`
        : `<span>—</span>`;

    return `<tr>
        <td style="white-space:nowrap;font-size:0.82rem">${ts}</td>
        <td>${user}</td>
        <td style="font-family:monospace;font-size:0.82rem">${esc(e.ip)}</td>
        <td><span class="kp-badge">${esc(e.method)}</span></td>
        <td style="font-family:monospace;font-size:0.82rem">${esc(e.action)}</td>
        <td>${status}</td>
        <td>${details}</td>
        <td>${diff}</td>
    </tr>`;
}

function pagerHTML(page, total) {
    const prev = page > 1     ? `<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-prev">‹ Prev</button>` : "";
    const next = page < total ? `<button class="uk-button kp-btn-ghost kp-btn-sm" id="al-next">Next ›</button>` : "";
    return `<div class="uk-flex uk-flex-middle uk-flex-center uk-margin-small-top" style="gap:12px">
        ${prev}
        <span style="font-size:0.85rem;color:var(--kp-text-dim)">Page ${page} of ${total}</span>
        ${next}
    </div>`;
}

function statusBadge(code) {
    const cls = code >= 500 ? "kp-badge-error"
              : code >= 400 ? "kp-badge-warn"
              : code >= 300 ? "kp-badge-info"
              : "kp-badge-ok";
    return `<span class="kp-badge ${cls}">${code}</span>`;
}

// html-escape helper — keeps user-supplied strings safe in attribute contexts
const esc = (s) => escapeHtml(s ?? "");

// -- fetch -------------------------------------------------------------------

async function fetchPage(filter, page) {
    const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
    if (filter.username)    params.set("username",    filter.username);
    if (filter.action)      params.set("action",      filter.action);
    if (filter.target_type) params.set("target_type", filter.target_type);
    if (filter.date_from)   params.set("date_from",   filter.date_from);
    if (filter.date_to)     params.set("date_to",     filter.date_to);
    if (filter.auth !== "") params.set("auth",         filter.auth);
    return api.get(`/audit?${params}`);
}

// -- wire --------------------------------------------------------------------

function readFilter(root) {
    return {
        username:    root.querySelector("#al-filter-user").value.trim(),
        action:      root.querySelector("#al-filter-action").value.trim(),
        target_type: root.querySelector("#al-filter-target").value.trim(),
        date_from:   root.querySelector("#al-filter-date-from").value,
        date_to:     root.querySelector("#al-filter-date-to").value,
        auth:        root.querySelector("#al-filter-auth").value,
    };
}

async function wireAuditLog(root, filter, page) {

    async function reload(newFilter, newPage) {
        const data = await fetchPage(newFilter, newPage);
        // update only the table body and pager — leave modal intact
        root.querySelector("#al-table-body").innerHTML =
            (data.entries ?? []).map(rowHTML).join("") ||
            `<tr><td colspan="8" class="uk-text-center kp-text-dim">No records found</td></tr>`;

        const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
        const pagerEl = root.querySelector("#al-pager");
        if (pagerEl) pagerEl.innerHTML = totalPages > 1 ? pagerHTML(newPage, totalPages) : "";

        root.querySelector("#al-record-count").textContent =
            `${data.total} record${data.total !== 1 ? "s" : ""}`;

        // re-wire pager buttons (they are newly rendered)
        wirePager(root, newFilter, newPage, totalPages);

        // update current filter/page closure
        filter = newFilter;
        page   = newPage;
    }

    function wirePager(root, f, p, total) {
        root.querySelector("#al-prev")?.addEventListener("click", () => reload(f, p - 1));
        root.querySelector("#al-next")?.addEventListener("click", () => reload(f, p + 1));
    }

    // apply / clear — read inputs, reload table only
    root.querySelector("#al-filter-apply")?.addEventListener("click", () => {
        reload(readFilter(root), 1);
    });
    root.querySelector("#al-filter-clear")?.addEventListener("click", () => {
        ["al-filter-user","al-filter-action","al-filter-target",
         "al-filter-date-from","al-filter-date-to"].forEach(id => {
            const el = root.querySelector(`#${id}`);
            if (el) el.value = "";
        });
        root.querySelector("#al-filter-auth").value = "";
        reload({ username:"", action:"", target_type:"", date_from:"", date_to:"", auth:"" }, 1);
    });

    // initial pager wire
    const totalPages = Math.max(1, Math.ceil(
        parseInt(root.querySelector("#al-record-count")?.textContent ?? "0") / PAGE_SIZE
    ));
    wirePager(root, filter, page, totalPages);

    // modal — insert fresh into body each time, remove on close (site-crons pattern)
    root.querySelector("#audit-log-panel")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".al-diff-btn");
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const prior = btn.dataset.prior ?? "";
        const next  = btn.dataset.new   ?? "";
        let text = "";
        if (prior && next)   text = "=== BEFORE ===\n" + fmtJSON(prior) + "\n\n=== AFTER ===\n" + fmtJSON(next);
        else if (next)       text = fmtJSON(next);
        else                 text = fmtJSON(prior);

        document.body.insertAdjacentHTML("beforeend", `
            <div id="al-diff-modal-inst" uk-modal>
                <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-bottom">Request Detail</h3>
                    <pre class="kp-cron-output">${esc(text)}</pre>
                </div>
            </div>`);

        const el = document.getElementById("al-diff-modal-inst");
        UIkit.modal(el).show();
        el.addEventListener("hidden", () => el.remove(), { once: true });
    });
}

function fmtJSON(s) {
    try { return JSON.stringify(JSON.parse(s), null, 2); }
    catch (_) { return s; }
}

// -- entry -------------------------------------------------------------------

export async function viewAuditLog(root) {
    if (!isAdmin()) { root.innerHTML = errorState("Access denied"); return; }

    const filter = { username: "", action: "", target_type: "", date_from: "", date_to: "", auth: "" };
    const data   = await fetchPage(filter, 1);
    root.innerHTML = renderAuditLog(data, filter, 1);
    wireAuditLog(root, filter, 1);
}
