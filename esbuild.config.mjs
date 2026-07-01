// PodNest esbuild build config
import { build } from 'esbuild';

// real newline in the banner via a template literal — no shell escaping games
build({
    entryPoints: ['web/static/src/js/app.js'],
    bundle: true,
    minify: true,
    outfile: 'web/static/js/app.js',
    banner: { js: `/*! PodNest - Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com> | MIT License */\n` }
}).catch(() => process.exit(1));