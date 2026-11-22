// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

function askPassphrase(label) {
    return new Promise((resolve) => {
        const dialog = document.createElement("dialog");
        dialog.innerHTML = `
            <form method="dialog" class="uk-padding-small">
                <label class="uk-form-label">
                    <span></span>
                    <input class="uk-input" type="password" required autofocus>
                </label>
                <div class="uk-margin-small-top">
                    <button class="uk-button uk-button-default" value="cancel" formnovalidate>Cancel</button>
                    <button class="uk-button uk-button-primary" value="submit">Continue</button>
                </div>
            </form>`;
        dialog.querySelector("span").textContent = label;
        dialog.addEventListener("close", () => {
            resolve(dialog.returnValue === "submit" ? dialog.querySelector("input").value : null);
            dialog.remove();
        }, { once: true });
        document.body.append(dialog);
        dialog.showModal();
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
    const passphrase = await askPassphrase("Export passphrase (at least 12 characters)");
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
    const passphrase = await askPassphrase("Import passphrase");
    if (passphrase === null) return null;
    const body = new FormData();
    body.append("file", file);
    body.append("passphrase", passphrase);
    const res = await migrationRequest(url, body);
    return res.json();
}
