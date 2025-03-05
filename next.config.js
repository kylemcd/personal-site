/** @type {import('next').NextConfig} */
// const { withContentlayer } = require('next-contentlayer');
const withMarkdoc = require('@markdoc/next.js');
const nextConfig = {
    experimental: {
        mdxRs: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'i.scdn.co',
                port: '',
                pathname: '/image/**',
            },
            {
                protocol: 'https',
                hostname: 'mosaic.scdn.co',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'cdn.akamai.steamstatic.com',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'assets.literal.club',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'http',
                hostname: 'books.google.com',
                port: '',
                pathname: '**',
            },
        ],
    },
};

module.exports = withMarkdoc({ mode: 'static', ...nextConfig })({
    pageExtensions: ['md', 'mdoc', 'js', 'jsx', 'ts', 'tsx'],
});

// module.exports = withContentlayer(nextConfig);
