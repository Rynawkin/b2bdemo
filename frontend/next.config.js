/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', '138.197.187.138'],
  },
}

module.exports = nextConfig
// Trigger Vercel rebuild - Fix top-products & top-customers routes - 5 Ara 2025 10:20
