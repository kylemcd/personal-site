/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        appDir: true,
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
        ],
    },
};

module.exports = nextConfig;
