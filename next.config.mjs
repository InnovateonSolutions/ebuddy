/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // requerido para Docker multi-stage build
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=(), geolocation=()',
          },
        ],
      },
    ]
  },
  experimental: {
    serverComponentsExternalPackages: ['@azure/msal-node', 'googleapis'],
  },
}

export default nextConfig
