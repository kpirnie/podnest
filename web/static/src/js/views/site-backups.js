"use strict";

import { api } from '../api.js';
import { confirm, hideProgressModal, showProgressModal } from '../helpers.js';
import { toast } from '../toast.js';

// renderBackupsTab returns the static HTML shell for the backups tab
export function renderBackupsTab(siteId) {
    return `
        <div id="backups-panel" data-site-id="${siteId}">

            <!-- repo config card -->
            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">Backup Destinations</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-repo-save">
                        <span uk-icon="check"></span> Save
                    </button>
                </div>
                <div class="uk-flex" style="gap:24px;flex-wrap:wrap" id="backup-repo-toggles">
                    <label class="uk-flex uk-flex-middle" style="gap:8px;cursor:pointer">
                        <input type="checkbox" class="uk-checkbox" id="backup-local-enabled">
                        <span class="kp-text">Local (SFTP accessible)</span>
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
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="backup-run-btn">
                        <span uk-icon="cloud-upload"></span> Back Up Now
                    </button>
                </div>
                <div id="backup-error-banner"></div>
                <div id="backup-list-wrap">
                    <div uk-spinner="ratio: 0.8" style="color:var(--kp-blue)"></div>
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

    const fmtSize = (bytes) => {
        if (bytes < 1024)       return `${bytes} B`;
        if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
        return `${(bytes / 1073741824).toFixed(2)} GB`;
    };

    const rows = backups.map((b) => `
        <tr>
            <td class="kp-mono" style="font-size:0.8rem">${b.SnapshotID}</td>
            <td>${b.Label || '—'}</td>
            <td>${typeLabel(b.BackupType)}</td>
            <td>${fmtSize(b.SizeBytes)}</td>
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
        </table>`;
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
                        <p><strong>Last scheduled backup failed${at}:</strong> ${repo.last_error}</p>
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
            `<p class="kp-muted uk-text-small">Failed to load backups: ${err.message}</p>`;
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
        const deadline = Date.now() + 10 * 60 * 1000;
        const poll = setInterval(async () => {
            try {
                const backups = await api.get(`/sites/${siteId}/backups`);
                if ((backups?.length ?? 0) > countBefore || Date.now() > deadline) {
                    clearInterval(poll);
                    hideProgressModal();
                    await loadBackupsPanel(root, siteId);
                    if (Date.now() <= deadline) toast.success("Backup complete");
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

            showProgressModal(
                "Preparing Download",
                "Your backup archive is being generated — this may take a moment depending on site size. Your download will begin automatically. Do not close this tab."
            );

            // give the modal time to render before the browser download dialog
            // potentially blocks the UI, then trigger via a hidden anchor
            setTimeout(() => {
                const a = document.createElement("a");
                a.href = `/api/sites/${siteId}/backups/${bid}/download`;
                a.style.display = "none";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // dismiss the modal after a reasonable delay — we can't detect
                // when the browser finishes downloading so we give it 5 seconds
                // which is enough time for the response headers to arrive and
                // the save dialog to appear
                setTimeout(() => {
                    hideProgressModal();
                }, 5000);
            }, 300);

            return;
        }
        
    });
}
