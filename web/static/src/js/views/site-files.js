// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { confirm, emptyState, errorState, escapeHtml, fmtBytes, spinner } from '../helpers.js';
import { toast } from '../toast.js';

// current working directory within the html root, relative and slash-free at the root
let _cwd = "";

// renderFilesTab returns the static HTML shell for the file manager tab
export function renderFilesTab(id) {
    return `
        <div class="kp-card uk-padding uk-margin-top" id="fm-root" data-site="${id}">
            <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-bottom" style="gap:8px;flex-wrap:wrap">
                <nav id="fm-breadcrumb" class="kp-fm-breadcrumb uk-text-small"></nav>
                <div class="uk-flex" style="gap:8px;flex-wrap:wrap">
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="fm-new-file" uk-tooltip="New File"><span uk-icon="file-edit"></span></button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="fm-new-dir" uk-tooltip="New Folder"><span uk-icon="folder"></span></button>
                    <label class="uk-button kp-btn-ghost kp-btn-sm" style="cursor:pointer" uk-tooltip="Upload">
                        <span uk-icon="upload"></span>
                        <input type="file" id="fm-upload" multiple style="display:none">
                    </label>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="fm-refresh" uk-tooltip="Refresh"><span uk-icon="refresh"></span></button>
                </div>
            </div>
            <div id="fm-list"></div>
        </div>`;
}

// renderBreadcrumb builds the clickable path trail from the current directory
function renderBreadcrumb() {
    const parts = _cwd ? _cwd.split("/") : [];
    let acc = "";
    const crumbs = [`<a href="#" data-path="">html</a>`];
    for (const p of parts) {
        acc = acc ? acc + "/" + p : p;
        crumbs.push(`<span class="kp-fm-sep">/</span><a href="#" data-path="${escapeHtml(acc)}">${escapeHtml(p)}</a>`);
    }
    return crumbs.join("");
}

// fmtDate renders an ISO timestamp as a compact local date-time
function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// entryIcon maps a find type code to a UIkit icon
function entryIcon(type) {
    if (type === "d") return "folder";
    if (type === "l") return "link";
    return "file-text";
}

// join concatenates the current directory with a leaf name
function join(dir, name) {
    return dir ? dir + "/" + name : name;
}


// EDITABLE lists extensions (and bare dotfile names) the text editor accepts.
// Anything not listed shows no pencil — download only.
const EDITABLE = new Set([
    "php", "js", "jsx", "ts", "tsx", "css", "scss", "sass", "less",
    "html", "htm", "xml", "json", "txt", "md", "markdown", "yml", "yaml",
    "ini", "conf", "cnf", "toml", "env", "sh", "bash", "sql", "log",
    "csv", "tsv", "svg", "htaccess", "gitignore", "lock", "map",
]);

// isEditable reports whether a file should offer the in-browser text editor
function isEditable(name, isDir) {
    if (isDir) return false;
    const dot = name.lastIndexOf(".");
    // leading-dot files (.htaccess, .env) — match on the part after the dot
    if (name.startsWith(".") && dot === 0) return EDITABLE.has(name.slice(1).toLowerCase());
    return dot >= 0 && EDITABLE.has(name.slice(dot + 1).toLowerCase());
}

