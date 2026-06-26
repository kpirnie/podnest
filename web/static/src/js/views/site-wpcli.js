// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { router } from '../router.js';

// quick command definitions — label shown on button, command sent to server
const quickCommands = [
    { label: "Cache Flush",       cmd: "cache flush"                    },
    { label: "Plugin List",       cmd: "plugin list"                    },
    { label: "Theme List",        cmd: "theme list"                     },
    { label: "User List",         cmd: "user list"                      },
    { label: "Core Check",        cmd: "core check-update"              },
    { label: "Core Update",       cmd: "core update"                    },
    { label: "Plugin Updates",    cmd: "plugin update --all"            },
    { label: "Theme Updates",     cmd: "theme update --all"             },
    { label: "Rewrite Flush",     cmd: "rewrite flush"                  },
    { label: "Transient Delete",  cmd: "transient delete --all"         },
    { label: "Search Replace",    cmd: "search-replace '' ''"           },
];

// renderWPCLITab returns the HTML markup for the WP-CLI terminal tab
export function renderWPCLITab(siteId) {
    return `
        <div>
            <div class="kp-log-controls" style="flex-wrap:wrap;gap:6px">
                ${quickCommands.map((q) => `
                   <button class="uk-button kp-btn-ghost kp-btn-sm"
                        data-action="wpcli-quick"
                        data-cmd="${q.cmd}">
                        ${q.label}
                    </button>`).join("")}
            </div>
            
            <p class="kp-muted uk-text-small uk-margin-small-top">
                <span uk-icon="icon: info; ratio: 0.75"></span>
                WP-CLI <span class="kp-mono">db</span> subcommands are not available for security.
            </p>

            <div class="uk-flex uk-flex-middle uk-margin-small-top" style="gap:8px">
                <span class="kp-mono" style="color:var(--kp-cyan);font-size:0.85rem;flex-shrink:0">wp&gt;</span>
                <input
                    class="uk-input kp-input"
                    id="wpcli-input"
                    type="text"
                    placeholder="plugin list --status=active"
                    style="height:38px;font-family:'JetBrains Mono',monospace;font-size:0.85rem"
                    autocomplete="off"
                    spellcheck="false">
                <button class="uk-button kp-btn-primary kp-btn-sm" id="wpcli-run">
                    <span uk-icon="play"></span> Run
                </button>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="wpcli-clear">
                    <span uk-icon="trash"></span> Clear
                </button>
            </div>

            <div class="kp-log-header uk-margin-small-top">
                <div class="kp-log-dot kp-log-dot-red"></div>
                <div class="kp-log-dot kp-log-dot-yellow"></div>
                <div class="kp-log-dot kp-log-dot-green"></div>
                <span style="font-size:0.72rem;color:var(--kp-text-dim);margin-left:8px" id="wpcli-status">Ready</span>
            </div>
            <div class="kp-log-wrap" id="wpcli-output" style="height:500px"></div>
        </div>`;
}

// wireWPCLITab attaches all event handlers for the WP-CLI terminal tab.
// Must be called after renderWPCLITab has been inserted into the DOM.
export function wireWPCLITab(root, siteId) {
    const output   = root.querySelector("#wpcli-output");
    const input    = root.querySelector("#wpcli-input");
    const runBtn   = root.querySelector("#wpcli-run");
    const clearBtn = root.querySelector("#wpcli-clear");
    const status   = root.querySelector("#wpcli-status");

    // command history — up/down arrow navigation
    const history  = [];
    let historyIdx = -1;

    // append a line to the output area with optional css class for colouring
    function appendLine(text, cls = "") {
        text.split("\n").forEach((line) => {
            if (!line) return;
            const div = document.createElement("div");
            if (cls) {
                div.className = cls;
            } else {
                // auto-colour based on content
                div.className = line.match(/error|fatal|critical/i) ? "kp-log-line-err"
                    : line.match(/warning|warn/i)                   ? "kp-log-line-warn"
                    : line.match(/success|done\]/i)                 ? "kp-log-line-info"
                    : "";
            }
            div.textContent = line;
            output.appendChild(div);
        });
        output.scrollTop = output.scrollHeight;
    }

    // runCommand opens a WebSocket, sends the command, streams the response,
    // then closes the socket when the server signals completion with [done]
    function runCommand(cmd) {
        cmd = cmd.trim();
        if (!cmd) return;

        // add to history and reset index
        history.unshift(cmd);
        historyIdx = -1;

        // echo the command to the output area
        appendLine(`wp> ${cmd}`, "kp-log-line-info");

        // disable input and buttons while running
        input.disabled = true;
        runBtn.disabled = true;
        if (status) status.textContent = "Running...";

        const proto = location.protocol === "https:" ? "wss" : "ws";
        const ws    = new WebSocket(`${proto}://${location.host}/api/sites/${siteId}/wpcli`);

        ws.onopen = () => {
            // send the command as a JSON payload once the socket is open
            ws.send(JSON.stringify({ command: cmd }));
        };

        ws.onmessage = (e) => {
            const text = e.data;

            // [done] signals clean completion — close and re-enable
            if (text.trim() === "[done]") {
                ws.close();
                return;
            }

            // [info] messages are shown in a dimmer colour
            if (text.startsWith("[info]")) {
                appendLine(text, "kp-muted");
                return;
            }

            // [error] messages get the error colour
            if (text.startsWith("[error]")) {
                appendLine(text, "kp-log-line-err");
                return;
            }

            appendLine(text);
        };

        ws.onerror = () => {
            appendLine("[error] WebSocket connection failed", "kp-log-line-err");
        };

        ws.onclose = () => {
            input.disabled  = false;
            runBtn.disabled = false;
            if (status) status.textContent = "Ready";
            input.focus();
        };
    }

    // run button click
    runBtn.addEventListener("click", () => {
        runCommand(input.value);
        input.value = "";
    });

    // enter key in the input field
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            runCommand(input.value);
            input.value  = "";
            historyIdx   = -1;
            return;
        }

        // up arrow — walk backwards through history
        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (historyIdx < history.length - 1) {
                historyIdx++;
                input.value = history[historyIdx];
            }
            return;
        }

        // down arrow — walk forwards through history
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (historyIdx > 0) {
                historyIdx--;
                input.value = history[historyIdx];
            } else {
                historyIdx  = -1;
                input.value = "";
            }
        }
    });

    // quick command buttons
    root.querySelectorAll('[data-action="wpcli-quick"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const cmd = btn.dataset.cmd;

            if (cmd.startsWith("search-replace")) {
                input.value = cmd;
                input.focus();
                const pos = cmd.indexOf("''") + 1;
                input.setSelectionRange(pos, pos);
                return;
            }

            runCommand(cmd);
        });
    });

    // clear button
    clearBtn.addEventListener("click", () => {
        output.innerHTML = "";
    });

    // clean up WebSocket if the user navigates away mid-command
    const origGo = router.go.bind(router);
    router.go = function (view, params = {}) {
        return origGo(view, params);
    };

    // focus the input when the tab becomes active
    input.focus();
}