// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { router } from '../router.js';

const MAX_LOG_LINES = 2000;

// -- render ------------------------------------------------------------------

function renderAdminLogs() {
    return `
        <div id="admin-logs-panel">
            <div class="kp-card uk-padding-small">
                <h3 class="kp-view-title uk-margin-small-bottom">Admin Logs</h3>

                <div class="kp-log-controls">
                    <select class="uk-select kp-select" id="admin-log-source" style="width:160px;height:38px">
                        <option value="proxy">Proxy Access Log</option>
                        <option value="waf">WAF Log</option>
                    </select>
                    <select class="uk-select kp-select" id="admin-log-tail" style="width:120px;height:38px">
                        <option value="100">100 lines</option>
                        <option value="250">250 lines</option>
                        <option value="500">500 lines</option>
                        <option value="1000">1000 lines</option>
                    </select>
                    <button class="uk-button kp-btn-secondary kp-btn-sm" id="admin-log-connect"
                        uk-tooltip="Start Tailing the Logs">
                        <span uk-icon="play"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="admin-log-disconnect" disabled
                        uk-tooltip="Stop Tailing the Logs">
                        <span uk-icon="ban"></span>
                    </button>
                    <button class="uk-button kp-btn-ghost kp-btn-sm" id="admin-log-clear"
                        uk-tooltip="Clear the Logs">
                        <span uk-icon="trash"></span>
                    </button>
                    <label style="font-size:0.82rem;color:var(--kp-text-dim);display:flex;align-items:center;gap:6px">
                        <input type="checkbox" class="uk-checkbox" id="admin-log-autoscroll" checked>
                        Auto-scroll
                    </label>
                </div>

                <div class="kp-log-header">
                    <div class="kp-log-dot kp-log-dot-red"></div>
                    <div class="kp-log-dot kp-log-dot-yellow"></div>
                    <div class="kp-log-dot kp-log-dot-green"></div>
                    <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px"
                        id="admin-log-status">Disconnected</span>
                </div>
                <div class="kp-log-wrap" id="admin-log-output"></div>
            </div>
        </div>`;
}

// -- wire --------------------------------------------------------------------

function wireAdminLogs(root) {
    let ws = null, connected = false;

    const output     = root.querySelector('#admin-log-output');
    const connectBtn = root.querySelector('#admin-log-connect');
    const disconnBtn = root.querySelector('#admin-log-disconnect');
    const clearBtn   = root.querySelector('#admin-log-clear');
    const autoScroll = root.querySelector('#admin-log-autoscroll');
    const logStatus  = root.querySelector('#admin-log-status');

    function appendLog(text) {
        text.split('\n').forEach((line) => {
            if (!line) return;
            const div = document.createElement('div');
            div.className = line.match(/WAF BLOCK/i)          ? 'kp-log-line-err'
                : line.match(/WAF DETECT/i)                   ? 'kp-log-line-warn'
                : line.match(/error|crit|emerg/i)             ? 'kp-log-line-err'
                : line.match(/warn/i)                         ? 'kp-log-line-warn'
                : line.match(/info|notice/i)                  ? 'kp-log-line-info' : '';
            div.textContent = line;
            output.appendChild(div);
        });

        // trim oldest lines to keep the DOM bounded
        while (output.childElementCount > MAX_LOG_LINES) {
            output.removeChild(output.firstChild);
        }

        if (autoScroll.checked) output.scrollTop = output.scrollHeight;
    }

    function disconnect() {
        if (ws) { ws.close(); ws = null; }
        connected = false;
        connectBtn.disabled = false;
        disconnBtn.disabled = true;
        if (logStatus) logStatus.textContent = 'Disconnected';
    }

    connectBtn.addEventListener('click', () => {
        disconnect();
        const source = root.querySelector('#admin-log-source').value;
        const tail   = root.querySelector('#admin-log-tail').value;
        const proto  = location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl  = source === 'waf'
            ? `${proto}://${location.host}/api/logs/waf?tail=${tail}`
            : `${proto}://${location.host}/api/logs/proxy?tail=${tail}`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            connected = true;
            connectBtn.disabled = true;
            disconnBtn.disabled = false;
            if (logStatus) logStatus.textContent = `Connected — ${source === 'waf' ? 'WAF Log' : 'Proxy Access Log'}`;
        };
        ws.onmessage = (e) => appendLog(e.data);
        ws.onerror   = () => { if (connected) return; };
        ws.onclose   = () => {
            connected = false;
            connectBtn.disabled = false;
            disconnBtn.disabled = true;
            if (logStatus) logStatus.textContent = 'Disconnected';
        };
    });

    disconnBtn.addEventListener('click', disconnect);
    clearBtn.addEventListener('click', () => { output.innerHTML = ''; });

    // reconnect automatically when source changes while connected
    root.querySelector('#admin-log-source').addEventListener('change', () => {
        if (ws && ws.readyState === WebSocket.OPEN) { disconnect(); connectBtn.click(); }
    });

    // clean close when navigating away
    const origGo = router.go.bind(router);
    router.go = function (view, params = {}) {
        if (ws) disconnect();
        return origGo(view, params);
    };
}

// -- entry -------------------------------------------------------------------

export function viewAdminLogs(root) {
    root.innerHTML = renderAdminLogs();
    wireAdminLogs(root);
}
