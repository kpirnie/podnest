// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

function askPassphrase(title, label) {
    return new Promise((resolve) => {
        const el = document.createElement("div");
        el.className = "uk-flex-top";
        el.innerHTML = `
            <div class="uk-modal-dialog uk-modal-body kp-modal uk-margin-auto-vertical" style="max-width:420px">
                <h3 class="uk-modal-title"></h3>
                <form class="uk-form-stacked">
                    <label class="kp-label">
                        <span></span>
                        <input class="uk-input kp-input" type="password" autocomplete="off" required autofocus>
                    </label>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button class="uk-button kp-btn-ghost uk-modal-close" type="button">Cancel</button>
                        <button class="uk-button kp-btn-primary" type="submit">Continue</button>
                    </div>
                </form>
            </div>`;
        el.querySelector(".uk-modal-title").textContent = title;
        el.querySelector("label span").textContent = label;
        const input = el.querySelector("input");
        document.body.append(el);

        const modal = UIkit.modal(el);
        let passphrase = null;
        el.querySelector("form").addEventListener("submit", (event) => {
            event.preventDefault();
            passphrase = input.value;
            input.value = "";
            modal.hide();
        });
        el.addEventListener("hidden", () => {
            input.value = "";
            modal.$destroy(true);
            resolve(passphrase);
        }, { once: true });
        modal.show();
    });
}

async function migrationRequest(url, body, contentType) {
    const headers = { "X-CSRF-Token": window.KP?.csrf ?? "" };
    if (contentType) headers["Content-Type"] = contentType;
    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return res;
}

export async function exportMigration(url, filename) {
    const passphrase = await askPassphrase("Export Encrypted Settings", "Passphrase (at least 12 characters)");
    if (passphrase === null) return;
    const res = await migrationRequest(url, JSON.stringify({ passphrase }), "application/json");
    const objectURL = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = objectURL;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
}

export async function importMigration(url, file) {
    const passphrase = await askPassphrase("Import Encrypted Settings", "Passphrase");
    if (passphrase === null) return null;
    const body = new FormData();
    body.append("file", file);
    body.append("passphrase", passphrase);
    const res = await migrationRequest(url, body);
    return res.json();
}
