// PodNest - Self-hosted site management platform
// Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
// Licensed under the MIT License. See LICENSE file in the project root for full license text.

"use strict";

export const api = {
    async _req(method, path, body, timeout = 60000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const opts = { method, headers: { "Content-Type": "application/json" }, signal: controller.signal };
        if (method !== "GET" && method !== "HEAD") {
            opts.headers["X-CSRF-Token"] = window.KP?.csrf ?? "";
        }
        if (body !== undefined) opts.body = JSON.stringify(body);
        try {
            const res = await fetch("/api" + path, opts);
            clearTimeout(timer);
            const data = res.status === 204 ? null : await res.json().catch(() => null);
            if (res.status === 401) {
                window.location.href = '/login?msg=Your+session+has+expired+%E2%80%94+please+log+in+again';
                return null;
            }
            if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
            return data;
        } catch (err) {
            clearTimeout(timer);
            throw err;
        }
    },
    get:    (path)                => api._req("GET",    path),
    post:   (path, body, timeout) => api._req("POST",   path, body, timeout),
    put:    (path, body, timeout) => api._req("PUT",    path, body, timeout),
    delete: (path)                => api._req("DELETE", path),
    patch:  (path, body)          => api._req("PATCH",  path, body),
};
