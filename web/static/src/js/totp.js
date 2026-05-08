"use strict";

import { router } from './router.js';

// renderQR generates a QR code via QRCode.toDataURL and shows it as an <img>.
// Falls back to displaying the raw URI as text if the library isn't available.
export async function renderQR(uri) {
    const img  = document.getElementById("totp-qr-img");
    const wrap = document.getElementById("totp-qr-wrap");
    if (!img || !wrap) return;

    wrap.querySelectorAll(".totp-uri-text").forEach(el => el.remove());

    if (typeof QRCode !== "undefined") {
        try {
            const dataUrl = await new Promise((resolve, reject) => {
                QRCode.toDataURL(uri, { width: 220, margin: 2 }, (err, url) => {
                    if (err) reject(err); else resolve(url);
                });
            });
            img.src = dataUrl;
            img.style.display = "";
            return;
        } catch (_) {}
    }

    const p = document.createElement("p");
    p.className = "totp-uri-text kp-muted uk-text-small";
    p.style.wordBreak = "break-all";
    p.textContent = uri;
    wrap.appendChild(p);
}

// showBackupCodes displays a blocking modal with the one-time backup codes.
export function showBackupCodes(codes) {
    document.getElementById("kp-backup-codes-modal")?.remove();

    const rows = codes.map(c => `<code class="kp-backup-code">${c}</code>`).join("");

    const html = `
        <div id="kp-backup-codes-modal" uk-modal="bg-close:false;esc-close:false">
            <div class="uk-modal-dialog kp-modal uk-modal-body" style="max-width:480px">
                <h3 class="uk-modal-title" style="color:var(--kp-yellow,#f0b429)">
                    <span uk-icon="warning"></span>&nbsp;Save Your Backup Codes
                </h3>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    These codes let you access your account if you lose your authenticator.
                    Each code works <strong>once only</strong>. Keep them somewhere safe.
                </p>
                <div class="kp-backup-codes-grid uk-margin-small">${rows}</div>
                <p class="kp-muted uk-text-small uk-margin-small-top">
                    These codes will <strong>not</strong> be shown again.
                </p>
                <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                    <button id="kp-backup-copy-btn" class="uk-button kp-btn-ghost">Copy All</button>
                    <button id="kp-backup-done-btn" class="uk-button kp-btn-primary">I've Saved These</button>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML("beforeend", html);
    const m = UIkit.modal("#kp-backup-codes-modal");
    m.show();

    document.getElementById("kp-backup-copy-btn").addEventListener("click", () => {
        const text = codes.join("\n");
        const btn  = document.getElementById("kp-backup-copy-btn");
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => { btn.textContent = "Copied!"; });
        } else {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.cssText = "position:fixed;opacity:0";
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand("copy"); btn.textContent = "Copied!"; } catch (_) {}
            ta.remove();
        }
    });

    document.getElementById("kp-backup-done-btn").addEventListener("click", () => {
        m.hide();
        document.getElementById("kp-backup-codes-modal")?.remove();
        router.go("users");
    });
}
