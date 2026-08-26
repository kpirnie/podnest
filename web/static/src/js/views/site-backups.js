// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { confirm, escapeHtml, fmtBytes, hideProgressModal, showProgressModal } from '../helpers.js';
import { toast } from '../toast.js';

// renderBackupsTab returns the static HTML shell for the backups tab
export function renderBackupsTab(siteId) {
    return `
        <div id="backups-panel" data-site-id="${siteId}">

            <!-- repo config card -->
            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Backup Destinations</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-repo-save" uk-tooltip="Save Your Backup Configuration">
                        <span uk-icon="check"></span>
                    </button>
                </div>
                <div class="uk-flex" style="gap:24px;flex-wrap:wrap" id="backup-repo-toggles">
                    <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                        <input type="checkbox" class="uk-checkbox" id="backup-local-enabled">
                        <span class="kp-text">Local</span>
                    </label>
                    <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                        <input type="checkbox" class="uk-checkbox" id="backup-s3-enabled">
                        <span class="kp-text">S3</span>
                    </label>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    Local backups are stored under the site's SFTP home directory and are accessible
                    over SFTP as <span class="kp-mono">backups/local/</span>. S3 requires global S3
                    credentials to be configured under Settings.
                </p>
            </div>

            <!-- backup list card -->
            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Snapshots</h3>
                    <div class="uk-flex" style="gap:6px">
                        <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-run-btn" uk-tooltip="Run a Manual Backup">
                            <span uk-icon="cloud-upload"></span>
                        </button>
                        <button class="uk-button kp-btn-secondary kp-btn-sm" id="backup-import-btn"
                            uk-toggle="target: #import-backup-modal" uk-tooltip="Import a backup archive">
                            <span uk-icon="upload"></span>
                        </button>
                    </div>
                </div>
                <div id="backup-error-banner"></div>
                <div id="backup-list-wrap">
                    <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
                </div>
            </div>

            <!-- import modal -->
            <div id="import-backup-modal" uk-modal>
                <div class="uk-modal-dialog uk-modal-body">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-small-bottom">Import Backup Archive</h3>

                    <!-- target site selector -->
                    <div class="uk-margin-small">
                        <label class="uk-form-label kp-text">Restore To</label>
                        <select class="uk-select kp-input" id="import-target-site"></select>
                    </div>

                    <hr class="uk-divider-small">

                    <!-- upload section -->
                    <h4 class="kp-text uk-margin-small-bottom">Upload Archive</h4>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Maximum upload size is <strong>512 MB</strong>. For larger archives, transfer
                        the file to <span class="kp-mono">backups/import/</span> via SFTP and use
                        the <em>Import from SFTP</em> section below.
                    </p>
                    <div class="uk-margin-small">
                        <input type="file" class="uk-input kp-input" id="import-file-input"
                            accept=".tar.gz,.tar.xz,.zip">
                    </div>
                    <button class="uk-button kp-btn-primary kp-btn-sm uk-margin-small-top" id="import-upload-btn">
                        Upload &amp; Restore
                    </button>

                    <hr class="uk-divider-small uk-margin-small">

                    <!-- SFTP section -->
                    <h4 class="kp-text uk-margin-small-bottom">Import from SFTP</h4>
                    <p class="kp-muted uk-text-small uk-margin-small-bottom">
                        Files found in <span class="kp-mono">backups/import/</span> on this site's SFTP.
                    </p>
                    <div id="import-sftp-list">
                        <div uk-spinner="ratio: 0.6" style="color:var(--kp-blue)"></div>
                    </div>
                </div>
            </div>

        </div>`;
}

