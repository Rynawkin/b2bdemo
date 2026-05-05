/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '138.197.187.138' },
      { protocol: 'https', hostname: 'b2bdemo.bakircilarkampanya.com' },
    ],
  },
}

module.exports = nextConfig
// Trigger Vercel rebuild - Fix top-products & top-customers routes - 5 Ara 2025 10:20
