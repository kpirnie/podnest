"use strict";

import { api } from '../api.js';
import { hideProgressModal, showProgressModal } from '../helpers.js';
import { router } from '../router.js';
import { toast, } from '../toast.js';

export function showCreateSiteModal() {
    const html = `
        <div id="kp-create-site-modal" uk-modal>
            <div class="uk-modal-dialog kp-modal uk-modal-body uk-width-large">
                <button class="uk-modal-close-default" type="button" uk-close></button>
                <h3 class="kp-view-title">New Site</h3>
                <form id="create-site-form" class="uk-form-stacked uk-margin-top">
                    <div class="uk-grid-small" uk-grid>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Name</label>
                            <input class="uk-input kp-input" name="name" type="text" placeholder="mysite" required>
                        </div>
                        <div class="uk-width-1-2@s">
                            <label class="kp-label">Site Type</label>
                            <select class="uk-select kp-select" name="site_type" id="cs-site-type">
                                <option value="1">PHP</option>
                                <option value="3">Static HTML</option>
                                <option value="4">Node.js</option>
                                <option value="5">.NET</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s" id="cs-php-version-wrap">
                            <label class="kp-label">PHP Version</label>
                            <select class="uk-select kp-select" name="php_version">
                                <option value="3" selected>PHP 8.2</option>
                                <option value="4">PHP 8.3</option>
                                <option value="5">PHP 8.4</option>
                                <option value="6">PHP 8.5</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="cs-node-version-wrap">
                            <label class="kp-label">Node.js Version</label>
                            <select class="uk-select kp-select" name="node_version">
                                <option value="2" selected>Node 22 (LTS)</option>
                                <option value="3">Node 23</option>
                                <option value="4">Node 24</option>
                            </select>
                        </div>
                        <div class="uk-width-1-2@s uk-hidden" id="cs-dotnet-version-wrap">
                            <label class="kp-label">.NET Version</label>
                            <select class="uk-select kp-select" name="dotnet_version">
                                <option value="1">.NET 8.0 (LTS)</option>
                                <option value="2">.NET 9.0</option>
                                <option value="3" selected>.NET 10.0 (LTS)</option>
                            </select>
                        </div>
                        <div class="uk-width-1-1 uk-hidden" id="cs-start-command-wrap">
                            <label class="kp-label">Start Command</label>
                            <input class="uk-input kp-input" name="start_command" type="text" placeholder="node server.js or dotnet MyApp.dll">
                        </div>
                        <div class="uk-width-1-1" id="cs-wordpress-wrap">
                            <label><input class="uk-checkbox" type="checkbox" name="install_wordpress" checked> Install WordPress</label>
                        </div>
                        <div class="uk-width-1-1">
                            <label class="kp-label">Domains (one per line)</label>
                            <textarea class="uk-textarea kp-textarea" name="domains" rows="3" placeholder="example.com&#10;www.example.com"></textarea>
                        </div>
                    </div>
                    <div class="uk-flex uk-flex-right uk-margin-top" style="gap:8px">
                        <button type="button" class="uk-button kp-btn-ghost uk-modal-close">Cancel</button>
                        <button type="submit" class="uk-button kp-btn-primary">
                            <span uk-icon="server"></span> Create Site
                        </button>
                    </div>
                </form>
            </div>
        </div>`;

    document.body.insertAdjacentHTML("beforeend", html);
    const modal         = UIkit.modal("#kp-create-site-modal");
    const typeSelect    = document.getElementById("cs-site-type");
    const phpWrap       = document.getElementById("cs-php-version-wrap");
    const nodeWrap      = document.getElementById("cs-node-version-wrap");
    const dotnetWrap    = document.getElementById("cs-dotnet-version-wrap");
    const startWrap     = document.getElementById("cs-start-command-wrap");
    const wordpressWrap = document.getElementById("cs-wordpress-wrap");

    modal.show();

    typeSelect.addEventListener("change", () => {
        const t = parseInt(typeSelect.value);
        phpWrap.classList.toggle("uk-hidden",       t !== 1 && t !== 2);
        nodeWrap.classList.toggle("uk-hidden",      t !== 4);
        dotnetWrap.classList.toggle("uk-hidden",    t !== 5);
        startWrap.classList.toggle("uk-hidden",     t !== 4 && t !== 5);
        wordpressWrap.classList.toggle("uk-hidden", t !== 1);
    });

    document.getElementById("create-site-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn  = e.target.querySelector('[type="submit"]');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div uk-spinner="ratio: 0.6"></div> Creating...';

        const fd       = new FormData(e.target);
        const siteType = parseInt(fd.get("site_type"));
        let runtimeVersion = null;
        if (siteType === 4) runtimeVersion = parseInt(fd.get("node_version"));
        if (siteType === 5) runtimeVersion = parseInt(fd.get("dotnet_version"));

        const body = {
            name:              fd.get("name").trim(),
            php_version:       parseInt(fd.get("php_version")) || 3,
            site_type:         siteType,
            runtime_version:   runtimeVersion,
            start_command:     fd.get("start_command")?.trim() || "",
            domains:           fd.get("domains").split("\n").map((d) => d.trim()).filter(Boolean),
            install_wordpress: siteType === 1 ? fd.get("install_wordpress") === "on" : false,
        };

        modal.hide();
        document.getElementById("kp-create-site-modal")?.remove();
        showProgressModal("Creating Site", `Setting up '${body.name}' — pulling images and provisioning containers...`);

        try {
            await api.post("/sites", body);
            hideProgressModal();
            toast.success(`Site '${body.name}' created`);
            router.go("sites");
        } catch (err) {
            hideProgressModal();
            toast.error(err.message);
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });

    document.getElementById("kp-create-site-modal")
        .addEventListener("hidden", () => document.getElementById("kp-create-site-modal")?.remove());
}
