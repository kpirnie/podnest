// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

import { api } from '../api.js';
import { emptyState } from '../helpers.js';
import { showCreateSiteModal } from '../modals/create-site.js';
import { fmtBytes, loadChartJS } from './site-stats.js';
import { siteCard } from './sites.js';

// holds the active Chart instance so it can be destroyed before recreating
let _dashChart = null;

export async function viewDashboard(root) {
    const [sites, traffic, pod] = await Promise.all([
        api.get("/sites").catch(() => []),
        api.get("/stats/traffic").catch(() => null),
        api.get("/stats/pod").catch(() => null),
    ]);
    const running = sites.filter((s) => s.SiteStatus === 1).length;
    const stopped = sites.filter((s) => s.SiteStatus === 2).length;
    const errored = sites.filter((s) => s.SiteStatus === 4).length;

    root.innerHTML = `
        <div class="kp-view-header">
            <h1 class="kp-view-title kp-cursor" style="font-size:2rem;">Dashboard</h1>
        </div>
        <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-medium-bottom" uk-grid>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value">${sites.length}</div>
                            <div class="kp-stat-label">Total Sites</div>
                        </div>
                        <span class="kp-stat-icon" uk-icon="icon: world; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-success)">${running}</div>
                            <div class="kp-stat-label">Running</div>
                        </div>
                        <span style="color:var(--kp-success)" uk-icon="icon: check; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-text-dim)">${stopped}</div>
                            <div class="kp-stat-label">Stopped</div>
                        </div>
                        <span style="color:var(--kp-text-dim)" uk-icon="icon: ban; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
            <div>
                <div class="kp-stat-card">
                    <div class="uk-flex uk-flex-between">
                        <div>
                            <div class="kp-stat-value" style="color:var(--kp-danger)">${errored}</div>
                            <div class="kp-stat-label">Errors</div>
                        </div>
                        <span style="color:var(--kp-danger)" uk-icon="icon: warning; ratio: 1.75"></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- global traffic -->
        <div class="kp-view-header uk-margin-top">
            <h2 class="kp-view-title" style="font-size:1.25rem">Traffic
                <span class="kp-muted uk-text-small" style="font-weight:400"> — last 24 hours</span>
            </h2>
        </div>
        <div class="kp-card uk-padding-small uk-margin-medium-bottom">
            <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m uk-margin-small-bottom" uk-grid>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" style="font-size:1.6rem;color:var(--kp-success)">
                        ${(traffic?.status_codes?.['2xx'] ?? 0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-success)">2xx Success</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" style="font-size:1.6rem;color:var(--kp-cyan)">
                        ${(traffic?.status_codes?.['3xx'] ?? 0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-cyan)">3xx Redirect</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" style="font-size:1.6rem;color:var(--kp-warning)">
                        ${(traffic?.status_codes?.['4xx'] ?? 0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-warning)">4xx Client Err</div>
                </div></div>
                <div><div class="kp-stat-card" style="padding:16px">
                    <div class="kp-stat-value" style="font-size:1.6rem;color:var(--kp-danger)">
                        ${(traffic?.status_codes?.['5xx'] ?? 0).toLocaleString()}
                    </div>
                    <div class="kp-stat-label" style="color:var(--kp-danger)">5xx Server Err</div>
                </div></div>
            </div>
            <div class="uk-margin-small-bottom" style="color:var(--kp-text-dim);font-size:0.85rem">
                Total Bandwidth:
                <span style="color:var(--kp-cyan);font-family:'JetBrains Mono',monospace">
                    ${fmtBytes(traffic?.total_bandwidth ?? 0)}
                </span>
            </div>
            <div style="position:relative;height:180px">
                <canvas id="dash-traffic-chart"></canvas>
            </div>
        </div>

        <!-- global pod aggregate + top sites -->
        <div class="uk-grid-small uk-child-width-1-1 uk-child-width-1-2@m uk-margin-medium-bottom" uk-grid>
            <div>
                <div class="kp-view-header">
                    <h2 class="kp-view-title" style="font-size:1.25rem">Resource Usage</h2>
                </div>
                <div class="uk-grid-small uk-child-width-1-2" uk-grid>
                    <div><div class="kp-stat-card">
                        <div class="uk-flex uk-flex-between">
                            <div>
                                <div class="kp-stat-value">${(pod?.total_cpu ?? 0).toFixed(1)}%</div>
                                <div class="kp-stat-label">Total CPU</div>
                            </div>
                            <span class="kp-stat-icon" uk-icon="icon: bolt; ratio: 1.75"></span>
                        </div>
                    </div></div>
                    <div><div class="kp-stat-card">
                        <div class="uk-flex uk-flex-between">
                            <div>
                                <div class="kp-stat-value">${fmtBytes(pod?.mem_used ?? 0)}</div>
                                <div class="kp-stat-label">Memory Used</div>
                            </div>
                            <span class="kp-stat-icon" uk-icon="icon: server; ratio: 1.75"></span>
                        </div>
                    </div></div>
                </div>
            </div>
            <div>
                <div class="kp-view-header">
                    <h2 class="kp-view-title" style="font-size:1.25rem">Top Sites by Traffic</h2>
                </div>
                <div class="kp-table-wrap">
                    <table class="uk-table uk-table-small uk-table-divider uk-margin-remove">
                        <thead><tr>
                            <th style="color:var(--kp-text-dim);font-size:0.75rem">Host</th>
                            <th style="color:var(--kp-text-dim);font-size:0.75rem;text-align:right">Hits</th>
                        </tr></thead>
                        <tbody>
                            ${(traffic?.top_sites ?? []).length === 0
                                ? `<tr><td colspan="2" class="kp-muted uk-text-small">No traffic data</td></tr>`
                                : (traffic?.top_sites ?? []).map((s) => `
                                    <tr>
                                        <td class="kp-mono" style="font-size:0.8rem">${s.name}</td>
                                        <td style="text-align:right;color:var(--kp-cyan);
                                            font-family:'JetBrains Mono',monospace;font-size:0.8rem">
                                            ${s.count.toLocaleString()}
                                        </td>
                                    </tr>`).join('')
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="kp-view-header">
            <h2 class="kp-view-title" style="font-size:1.25rem">Recent Sites</h2>
        </div>
        <div class="kp-site-grid">
            ${sites.length === 0 ? 
                emptyState("world", "No sites yet") : 
                sites.slice(-3).reverse().map(s => siteCard(s, sites)).join("")
            }
        </div>`;

    // render hits-per-hour chart once Chart.js is ready
    if (traffic?.hits_per_hour?.length) {
        await loadChartJS();
        const canvas = document.getElementById('dash-traffic-chart');
        if (canvas && window.Chart) {
            if (_dashChart) {
                _dashChart.destroy();
                _dashChart = null;
            }
            _dashChart = new window.Chart(canvas, {
                type: 'bar',
                data: {
                    labels: traffic.hits_per_hour.map((b) => {
                        const d = new Date(b.hour);
                        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }),
                    datasets: [
                        {
                            label: '2xx',
                            data: traffic.hits_per_hour.map((b) => b['2xx']),
                            backgroundColor: 'rgba(39,174,96,0.75)',
                            borderColor:     'rgba(39,174,96,1)',
                            borderWidth: 1,
                            borderRadius: 3,
                        },
                        {
                            label: '3xx',
                            data: traffic.hits_per_hour.map((b) => b['3xx']),
                            backgroundColor: 'rgba(43,142,255,0.75)',
                            borderColor:     'rgba(43,142,255,1)',
                            borderWidth: 1,
                            borderRadius: 3,
                        },
                        {
                            label: '4xx',
                            data: traffic.hits_per_hour.map((b) => b['4xx']),
                            backgroundColor: 'rgba(255,171,0,0.75)',
                            borderColor:     'rgba(255,171,0,1)',
                            borderWidth: 1,
                            borderRadius: 3,
                        },
                        {
                            label: '5xx',
                            data: traffic.hits_per_hour.map((b) => b['5xx']),
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
        }
    }

    document.getElementById("dash-new-site")
        ?.addEventListener("click", () => showCreateSiteModal());
}
