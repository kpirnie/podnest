"use strict";

import { router } from '../router.js';

export function renderLogsTab(siteId, siteType) {
    // reverse proxy sites have no containers — only the WAF log is available
    const isRP = siteType === 6;

    const runtimeOption = () => {
        switch (siteType) {
            case 1: case 2: return `<option value="php">PHP-FPM</option>`;
            case 4:         return `<option value="app">Node.js</option>`;
            case 5:         return `<option value="app">.NET</option>`;
            default:        return "";
        }
    };

    // RP sites expose only the WAF log; all other types expose container streams
    const containerOptions = isRP
        ? `<option value="waf">WAF Log</option>`
        : `<option value="nginx">Nginx</option>
                    ${runtimeOption()}
                    <option value="db">MariaDB</option>
                    <option value="redis">Redis</option>
                    <option value="waf">WAF Log</option>`;
    return `
        <div>
            <div class="kp-log-controls">
                <select class="uk-select kp-select" id="log-container" style="width:140px;height:38px">
                    ${containerOptions}
                </select>
                <select class="uk-select kp-select" id="log-tail" style="width:120px;height:38px">
                    <option value="100">100 lines</option>
                    <option value="250">250 lines</option>
                    <option value="500">500 lines</option>
                    <option value="1000">1000 lines</option>
                </select>
                <button class="uk-button kp-btn-secondary kp-btn-sm" id="log-connect" uk-tooltip="Start Tailing the Logs">
                    <span uk-icon="play"></span>
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="log-disconnect" disabled uk-tooltip="Stop Tailing the Logs">
                    <span uk-icon="ban"></span>
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="log-clear" uk-tooltip="Clear the Logs">
                    <span uk-icon="trash"></span>
                </button>
                <label style="font-size:0.82rem;color:var(--kp-text-dim);display:flex;align-items:center;gap:6px">
                    <input type="checkbox" class="uk-checkbox" id="log-autoscroll" checked>
                    Auto-scroll
                </label>
            </div>
            <div class="kp-log-header">
                <div class="kp-log-dot kp-log-dot-red"></div>
                <div class="kp-log-dot kp-log-dot-yellow"></div>
                <div class="kp-log-dot kp-log-dot-green"></div>
                <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px" id="log-status">Disconnected</span>
            </div>
            <div class="kp-log-wrap" id="log-output"></div>
        </div>`;
}

export function wireLogsTab(root, siteId) {
    let ws = null, connected = false;

    const output     = root.querySelector("#log-output");
    const connectBtn = root.querySelector("#log-connect");
    const disconnBtn = root.querySelector("#log-disconnect");
    const clearBtn   = root.querySelector("#log-clear");
    const autoScroll = root.querySelector("#log-autoscroll");
    const logStatus  = root.querySelector("#log-status");

    function appendLog(text) {
        text.split("\n").forEach((line) => {
            if (!line) return;
            const div = document.createElement("div");
            div.className = line.match(/WAF BLOCK/i) ? "kp-log-line-err"
                : line.match(/WAF DETECT/i) ? "kp-log-line-warn"
                : line.match(/error|crit|emerg/i) ? "kp-log-line-err"
                : line.match(/warn/i) ? "kp-log-line-warn"
                : line.match(/info|notice/i) ? "kp-log-line-info" : "";
            div.textContent = line;
            output.appendChild(div);
        });
        if (autoScroll.checked) output.scrollTop = output.scrollHeight;
    }

    function disconnect() {
        if (ws) { ws.close(); ws = null; }
        connected = false;
        connectBtn.disabled = false;
        disconnBtn.disabled = true;
        if (logStatus) logStatus.textContent = "Disconnected";
    }

    connectBtn.addEventListener("click", () => {
        disconnect();
        const container = root.querySelector("#log-container").value;
        const tail      = root.querySelector("#log-tail").value;
        const proto = location.protocol === "https:" ? "wss" : "ws";
        const wsUrl = container === "waf"
            ? `${proto}://${location.host}/api/sites/${siteId}/logs/waf?tail=${tail}`
            : `${proto}://${location.host}/api/sites/${siteId}/logs?container=${container}&tail=${tail}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            connected = true;
            connectBtn.disabled = true;
            disconnBtn.disabled = false;
            if (logStatus) logStatus.textContent = `Connected — ${container}`;
        };
        ws.onmessage = (e) => appendLog(e.data);
        ws.onerror   = () => { if (connected) return; };
        ws.onclose   = () => {
            connected = false;
            connectBtn.disabled = false;
            disconnBtn.disabled = true;
            if (logStatus) logStatus.textContent = "Disconnected";
        };
    });

    disconnBtn.addEventListener("click", disconnect);
    clearBtn.addEventListener("click", () => { output.innerHTML = ""; });

    root.querySelector("#log-container").addEventListener("change", () => {
        if (ws && ws.readyState === WebSocket.OPEN) { disconnect(); connectBtn.click(); }
    });

    /* clean close when navigating away */
    const origGo = router.go.bind(router);
    router.go = function (view, params = {}) {
        if (ws) disconnect();
        return origGo(view, params);
    };
}
