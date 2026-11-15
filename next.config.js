// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Enable React Strict Mode
  reactStrictMode: true,
};
module.exports = nextConfig;