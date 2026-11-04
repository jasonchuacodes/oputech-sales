import { randomUUID } from 'node:crypto'
import type { NextConfig } from 'next'

const nestApiUrl = process.env.NEST_API_URL ?? 'http://localhost:3000'
const buildVersion = process.env.APP_BUILD_VERSION ?? randomUUID()

const nextConfig: NextConfig = {
  env: {
    APP_BUILD_VERSION: buildVersion,
  },
  generateBuildId: async () => buildVersion,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${nestApiUrl}/api/:path*`,
      },
      {
        source: '/graphql',
        destination: `${nestApiUrl}/graphql`,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ]
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
