"use strict";

import { api } from '../api.js';
import { toast } from '../toast.js';

// holds the active Chart instance so it can be destroyed before recreating
let _siteChart = null;

// -- helpers -----------------------------------------------------------------

// fmtBytes formats a raw byte count into a human-readable string
export function fmtBytes(bytes) {
    if (bytes === 0)           return '0 B';
    if (bytes < 1024)          return `${bytes} B`;
    if (bytes < 1048576)       return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824)    return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
}

// fmtPercent formats a float as a percentage string
function fmtPercent(n) {
    return `${n.toFixed(1)}%`;
}

// -- Chart.js loader ---------------------------------------------------------

// _chartReady resolves once Chart.js is available on window.Chart
let _chartReady = null;
export function loadChartJS() {
    if (_chartReady) return _chartReady;
    _chartReady = new Promise((resolve) => {
        if (window.Chart) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js@latest/dist/chart.umd.min.js';
        s.onload = resolve;
        s.onerror = resolve;
        document.body.appendChild(s);
    });
    return _chartReady;
}

// -- render ------------------------------------------------------------------

// renderStatsTab returns the static HTML shell for the Stats tab
export function renderStatsTab(siteId, siteType) {
    const isRP = siteType === 6;

    const podSection = isRP ? '' : `
        <!-- pod statistics -->
        <div class="kp-card uk-padding-small uk-margin-bottom">
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <h3 class="kp-view-title">Pod Statistics</h3>
                <span id="stats-pod-indicator" class="kp-status kp-status-stopped" style="font-size:0.7rem">
                    Connecting…
                </span>
            </div>
            <div id="stats-pod-table-wrap">
                <div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>
            </div>
        </div>

        <!-- disk usage -->
        <div class="kp-card uk-padding-small uk-margin-bottom">
            <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-bottom">
                <h3 class="kp-view-title">Disk Usage</h3>
                <button class="uk-button kp-btn-ghost kp-btn-sm" id="stats-disk-refresh"
                    uk-tooltip="Refresh disk usage">
                    <span uk-icon="refresh"></span>
                </button>
            </div>
            <div id="stats-disk-wrap">
                <div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>
            </div>
        </div>`;

    return `
        <div id="stats-panel" data-site-id="${siteId}" data-site-type="${siteType}">

            <!-- traffic -->
            <div class="kp-card uk-padding-small uk-margin-bottom">
                <h3 class="kp-view-title uk-margin-small-bottom">Site Traffic
                    <span class="kp-muted uk-text-small" style="font-weight:400"> — last 24 hours</span>
                </h3>

                <!-- status code badges -->
                <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-small-bottom" uk-grid>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-2xx" style="font-size:1.6rem">—</div>
                        <div class="kp-stat-label" style="color:var(--kp-success)">2xx Success</div>
                    </div></div>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-3xx" style="font-size:1.6rem">—</div>
                        <div class="kp-stat-label" style="color:var(--kp-cyan)">3xx Redirect</div>
                    </div></div>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-4xx" style="font-size:1.6rem">—</div>
                        <div class="kp-stat-label" style="color:var(--kp-warning)">4xx Client Err</div>
                    </div></div>
                    <div><div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value" id="stats-5xx" style="font-size:1.6rem">—</div>
                        <div class="kp-stat-label" style="color:var(--kp-danger)">5xx Server Err</div>
                    </div></div>
                </div>

                <!-- bandwidth -->
                <div class="kp-stats-bandwidth">
                    Total Bandwidth: <span id="stats-bandwidth" class="kp-stats-bandwidth-val">—</span>
                </div>

                <!-- hits per hour chart -->
                <div class="kp-stats-chart-wrap">
                    <canvas id="stats-chart"></canvas>
                </div>
            </div>

            <!-- drilldown modal — populated on 4xx/5xx bar click -->
            <div id="stats-drilldown-modal" uk-modal>
                <div class="uk-modal-dialog uk-modal-body" style="min-width:min(96vw,900px)">
                    <button class="uk-modal-close-default" type="button" uk-close></button>
                    <h3 class="kp-view-title uk-margin-small-bottom" id="stats-drilldown-title">Request Detail</h3>
                    <div id="stats-drilldown-body">
                        <div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>
                    </div>
                </div>
            </div>

            <!-- top IPs + UAs -->
            <div class="uk-grid-small uk-child-width-1-1 uk-child-width-1-2@m uk-margin-bottom" uk-grid>
                <div>
                    <div class="kp-table-wrap">
                        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                            <thead><tr>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem">Top IPs</th>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem;text-align:right">Hits</th>
                            </tr></thead>
                            <tbody id="stats-ip-rows">
                                <tr><td colspan="2" class="kp-muted uk-text-small">Loading…</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <div class="kp-table-wrap">
                        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                            <thead><tr>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem">Top User-Agents</th>
                                <th style="color:var(--kp-text-dim);font-size:0.75rem;text-align:right">Hits</th>
                            </tr></thead>
                            <tbody id="stats-ua-rows">
                                <tr><td colspan="2" class="kp-muted uk-text-small">Loading…</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            ${podSection}

        </div>`;
}

