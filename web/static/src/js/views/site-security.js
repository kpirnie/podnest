"use strict";

import { api } from '../api.js';
import { toast } from '../toast.js';

// renderSecurityPanel renders the shared IP + UA security panel for either
// global scope (siteId null) or per-site scope (siteId set).
export function renderSecurityPanel(siteId = null) {
    const ipBase = siteId ? `/sites/${siteId}/security/ip` : `/security/ip`;
    const uaBase = siteId ? `/sites/${siteId}/security/ua` : `/security/ua`;

    return `
        <div id="security-panel" data-ip-base="${ipBase}" data-ua-base="${uaBase}">

            <div class="kp-card uk-padding-small uk-margin-bottom">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">IP Rules</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ip-save">
                        <span uk-icon="check"></span> Save IP Rules
                    </button>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One IP address or CIDR block per line (e.g. <span class="kp-mono">1.2.3.4</span>
                    or <span class="kp-mono">10.0.0.0/8</span>).
                    Blacklist always wins — a blacklisted IP cannot be whitelisted.
                    Whitelist is disabled when empty.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ip-whitelist" rows="6"
                            placeholder="# allow only these IPs&#10;1.2.3.4&#10;10.0.0.0/8"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ip-blacklist" rows="6"
                            placeholder="# block these IPs&#10;5.6.7.8&#10;192.168.99.0/24"></textarea>
                    </div>
                </div>
            </div>

            <div class="kp-card uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                    <h3 class="kp-view-title">User-Agent Rules</h3>
                    <button class="uk-button kp-btn-primary kp-btn-sm" id="sec-ua-save">
                        <span uk-icon="check"></span> Save UA Rules
                    </button>
                </div>
                <p class="kp-muted uk-text-small uk-margin-small-bottom">
                    One substring per line — matched case-insensitively against the full User-Agent header.
                    Blacklist always wins. Whitelist is disabled when empty.
                </p>
                <div class="uk-grid-small" uk-grid>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: check; ratio: 0.75" style="color:var(--kp-success)"></span>
                            Whitelist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ua-whitelist" rows="6"
                            placeholder="# allow only these agents&#10;mozilla&#10;googlebot"></textarea>
                    </div>
                    <div class="uk-width-1-2@s">
                        <label class="kp-label">
                            <span uk-icon="icon: ban; ratio: 0.75" style="color:var(--kp-danger)"></span>
                            Blacklist
                        </label>
                        <textarea class="uk-textarea kp-textarea" id="sec-ua-blacklist" rows="6"
                            placeholder="# block these agents&#10;sqlmap&#10;nikto&#10;masscan"></textarea>
                    </div>
                </div>
            </div>

        </div>`;
}

// loadSecurityPanel fetches the current rules from the API and populates the
// four textareas. Must be called after renderSecurityPanel has been inserted
// into the DOM.
export async function loadSecurityPanel(root) {
    const panel  = root.querySelector("#security-panel");
    if (!panel) return;

    const ipBase = panel.dataset.ipBase;
    const uaBase = panel.dataset.uaBase;

    try {
        const [ip, ua] = await Promise.all([
            api.get(ipBase),
            api.get(uaBase),
        ]);

        root.querySelector("#sec-ip-whitelist").value = ip.whitelist ?? "";
        root.querySelector("#sec-ip-blacklist").value = ip.blacklist ?? "";
        root.querySelector("#sec-ua-whitelist").value = ua.whitelist ?? "";
        root.querySelector("#sec-ua-blacklist").value = ua.blacklist ?? "";
    } catch (e) {
        toast.error("Failed to load security rules: " + e.message);
    }
}

// wireSecurityPanel attaches save button handlers to the security panel.
// Must be called after renderSecurityPanel has been inserted into the DOM.
export function wireSecurityPanel(root) {
    const panel = root.querySelector("#security-panel");
    if (!panel) return;

    const ipBase = panel.dataset.ipBase;
    const uaBase = panel.dataset.uaBase;

    // save IP rules
    root.querySelector("#sec-ip-save")?.addEventListener("click", async () => {
        const btn  = root.querySelector("#sec-ip-save");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await api.put(ipBase, {
                whitelist: root.querySelector("#sec-ip-whitelist").value,
                blacklist: root.querySelector("#sec-ip-blacklist").value,
            });
            toast.success("IP rules saved");
        } catch (e) {
            toast.error(e.message);
        } finally {
            btn.disabled  = false;
            btn.innerHTML = orig;
        }
    });

    // save UA rules
    root.querySelector("#sec-ua-save")?.addEventListener("click", async () => {
        const btn  = root.querySelector("#sec-ua-save");
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.5"></div>';
        try {
            await api.put(uaBase, {
                whitelist: root.querySelector("#sec-ua-whitelist").value,
                blacklist: root.querySelector("#sec-ua-blacklist").value,
            });
            toast.success("UA rules saved");
        } catch (e) {
            toast.error(e.message);
        } finally {
            btn.disabled  = false;
            btn.innerHTML = orig;
        }
    });
}