// renderRows builds the listing table body from the entries array
function renderRows(entries) {
    if (!entries || !entries.length) return emptyState("folder", "This folder is empty");

    const siteId = document.getElementById("fm-root").dataset.site;

    const rows = entries.map(e => {
        const rel = join(_cwd, e.name);
        const isDir = e.is_dir;
        const editable = isEditable(e.name, isDir);

        // only directories are clickable in the name cell; files are inert text
        const nameCell = isDir
            ? `<a href="#" class="fm-nav" data-path="${escapeHtml(rel)}"><span uk-icon="icon: ${entryIcon(e.type)}; ratio: 0.9"></span> ${escapeHtml(e.name)}</a>`
            : `<span><span uk-icon="icon: ${entryIcon(e.type)}; ratio: 0.9"></span> ${escapeHtml(e.name)}</span>`;

        return `
            <tr data-path="${escapeHtml(rel)}" data-name="${escapeHtml(e.name)}" data-dir="${isDir ? 1 : 0}" data-mode="${escapeHtml(e.mode)}">
                <td class="kp-fm-name">${nameCell}</td>
                <td class="uk-text-nowrap">${fmtBytes(e.size, isDir)}</td>
                <td><code class="kp-mono">${escapeHtml(e.mode)}</code></td>
                <td class="uk-text-nowrap uk-text-small kp-muted">${fmtDate(e.mod_time)}</td>
                <td class="uk-text-right uk-text-nowrap">
                    ${editable ? `<button class="kp-fm-act fm-edit" data-path="${escapeHtml(rel)}" uk-tooltip="Edit"><span uk-icon="icon: pencil; ratio: 0.85"></span></button>` : ""}
                    ${isDir ? "" : `<a class="kp-fm-act fm-download" href="/api/sites/${siteId}/files/download?path=${encodeURIComponent(rel)}" uk-tooltip="Download"><span uk-icon="icon: download; ratio: 0.85"></span></a>`}
                    <button class="kp-fm-act fm-chmod" uk-tooltip="Permissions"><span uk-icon="icon: settings; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-rename" uk-tooltip="Rename / Move"><span uk-icon="icon: move; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-copy" uk-tooltip="Copy"><span uk-icon="icon: copy; ratio: 0.85"></span></button>
                    <button class="kp-fm-act fm-delete" uk-tooltip="Delete"><span uk-icon="icon: trash; ratio: 0.85"></span></button>
                </td>
            </tr>`;
    }).join("");

    return `
        <table class="uk-table uk-table-divider uk-table-small uk-table-middle kp-fm-table">
            <thead>
                <tr>
                    <th>Name</th><th>Size</th><th>Perms</th><th>Modified</th><th></th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// loadFilesPanel fetches and renders the listing for the current directory
export async function loadFilesPanel(id) {
    const list = document.getElementById("fm-list");
    const crumb = document.getElementById("fm-breadcrumb");
    if (!list) return;
    list.innerHTML = spinner();
    if (crumb) crumb.innerHTML = renderBreadcrumb();

    try {
        const entries = await api.get(`/sites/${id}/files?path=${encodeURIComponent(_cwd)}`);
        list.innerHTML = renderRows(entries);
    } catch (e) {
        list.innerHTML = errorState("Failed to list files: " + e.message);
    }
}

// navigate changes the current directory and reloads the listing
function navigate(id, path) {
    _cwd = path || "";
    loadFilesPanel(id);
}

// fmPrompt shows a single-input modal and resolves with the trimmed value or null
function fmPrompt(title, label, initial = "") {
    return new Promise((resolve) => {
        const mid = "fm-prompt-modal";
        document.getElementById(mid)?.remove();
        const el = document.createElement("div");
        el.id = mid;
        el.setAttribute("uk-modal", "");
        el.innerHTML = `
            <div class="uk-modal-dialog uk-modal-body kp-modal">
                <h3 class="uk-modal-title">${escapeHtml(title)}</h3>
                <label class="kp-label uk-margin-small-bottom">${escapeHtml(label)}</label>
                <input class="uk-input kp-input" id="fm-prompt-input" value="${escapeHtml(initial)}" autocomplete="off">
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                    <button class="uk-button kp-btn-primary" id="fm-prompt-ok">OK</button>
                </div>
            </div>`;
        document.body.appendChild(el);
        if (window.UIkit) UIkit.icon(el);
        const modal = UIkit.modal(el);
        const input = el.querySelector("#fm-prompt-input");
        let settled = false;

        const done = (val) => { if (!settled) { settled = true; resolve(val); modal.hide(); } };
        el.querySelector("#fm-prompt-ok").addEventListener("click", () => done(input.value.trim() || null));
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); done(input.value.trim() || null); } });
        UIkit.util.on(el, "hidden", () => { if (!settled) { settled = true; resolve(null); } el.remove(); });
        modal.show();
        setTimeout(() => input.focus(), 50);
    });
}

// uploadFile streams a single File to the current directory, bypassing the JSON
// api helper so the raw bytes are sent as the request body
async function uploadFile(id, file) {
    const dest = join(_cwd, file.name);
    const res = await fetch(`/api/sites/${id}/files/upload?path=${encodeURIComponent(dest)}`, {
        method: "POST",
        headers: { "X-CSRF-Token": window.KP?.csrf ?? "" },
        body: file,
    });
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
}

// wireFilesTab binds all toolbar, breadcrumb, and row actions via delegation
export function wireFilesTab(root, id) {

    // fresh mount always starts at the html root
    _cwd = "";

    // breadcrumb + directory navigation
    root.addEventListener("click", (e) => {
        const crumb = e.target.closest("#fm-breadcrumb a");
        if (crumb) { e.preventDefault(); navigate(id, crumb.dataset.path); return; }
        const nav = e.target.closest(".fm-nav");
        if (nav) { e.preventDefault(); navigate(id, nav.dataset.path); return; }
        const edit = e.target.closest(".fm-edit");
        if (edit) { e.preventDefault(); openEditor(id, edit.dataset.path, edit.dataset.path.split("/").pop()); return; }
    });

    // toolbar: new file
    root.querySelector("#fm-new-file")?.addEventListener("click", async () => {
        const name = await fmPrompt("New File", "File name");
        if (!name) return;
        try { await api.post(`/sites/${id}/files/file`, { path: join(_cwd, name) }); loadFilesPanel(id); }
        catch (err) { toast.error(err.message); }
    });

    // toolbar: new folder
    root.querySelector("#fm-new-dir")?.addEventListener("click", async () => {
        const name = await fmPrompt("New Folder", "Folder name");
        if (!name) return;
        try { await api.post(`/sites/${id}/files/dir`, { path: join(_cwd, name) }); loadFilesPanel(id); }
        catch (err) { toast.error(err.message); }
    });

    // toolbar: upload (one or more files)
    root.querySelector("#fm-upload")?.addEventListener("change", async (e) => {
        const files = [...e.target.files];
        if (!files.length) return;
        try {
            for (const f of files) await uploadFile(id, f);
            toast.success(files.length === 1 ? "File uploaded" : `${files.length} files uploaded`);
            loadFilesPanel(id);
        } catch (err) {
            toast.error(err.message);
        } finally {
            e.target.value = "";
        }
    });

    // toolbar: refresh
    root.querySelector("#fm-refresh")?.addEventListener("click", () => loadFilesPanel(id));

    // row actions: chmod / rename / copy / delete
    root.addEventListener("click", async (e) => {
        const tr = e.target.closest("tr[data-path]");
        if (!tr) return;
        const relPath = tr.dataset.path;
        const name = tr.dataset.name;

        if (e.target.closest(".fm-chmod")) {
            const mode = await fmPrompt("Permissions", `Octal mode for "${name}"`, tr.dataset.mode);
            if (!mode) return;
            try { await api.patch(`/sites/${id}/files/chmod`, { path: relPath, mode }); loadFilesPanel(id); }
            catch (err) { toast.error(err.message); }
            return;
        }

        if (e.target.closest(".fm-rename")) {
            const next = await fmPrompt("Rename / Move", "New path (relative to current folder)", name);
            if (!next || next === name) return;
            try { await api.post(`/sites/${id}/files/move`, { src: relPath, dst: join(_cwd, next) }); loadFilesPanel(id); }
            catch (err) { toast.error(err.message); }
            return;
        }

        if (e.target.closest(".fm-copy")) {
            const next = await fmPrompt("Copy", "Destination name", name + "-copy");
            if (!next) return;
            try { await api.post(`/sites/${id}/files/copy`, { src: relPath, dst: join(_cwd, next) }); loadFilesPanel(id); }
            catch (err) { toast.error(err.message); }
            return;
        }

        if (e.target.closest(".fm-delete")) {
            const ok = await confirm("Delete", `Delete "${name}"? This cannot be undone.`);
            if (!ok) return;
            try { await api.delete(`/sites/${id}/files?path=${encodeURIComponent(relPath)}`); loadFilesPanel(id); }
            catch (err) { toast.error(err.message); }
            return;
        }
    });
}

// _cmReady memoises the one-time CodeMirror asset load
let _cmReady = null;

// loadCss injects a stylesheet link once, keyed by href
function loadCss(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
}

// loadScript injects a script and resolves when it has loaded; jsdelivr is a
// CSP-whitelisted host so no nonce is required for these external sources
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded) return resolve();
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("failed to load " + src)));
            return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.addEventListener("load", () => { s.dataset.loaded = "1"; resolve(); });
        s.addEventListener("error", () => reject(new Error("failed to load " + src)));
        document.head.appendChild(s);
    });
}

// ensureCodeMirror lazy-loads CodeMirror 5 plus mode autoloading, exactly once.
// Modes are fetched on demand from jsdelivr via the loadmode addon.
function ensureCodeMirror() {
    if (_cmReady) return _cmReady;
    const base = "https://cdn.jsdelivr.net/npm/codemirror@5";
    loadCss(`${base}/lib/codemirror.css`);
    loadCss(`${base}/theme/material-darker.css`);

    _cmReady = loadScript(`${base}/lib/codemirror.js`)
        .then(() => Promise.all([
            loadScript(`${base}/mode/meta.js`),
            loadScript(`${base}/addon/mode/loadmode.js`),
        ]))
        .then(() => {
            // point the autoloader at jsdelivr so detected modes resolve there
            window.CodeMirror.modeURL = `${base}/mode/%N/%N.js`;
        });
    return _cmReady;
}

// modeFor returns the CodeMirror mode spec for a filename, defaulting to plain text
function modeFor(name) {
    const info = window.CodeMirror.findModeByFileName(name);
    return info ? info.mode : null;
}

// openEditor reads a text file and opens it in a CodeMirror editor modal
async function openEditor(id, relPath, name) {

    // pull the file first so size/binary/type errors surface before the modal opens
    let file;
    try {
        file = await api.get(`/sites/${id}/files/content?path=${encodeURIComponent(relPath)}`);
    } catch (err) {
        const msg = /too large/i.test(err.message) ? "File is too large to edit — download it instead."
            : /binary/i.test(err.message) ? "Binary file — download it instead of editing."
            : err.message;
        toast.error(msg);
        return;
    }

    try {
        await ensureCodeMirror();
    } catch (err) {
        toast.error("Editor failed to load: " + err.message);
        return;
    }

    // build the editor modal shell
    const mid = "fm-editor-modal";
    document.getElementById(mid)?.remove();
    const el = document.createElement("div");
    el.id = mid;
    el.setAttribute("uk-modal", "");
    el.innerHTML = `
        <div class="uk-modal-dialog kp-modal kp-fm-editor-dialog">
            <div class="uk-flex uk-flex-middle uk-flex-between uk-padding-small">
                <h3 class="uk-modal-title uk-margin-remove"><span uk-icon="file-text"></span> ${escapeHtml(name)} <span id="fm-ed-dirty" class="kp-muted uk-text-small" hidden>• unsaved</span></h3>
                <div class="uk-flex" style="gap:8px">
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="fm-ed-save"><span uk-icon="icon: check; ratio: 0.85"></span> Save</button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm uk-modal-close"><span uk-icon="icon: close; ratio: 0.85"></span></button>
                </div>
            </div>
            <div class="kp-fm-editor-body">
                <textarea id="fm-ed-area"></textarea>
            </div>
        </div>`;
    document.body.appendChild(el);
    if (window.UIkit) UIkit.icon(el);

    const modal = UIkit.modal(el, { bgClose: false, escClose: true });
    const dirtyTag = el.querySelector("#fm-ed-dirty");

    // instantiate CodeMirror once the modal is shown so it sizes correctly
    let cm = null;
    let clean = true;
    const markDirty = (d) => { clean = !d; dirtyTag.hidden = !d; };

    UIkit.util.on(el, "shown", () => {
        if (cm) return;
        cm = window.CodeMirror.fromTextArea(el.querySelector("#fm-ed-area"), {
            value: file.content,
            lineNumbers: true,
            theme: "material-darker",
            indentUnit: 4,
            lineWrapping: false,
            extraKeys: {
                "Ctrl-S": doSave,
                "Cmd-S": doSave,
                "Ctrl-F": "findPersistent",
                "Ctrl-/": "toggleComment",
            },
        });
        cm.setValue(file.content);
        cm.on("change", () => markDirty(true));

        // detect and autoload the syntax mode for this filename
        const mode = modeFor(name);
        if (mode) {
            cm.setOption("mode", mode);
            window.CodeMirror.autoLoadMode(cm, mode);
        }
        setTimeout(() => cm.refresh(), 30);
    });

    UIkit.util.on(el, "hidden", () => el.remove());

    // doSave persists the current buffer; bound to the button and Ctrl/Cmd-S
    async function doSave() {
        if (!cm) return;
        const btn = el.querySelector("#fm-ed-save");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div>';
        try {
            await api.put(`/sites/${id}/files/content`, { path: relPath, content: cm.getValue() });
            markDirty(false);
            toast.success("Saved");
            loadFilesPanel(id);
        } catch (err) {
            toast.error(err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    }

    el.querySelector("#fm-ed-save").addEventListener("click", doSave);

    // warn before discarding unsaved changes
    UIkit.util.on(el, "beforehide", (e) => {
        if (!clean && !window.confirm("Discard unsaved changes?")) e.preventDefault();
    });

    modal.show();
}