// -- load --------------------------------------------------------------------

// loadStatsTraffic fetches traffic stats and populates the traffic section
async function loadStatsTraffic(siteId) {
    await loadChartJS();

    let data;
    try {
        data = await api.get(`/sites/${siteId}/stats/traffic`);
    } catch (err) {
        document.getElementById('stats-ip-rows').innerHTML =
            `<tr><td colspan="2" class="kp-muted uk-text-small">Failed to load: ${err.message}</td></tr>`;
        return;
    }

    // status code counters
    document.getElementById('stats-2xx').textContent = (data.status_codes['2xx'] ?? 0).toLocaleString();
    document.getElementById('stats-3xx').textContent = (data.status_codes['3xx'] ?? 0).toLocaleString();
    document.getElementById('stats-4xx').textContent = (data.status_codes['4xx'] ?? 0).toLocaleString();
    document.getElementById('stats-5xx').textContent = (data.status_codes['5xx'] ?? 0).toLocaleString();

    // bandwidth
    document.getElementById('stats-bandwidth').textContent = fmtBytes(data.total_bandwidth ?? 0);

    // hits per hour chart
    const canvas = document.getElementById('stats-chart');
    if (canvas && window.Chart) {
        const labels  = (data.hits_per_hour ?? []).map((b) => {
            const d = new Date(b.hour);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });

        if (_siteChart) {
            _siteChart.destroy();
            _siteChart = null;
        }
        _siteChart = new window.Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: '2xx',
                        data: (data.hits_per_hour ?? []).map((b) => b['2xx']),
                        backgroundColor: 'rgba(39,174,96,0.75)',
                        borderColor:     'rgba(39,174,96,1)',
                        borderWidth: 1,
                        borderRadius: 3,
                    },
                    {
                        label: '3xx',
                        data: (data.hits_per_hour ?? []).map((b) => b['3xx']),
                        backgroundColor: 'rgba(43,142,255,0.75)',
                        borderColor:     'rgba(43,142,255,1)',
                        borderWidth: 1,
                        borderRadius: 3,
                    },
                    {
                        label: '4xx',
                        data: (data.hits_per_hour ?? []).map((b) => b['4xx']),
                        backgroundColor: 'rgba(255,171,0,0.75)',
                        borderColor:     'rgba(255,171,0,1)',
                        borderWidth: 1,
                        borderRadius: 3,
                    },
                    {
                        label: '5xx',
                        data: (data.hits_per_hour ?? []).map((b) => b['5xx']),
                        backgroundColor: 'rgba(235,59,90,0.75)',
                        borderColor:     'rgba(235,59,90,1)',
                        borderWidth: 1,
                        borderRadius: 3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (evt, elements) => {
                    if (!elements || !elements.length) return;

                    // only handle 4xx and 5xx dataset clicks
                    const datasetIndex = elements[0].datasetIndex;
                    const label = _siteChart.data.datasets[datasetIndex].label;
                    if (label !== '4xx' && label !== '5xx') return;

                    // get raw RFC3339 hour from stored hits_per_hour
                    const barIndex = elements[0].index;
                    const panel = document.getElementById('stats-panel');
                    if (!panel || !panel._hitsPerHour) return;
                    const rawHour = panel._hitsPerHour[barIndex]?.hour;
                    if (!rawHour) return;

                    openDrilldown(siteId, rawHour, label);
                },
                onHover: (evt, elements) => {
                    if (!elements || !elements.length) {
                        evt.native.target.style.cursor = 'default';
                        return;
                    }
                    const label = _siteChart.data.datasets[elements[0].datasetIndex].label;
                    evt.native.target.style.cursor = (label === '4xx' || label === '5xx') ? 'pointer' : 'default';
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#6b8cae', font: { size: 11 } },
                        onHover: (event) => {
                            event.native.target.style.cursor = 'pointer';
                        },
                        onLeave: (event) => {
                            event.native.target.style.cursor = 'default';
                        },
                    },
                    tooltip: {
                        mode: 'index',
                        backgroundColor: '#0c1530',
                        borderColor:     '#1a2a4a',
                        borderWidth: 1,
                        titleColor: '#dde8f5',
                        bodyColor:  '#6b8cae',
                    },
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: { color: '#6b8cae', font: { size: 10 }, maxRotation: 45 },
                        grid:  { color: 'rgba(26,42,74,0.6)' },
                    },
                    y: {
                        stacked: true,
                        ticks: { color: '#6b8cae', font: { size: 10 } },
                        grid:  { color: 'rgba(26,42,74,0.6)' },
                        beginAtZero: true,
                    },
                },
            },
        });

        // store raw hour data on the panel for drilldown click handler
        const panel = document.getElementById('stats-panel');
        if (panel) panel._hitsPerHour = data.hits_per_hour ?? [];
    }

    // top IPs
    const ipRows = document.getElementById('stats-ip-rows');
    if (ipRows) {
        ipRows.innerHTML = (data.top_ips ?? []).length === 0
            ? `<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>`
            : (data.top_ips ?? []).map((e) => `
                <tr>
                    <td class="kp-stats-table-cell-mono">${e.name}</td>
                    <td class="kp-stats-table-cell-count">${e.count.toLocaleString()}</td>
                </tr>`).join('');
    }

    // top UAs
    const uaRows = document.getElementById('stats-ua-rows');
    if (uaRows) {
        uaRows.innerHTML = (data.top_uas ?? []).length === 0
            ? `<tr><td colspan="2" class="kp-muted uk-text-small">No data</td></tr>`
            : (data.top_uas ?? []).map((e) => `
                <tr>
                    <td class="kp-stats-ua-cell" title="${e.name}">${e.name}</td>
                    <td class="kp-stats-table-cell-count">${e.count.toLocaleString()}</td>
                </tr>`).join('');
    }
}