// renderBackupList returns the table HTML for a list of backup records
function renderBackupList(backups) {
    if (!backups || backups.length === 0) {
        return `<p class="kp-muted uk-text-small uk-margin-remove">No snapshots yet.</p>`;
    }

    const typeLabel = (t) => t === 2
        ? `<span class="kp-mono" style="color:var(--kp-cyan)">S3</span>`
        : `<span class="kp-mono" style="color:var(--kp-blue)">Local</span>`;

    const rows = backups.map((b) => `
        <tr>
            <td class="kp-mono" style="font-size:0.8rem">${escapeHtml(b.SnapshotID)}</td>
            <td>${b.Label ? escapeHtml(b.Label) : '—'}</td>
            <td>${typeLabel(b.BackupType)}</td>
            <td>${fmtBytes(b.SizeBytes)}</td>
            <td>${new Date(b.Created).toLocaleString()}</td>
            <td>
                <div class="uk-flex" style="gap:6px">
                    <button class="uk-button kp-btn-ghost kp-btn-sm backup-download-btn"
                        data-id="${b.ID}" uk-tooltip="Download backup archive">
                        <span uk-icon="download"></span>
                    </button>
                    <button class="uk-button kp-btn-secondary kp-btn-sm backup-restore-btn"
                        data-id="${b.ID}" uk-tooltip="Restore from this snapshot">
                        <span uk-icon="history"></span>
                    </button>
                    <button class="uk-button kp-btn-danger kp-btn-sm backup-delete-btn"
                        data-id="${b.ID}" uk-tooltip="Delete this snapshot">
                        <span uk-icon="trash"></span>
                    </button>
                </div>
            </td>
        </tr>`).join("");

    return `
        <div class="uk-overflow-auto">
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead>
                <tr>
                    <th>Snapshot ID</th>
                    <th>Label</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Created</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        </div>`;
}

// pollRestoreStatus polls the restore-status endpoint and dismisses the
// progress modal once the restore completes or the deadline is exceeded
function pollRestoreStatus(root, siteId) {
    const deadline = Date.now() + 30 * 60 * 1000;
    const poll = setInterval(async () => {
        try {
            const res = await api.get(`/sites/${siteId}/backups/restore-status`);
            if (!res?.active || Date.now() > deadline) {
                clearInterval(poll);
                hideProgressModal();
                if (!res?.active) {
                    toast.success('Import complete');
                } else {
                    toast.error('Import timed out — check server logs');
                }
                await loadBackupsPanel(root, siteId);
            }
        } catch (_) { /* keep polling on transient errors */ }
    }, 3000);
}

// loadBackupsPanel fetches repo config and backup list and populates the panel
export async function loadBackupsPanel(root, siteId) {
    try {
        const [repo, backups] = await Promise.all([
            api.get(`/sites/${siteId}/backup-repo`),
            api.get(`/sites/${siteId}/backups`),
        ]);

        // populate repo destination toggles
        const localChk = root.querySelector("#backup-local-enabled");
        const s3Chk    = root.querySelector("#backup-s3-enabled");
        if (localChk) localChk.checked = !!repo.LocalEnabled;
        if (s3Chk)    s3Chk.checked    = !!repo.S3Enabled;

        // show a warning banner if the last scheduled backup failed
        const errBanner = root.querySelector("#backup-error-banner");
        if (errBanner) {
            if (repo.last_error) {
                const at = repo.last_error_at
                    ? ` (${new Date(repo.last_error_at).toLocaleString()})`
                    : "";
                errBanner.innerHTML = `
                    <div uk-alert class="uk-alert-warning">
                        <a class="uk-alert-close" uk-close></a>
                        <p><strong>Last scheduled backup failed${at}:</strong> ${escapeHtml(repo.last_error)}</p>
                    </div>`;
            } else {
                errBanner.innerHTML = "";
            }
        }

        // populate the backup list
        const listWrap = root.querySelector("#backup-list-wrap");
        if (listWrap) listWrap.innerHTML = renderBackupList(backups);

    } catch (err) {
        const listWrap = root.querySelector("#backup-list-wrap");
        if (listWrap) listWrap.innerHTML =
            `<p class="kp-muted uk-text-small">Failed to load backups: ${escapeHtml(err.message)}</p>`;
    }
}

