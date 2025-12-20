/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['books.google.com'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'books.google.com',
      },
      {
        protocol: 'https',
        hostname: 'books.google.com',
      },
    ],
  },
}

module.exports = nextConfig

