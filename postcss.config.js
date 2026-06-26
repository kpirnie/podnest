module.exports = {
    plugins: [
        require('postcss-import'),
        require('cssnano')({ preset: 'default' }),
        require('postcss-banner')({
            banner: 'PodNest - Copyright (c) 2026 Kevin Pirnie <iam@kevinpirnie.com> | MIT License',
            important: true
        }),
    ],
};