// wireBackupsPanel attaches all event listeners for the backups tab
export function wireBackupsPanel(root, siteId) {

    // -- save repo destination toggles ---------------------------------------
    root.querySelector("#backup-repo-save")?.addEventListener("click", async () => {
        const body = {
            local_enabled: root.querySelector("#backup-local-enabled")?.checked ?? false,
            s3_enabled:    root.querySelector("#backup-s3-enabled")?.checked    ?? false,
        };
        try {
            await api.put(`/sites/${siteId}/backup-repo`, body);
            toast.success("Backup destinations saved");
        } catch (err) {
            toast.error(err.message);
        }
    });

    // -- run backup now ------------------------------------------------------
    root.querySelector("#backup-run-btn")?.addEventListener("click", async () => {
        // snapshot the current count so we know when a new one arrives
        let countBefore = 0;
        try {
            const existing = await api.get(`/sites/${siteId}/backups`);
            countBefore = existing?.length ?? 0;
        } catch (_) { /* non-fatal */ }

        try {
            await api.post(`/sites/${siteId}/backups`, { label: "manual" });
        } catch (err) {
            toast.error(err.message);
            return;
        }

        showProgressModal("Backup Running", "Snapshotting files and database — this may take a few minutes.");

        // poll every 4 seconds until a new backup record appears, or 10 min timeout
        const deadline = Date.now() + 30 * 60 * 1000;
        const poll = setInterval(async () => {
            try {
                const backups = await api.get(`/sites/${siteId}/backups`);
                if ((backups?.length ?? 0) > countBefore || Date.now() > deadline) {
                    clearInterval(poll);
                    hideProgressModal();
                    await loadBackupsPanel(root, siteId);
                    if (Date.now() <= deadline) {
                        toast.success("Backup complete");
                    } else {
                        // backup is still running in the background — check logs
                        toast.error("Backup is taking longer than expected — check server logs for status");
                    }
                }
            } catch (_) { /* keep polling on transient errors */ }
        }, 4000);
    });

    // -- restore / delete (delegated to the list wrap) -----------------------
    root.querySelector("#backup-list-wrap")?.addEventListener("click", async (e) => {

        // restore
        const restoreBtn = e.target.closest(".backup-restore-btn");
        if (restoreBtn) {
            const bid = restoreBtn.dataset.id;
            const ok  = await confirm(
                "Restore Site",
                "This will restore the site from the selected snapshot. The site will show a maintenance page during the restore. Continue?"
            );
            if (!ok) return;

            try {
                await api.post(`/sites/${siteId}/backups/${bid}/restore`);
            } catch (err) {
                toast.error(err.message);
                return;
            }

            showProgressModal("Restore Running", "Restoring files and database — the site will return automatically when complete.");

            const startedAt = Date.now();
            const deadline = Date.now() + 15 * 60 * 1000;
            const poll = setInterval(async () => {
                try {
                    const res = await api.get(`/sites/${siteId}/backups/restore-status`);
                    if (!res?.active || Date.now() > deadline) {
                        clearInterval(poll);
                        hideProgressModal();
                        if (!res?.active) toast.success("Restore complete");
                        else toast.error("Restore timed out");
                        await loadBackupsPanel(root, siteId);
                    }
                } catch (_) { /* keep polling */ }
            }, 3000);

            return;
        }

        // delete
        const deleteBtn = e.target.closest(".backup-delete-btn");
        if (deleteBtn) {
            const bid = deleteBtn.dataset.id;
            const ok  = await confirm(
                "Delete Snapshot",
                "This will permanently remove the snapshot from all configured repositories. This cannot be undone."
            );
            if (!ok) return;

            showProgressModal("Deleting Snapshot", "Removing snapshot data from repositories — this may take a moment.");

            try {
                await api.delete(`/sites/${siteId}/backups/${bid}`);
                hideProgressModal();
                toast.success("Snapshot deleted");
                await loadBackupsPanel(root, siteId);
            } catch (err) {
                hideProgressModal();
                toast.error(err.message);
            }
        }

        // download
        const downloadBtn = e.target.closest(".backup-download-btn");
        if (downloadBtn) {
            const bid = downloadBtn.dataset.id;

            // correlation token — the server sets a cookie under this name once
            // staging is done and the download response headers are on the wire
            const dlToken = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
            const dlCookie = `kp_dl_${dlToken}`;

            showProgressModal(
                "Preparing Download",
                "Your backup archive is being generated — this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."
            );

            // give the modal time to render before the browser download dialog
            // potentially blocks the UI, then trigger via a hidden anchor
            setTimeout(() => {
                const a = document.createElement("a");
                a.href = `/api/sites/${siteId}/backups/${bid}/download?dl=${dlToken}`;
                a.style.display = "none";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // poll for the server's cookie — it lands when the download
                // actually starts, however long staging took
                const started = Date.now();
                const poll = setInterval(() => {
                    const hit = document.cookie
                        .split(";")
                        .some(c => c.trim().startsWith(`${dlCookie}=`));

                    // stop waiting after 30 minutes so the modal cannot stick
                    if (!hit && Date.now() - started < 1800000) {
                        return;
                    }
                    clearInterval(poll);
                    document.cookie = `${dlCookie}=; Path=/; Max-Age=0`;
                    hideProgressModal();
                }, 500);
            }, 300);
            
            return;
        }
        
    });

    // -- import modal --------------------------------------------------------

    const importModal = root.querySelector('#import-backup-modal');
    if (!importModal) return;

    // populate the target site dropdown when the modal opens
    UIkit.util.on(importModal, 'beforeshow', async () => {
        const select = importModal.querySelector('#import-target-site');
        try {
            const sites = await api.get('/sites');
            // siteId can arrive as a string — compare numerically or nothing
            // matches and the browser silently selects the first site instead
            const current = Number(siteId);
            select.innerHTML = sites
                .map(s => `<option value="${s.ID}"${Number(s.ID) === current ? ' selected' : ''}>${s.Name}</option>`)
                .join('');
        } catch (err) {
            select.innerHTML = '<option value="">Failed to load sites</option>';
        }

        // refresh the SFTP file list each time the modal opens
        const sftpList = importModal.querySelector('#import-sftp-list');
        try {
            const files = await api.get(`/sites/${siteId}/backups/import/files`);
            if (!files || files.length === 0) {
                sftpList.innerHTML = `<p class="kp-muted uk-text-small">No files found.</p>`;
            } else {
                sftpList.innerHTML = files.map(f => `
                    <div class="uk-flex uk-flex-middle uk-flex-between uk-margin-small-bottom">
                        <span class="kp-mono uk-text-small">${escapeHtml(f)}</span>
                        <button class="uk-button kp-btn-primary kp-btn-sm import-sftp-btn" data-file="${escapeHtml(f)}">
                            Restore
                        </button>
                    </div>`).join('');
            }
        } catch (err) {
            sftpList.innerHTML = `<p class="kp-muted uk-text-small">Failed to list files: ${escapeHtml(err.message)}</p>`;
        }
    });

    // upload & restore
    importModal.querySelector('#import-upload-btn')?.addEventListener('click', async () => {
        const fileInput = importModal.querySelector('#import-file-input');
        const targetID  = importModal.querySelector('#import-target-site')?.value;
        if (!fileInput?.files?.length) {
            toast.error('Select an archive file first');
            return;
        }
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('archive', file);
        formData.append('target_site_id', targetID);

        UIkit.modal(importModal).hide();
        showProgressModal('Importing Backup', 'Uploading and restoring — this may take several minutes.');

        try {
            await fetch(`/api/sites/${siteId}/backups/import/upload`, {
                method: 'POST',
                headers: { 'X-CSRF-Token': window.KP?.csrf ?? '' },
                body: formData,
                credentials: 'same-origin',
            }).then(async res => {
                if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j.error || `HTTP ${res.status}`);
                }
            });
        } catch (err) {
            hideProgressModal();
            toast.error(err.message);
            return;
        }

        pollRestoreStatus(root, siteId);
    });

    // SFTP restore (delegated)
    importModal.querySelector('#import-sftp-list')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('.import-sftp-btn');
        if (!btn) return;
        const filename = btn.dataset.file;
        const targetID = importModal.querySelector('#import-target-site')?.value;

        UIkit.modal(importModal).hide();
        showProgressModal('Importing from SFTP', 'Restoring archive — this may take several minutes.');

        try {
            await api.post(`/sites/${siteId}/backups/import/sftp`, {
                filename,
                target_site_id: parseInt(targetID, 10),
            });
        } catch (err) {
            hideProgressModal();
            toast.error(err.message);
            return;
        }

        pollRestoreStatus(root, siteId);
    });
}
