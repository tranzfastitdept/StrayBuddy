// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  reactStrictMode: true,

  // Fewer, smaller files shipped to the phone on first load.
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-leaflet', 'leaflet'],
  },

  // The map library is large and only needed on the client.
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  // Trim the client bundle of dev-only code paths.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};
module.exports = nextConfig;