// loadStatsDisk fetches and renders disk usage for html/ and db/
async function loadStatsDisk(siteId) {
    const wrap = document.getElementById('stats-disk-wrap');
    if (!wrap) return;

    wrap.innerHTML = `<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>`;

    try {
        const data = await api.get(`/sites/${siteId}/stats/disk`);
        wrap.innerHTML = `
            <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${fmtBytes(data.html_bytes ?? 0)}</div>
                        <div class="kp-stat-label">Site Files</div>
                    </div>
                </div>
                <div>
                    <div class="kp-stat-card" style="padding:16px">
                        <div class="kp-stat-value kp-stats-disk-val">${fmtBytes(data.db_bytes ?? 0)}</div>
                        <div class="kp-stat-label">Database</div>
                    </div>
                </div>
            </div>`;
    } catch (err) {
        wrap.innerHTML =
            `<p class="kp-muted uk-text-small">Failed to load disk usage: ${err.message}</p>`;
    }
}

// renderPodTable returns the container stats table HTML
function renderPodTable(containers) {
    if (!containers || containers.length === 0) {
        return `<p class="kp-muted uk-text-small uk-margin-remove">No container data.</p>`;
    }

    const rows = containers.map((c) => {
        const memPct = c.mem_limit > 0
            ? ((c.mem_used / c.mem_limit) * 100).toFixed(1)
            : 0;
        const isHot = memPct > 80;
        const role  = c.name.split('-').pop();
        return `
            <tr>
                <td class="kp-stats-pod-role kp-stats-pod-role-btn"
                    data-container="${c.name}"
                    title="Restart ${role}"
                    style="cursor:pointer">${role}</td>
                <td class="kp-stats-pod-cpu${c.cpu_percent > 80 ? ' is-hot' : ''}">
                    ${fmtPercent(c.cpu_percent)}
                </td>
                <td class="kp-stats-pod-mem">
                    ${fmtBytes(c.mem_used)}
                    <span class="kp-stats-pod-mem-limit"> / ${fmtBytes(c.mem_limit)}</span>
                </td>
                <td>
                    <div class="kp-stats-mem-wrap">
                        <div class="kp-stats-mem-bar-track">
                            <div class="kp-stats-mem-bar-fill${isHot ? ' is-hot' : ''}"
                                style="width:${memPct}%"></div>
                        </div>
                        <span class="kp-stats-mem-pct">${memPct}%</span>
                    </div>
                </td>
            </tr>`;
    }).join('');

    return `
        <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
            <thead><tr>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Container</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">CPU</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Memory</th>
                <th style="color:var(--kp-text-dim);font-size:0.75rem">Mem %</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

// -- drilldown ---------------------------------------------------------------

// renderDrilldownTable builds the paginated, sortable drilldown table HTML
// sortCol: 'time' | 'method' | 'status' | 'ip' — sortDesc: boolean
function renderDrilldownTable(entries, page, sortCol, sortDesc) {
    if (!entries || entries.length === 0) {
        return `<p class="kp-muted uk-text-small">No matching requests found.</p>`;
    }

    // sort by the active column
    const sorted = [...entries].sort((a, b) => {
        let av, bv;
        switch (sortCol) {
            case 'time':   av = a.time;      bv = b.time;      break;
            case 'method': av = a.method;    bv = b.method;    break;
            case 'ip':     av = a.client_ip; bv = b.client_ip; break;
            default:       av = a.status;    bv = b.status;    break;
        }
        if (av < bv) return sortDesc ? 1 : -1;
        if (av > bv) return sortDesc ? -1 : 1;
        return 0;
    });

    const pageSize   = 50;
    const totalPages = Math.ceil(sorted.length / pageSize);
    const slice      = sorted.slice(page * pageSize, (page + 1) * pageSize);

    const rows = slice.map((e) => {
        // show full UA — CSS handles wrapping in the cell
        const uaShort = e.ua;
        const statusClass = e.status >= 500 ? 'kp-badge-danger' : 'kp-badge-warning';
        return `
            <tr>
                <td class="kp-stats-table-cell-mono" style="white-space:nowrap">${e.time.slice(11, 19)}</td>
                <td class="kp-stats-table-cell-mono">${e.method}</td>
                <td style="word-break:break-all;font-size:0.8rem">${e.path}</td>
                <td><span class="kp-badge ${statusClass}">${e.status}</span></td>
                <td class="kp-stats-table-cell-mono">${e.client_ip}</td>
                <td class="kp-dd-ua-cell">${uaShort}</td>
            </tr>`;
    }).join('');

    const pager = totalPages > 1 ? `
        <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-small-top">
            <span class="kp-muted uk-text-small">Page ${page + 1} of ${totalPages} — ${entries.length} total</span>
            <div>
                ${page > 0 ? `<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${page - 1}">‹ Prev</button>` : ''}
                ${page < totalPages - 1 ? `<button class="uk-button kp-btn-ghost kp-btn-sm" data-dd-page="${page + 1}">Next ›</button>` : ''}
            </div>
        </div>` : '';

    return `
        <div class="kp-table-wrap">
            <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                <thead><tr>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="time">Time ${sortCol==='time' ? (sortDesc ? '↓' : '↑') : '↕'}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="method">Method ${sortCol==='method' ? (sortDesc ? '↓' : '↑') : '↕'}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">Path</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="status">Status ${sortCol==='status' ? (sortDesc ? '↓' : '↑') : '↕'}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem;cursor:pointer;user-select:none" data-dd-col="ip">IP ${sortCol==='ip' ? (sortDesc ? '↓' : '↑') : '↕'}</th>
                    <th style="color:var(--kp-text-dim);font-size:0.75rem">UA</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${pager}`;
}

// openDrilldown fetches and displays the drilldown modal for a given hour and status class
async function openDrilldown(siteId, hour, statusClass) {
    const modal = document.getElementById('stats-drilldown-modal');
    const title = document.getElementById('stats-drilldown-title');
    const body  = document.getElementById('stats-drilldown-body');
    if (!modal || !body) return;

    title.textContent = `${statusClass} Requests — ${new Date(hour).toLocaleString([], {
        hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric',
    })}`;
    body.innerHTML = `<div uk-spinner="ratio:0.8" style="color:var(--kp-blue)"></div>`;
    UIkit.modal(modal).show();

    let entries  = [];
    let page     = 0;
    let sortCol  = 'time';
    let sortDesc = true;

    function redraw() {
        body.innerHTML = renderDrilldownTable(entries, page, sortCol, sortDesc);

        // sort column buttons
        body.querySelectorAll('th[data-dd-col]').forEach((th) => {
            th.addEventListener('click', () => {
                const col = th.dataset.ddCol;
                if (sortCol === col) {
                    sortDesc = !sortDesc;
                } else {
                    sortCol  = col;
                    sortDesc = true;
                }
                page = 0;
                redraw();
            });
        });

        // pagination buttons
        body.querySelectorAll('[data-dd-page]').forEach((btn) => {
            btn.addEventListener('click', () => {
                page = parseInt(btn.dataset.ddPage, 10);
                redraw();
            });
        });
    }

    try {
        entries = await api.get(`/sites/${siteId}/stats/drilldown?hour=${encodeURIComponent(hour)}&status=${statusClass}`);
    } catch (err) {
        body.innerHTML = `<p class="kp-muted uk-text-small">Failed to load: ${err.message}</p>`;
        return;
    }

    redraw();
}

// -- wire --------------------------------------------------------------------

// wireStatsTab attaches all event listeners and starts the WS pod stream
export function wireStatsTab(root, siteId, siteType) {
    const isRP = siteType === 6;
    let podWS   = null;

    // start WebSocket pod stream for non-RP sites
    function startPodStream() {
        if (isRP) return;

        const indicator = root.querySelector('#stats-pod-indicator');
        const tableWrap = root.querySelector('#stats-pod-table-wrap');
        if (!tableWrap) return;

        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        podWS = new WebSocket(`${proto}://${location.host}/api/sites/${siteId}/stats/pod`);

        podWS.onopen = () => {
            if (indicator) {
                indicator.className = 'kp-status kp-status-running';
                indicator.textContent = 'Live';
            }
        };

        podWS.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                tableWrap.innerHTML = renderPodTable(data.containers ?? []);
                // wire click-to-restart on each container name cell
                tableWrap.querySelectorAll('.kp-stats-pod-role-btn').forEach(td => {
                    td.addEventListener('click', async () => {
                        const orig = td.style.color;
                        td.style.color = 'var(--kp-warning)';
                        const role = td.dataset.container.split('-').pop();
                        try {
                            await api.post(`/sites/${siteId}/containers/${role}/restart`);
                            toast.success(`${role} restarted`);
                        } catch (err) {
                            td.style.color = orig;
                            toast.error(err.message);
                        }
                    });
                });
            } catch (_) { /* ignore malformed frames */ }
        };

        podWS.onerror = () => {
            if (indicator) {
                indicator.className = 'kp-status kp-status-error';
                indicator.textContent = 'Error';
            }
        };

        podWS.onclose = () => {
            if (indicator && indicator.textContent === 'Live') {
                indicator.className = 'kp-status kp-status-stopped';
                indicator.textContent = 'Disconnected';
            }
        };
    }

    function stopPodStream() {
        if (podWS && podWS.readyState === WebSocket.OPEN) {
            podWS.close();
        }
        podWS = null;
    }

    // disk refresh button
    root.querySelector('#stats-disk-refresh')?.addEventListener('click', () => {
        loadStatsDisk(siteId);
    });

    startPodStream();

    // stop the WS stream when navigating away
    const observer = new MutationObserver(() => {
        if (!document.getElementById('stats-panel')) {
            stopPodStream();
            observer.disconnect();
        }
    });
    observer.observe(document.getElementById('main') ?? document.body, { childList: true, subtree: false });
}

// loadStatsTab fetches all initial data for the stats tab
export async function loadStatsTab(siteId, siteType) {
    const isRP = siteType === 6;

    await loadStatsTraffic(siteId);

    if (!isRP) {
        await loadStatsDisk(siteId);
    }
}
