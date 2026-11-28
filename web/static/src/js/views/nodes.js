// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { confirm, emptyState, errorState, escapeHtml, isAdmin } from '../helpers.js';
import { showAddNodeModal, showEditNodeModal } from '../modals/node.js';
import { toast } from '../toast.js';

const NODE_PAIRED = 2;

export async function viewNodes(root, params, signal) {
    if (!isAdmin()) { root.innerHTML = errorState("Access denied"); return; }

    const nodes = await api.get("/nodes");

    if (signal?.aborted) return;

    root.innerHTML = `
        <div id="kp-nodes">
            <div class="kp-view-header">
                <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Nodes</h1>
                <button class="uk-button kp-btn-primary" data-action="node-add">
                    <span uk-icon="plus"></span> Add Node
                </button>
            </div>
            ${nodes.length ? `
            <div class="kp-table-wrap">
                <div class="uk-overflow-auto">
                <table class="uk-table uk-table-divider uk-table-middle uk-margin-remove">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>URL</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nodes.map(nodeRow).join("")}
                    </tbody>
                </table>
                </div>
            </div>` : emptyState("server", "No child nodes yet")}
        </div>`;

    const wrap = document.getElementById("kp-nodes");
    wrap.addEventListener("click", (e) => onNodeAction(e, root, nodes, params, signal));

    // pair, update, and unpair finish in another tab — refresh when focus returns
    window.addEventListener("focus", () => {
        if (document.getElementById("kp-nodes") === wrap) viewNodes(root, params, signal);
    }, { once: true, signal });
}

function nodeRow(n) {
    const status = n.status === NODE_PAIRED
        ? `<span class="kp-status kp-status-running">Paired</span>`
        : `<span class="kp-status kp-status-restarting">Pending</span>`;
    return `<tr>
        <td><strong>${escapeHtml(n.name)}</strong></td>
        <td><span style="font-family:monospace">${escapeHtml(n.url)}</span></td>
        <td>${status}</td>
        <td><span class="kp-muted">${escapeHtml(n.created)}</span></td>
        <td>
            <div class="uk-flex" style="gap:6px;justify-content:flex-end">
                ${n.status === NODE_PAIRED ? `
                <button class="uk-button kp-btn-primary kp-btn-sm" data-action="node-open" data-nid="${n.id}" uk-tooltip="Open the Node">
                    <span uk-icon="icon: sign-in;"></span>
                </button>` : ""}
                <button class="uk-button kp-btn-ghost kp-btn-sm" data-action="node-edit" data-nid="${n.id}" uk-tooltip="Edit the Node">
                    <span uk-icon="icon: pencil;"></span>
                </button>
                <button class="uk-button kp-btn-secondary kp-btn-sm" data-action="node-remove" data-nid="${n.id}" uk-tooltip="Remove the Node">
                    <span uk-icon="icon: trash;"></span>
                </button>
                ${n.status === NODE_PAIRED ? `
                <button class="uk-button kp-btn-danger kp-btn-sm" data-action="node-force-remove" data-nid="${n.id}" uk-tooltip="Force remove without the child">
                    <span uk-icon="icon: ban;"></span>
                </button>` : ""}
            </div>
        </td>
    </tr>`;
}

async function onNodeAction(e, root, nodes, params, signal) {
    const btn = e.target.closest("[data-action^='node-']");
    if (!btn) return;
    e.stopPropagation();
    const node = nodes.find((n) => n.id === Number(btn.dataset.nid));

    try {
        switch (btn.dataset.action) {
            case "node-add": {
                const v = await showAddNodeModal();
                if (!v) return;
                const res = await api.post("/nodes", v);
                openNodeLink(res.link);
                toast.success("Finish pairing in the new tab");
                await viewNodes(root, params, signal);
                break;
            }
            case "node-open": {
                const res = await api.post(`/nodes/${node.id}/sso`);
                openNodeLink(res.link);
                break;
            }
            case "node-edit": {
                const v = await showEditNodeModal(node);
                if (!v) return;
                const res = await api.put(`/nodes/${node.id}`, v);
                if (res?.link) {
                    openNodeLink(res.link);
                    toast.success("Finish the update in the new tab");
                } else {
                    toast.success("Node updated");
                }
                await viewNodes(root, params, signal);
                break;
            }
            case "node-remove": {
                const paired = node.status === NODE_PAIRED;
                const ok = await confirm("Remove Node", paired
                    ? `Unpair ${node.name}? The child opens in a new tab to drop this parent and its synced users.`
                    : `Remove the pending node ${node.name}?`);
                if (!ok) return;
                const res = await api.delete(`/nodes/${node.id}`);
                if (res?.link) {
                    openNodeLink(res.link);
                    toast.success("Finish unpairing in the new tab");
                } else {
                    toast.success("Node removed");
                    await viewNodes(root, params, signal);
                }
                break;
            }
            case "node-force-remove": {
                const ok = await confirm("Force Remove Node", `Remove ${node.name} here without contacting it? Only for a child that is gone — a live child keeps trusting this parent until it is unparented on that host.`);
                if (!ok) return;
                await api.delete(`/nodes/${node.id}?force=1`);
                toast.success("Node removed");
                await viewNodes(root, params, signal);
                break;
            }
        }
    } catch (err) {
        toast.error(err.message);
    }
}

// openNodeLink opens a node link in a new tab with no opener and no referrer,
// so the child can neither script this tab nor learn this parent from the request
export function openNodeLink(link) {
    const a = document.createElement("a");
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
}
