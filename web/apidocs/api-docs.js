/*
PodNest - Self-hosted site management platform
Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com>
Licensed under the MIT License. See LICENSE file in the project root for full license text.
*/

// Bootstraps the Scalar API reference. Kept as an external file (not inline in
// api-docs.html) because the panel CSP uses a nonce'd script-src with no
// 'unsafe-inline'; served from /api-docs/ it is covered by script-src 'self'.
// The Scalar library itself loads from jsdelivr @latest, already whitelisted in
// the CSP script-src, so it always tracks the newest release.
document.addEventListener('DOMContentLoaded', function () {

    // Scalar renders into this element
    var mount = document.createElement('div');
    mount.id = 'scalar-mount';
    document.body.appendChild(mount);

    // pull the always-latest standalone build
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference';
    s.onload = function () {

        // spec is served from the same admin-gated tree, so the session cookie
        // rides along on the same-origin fetch (connect-src 'self')
        Scalar.createApiReference('#scalar-mount', {
            url: '/api-docs/openapi.json',
            theme: 'none',
            darkMode: true,
            defaultHttpClient: { targetKey: 'javascript', clientKey: 'fetch' },
            metaData: { title: 'PodNest API Reference' }
        });
        // NOTE: if a future Scalar release drops the top-level `url` key,
        // switch it to `sources: [{ url: '/api-docs/openapi.json' }]`.
    };
    document.body.appendChild(s);
});