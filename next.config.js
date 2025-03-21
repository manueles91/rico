/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure all API routes are dynamically rendered
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
  // Set up path rewrites for API routes
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
  // Apply output configuration for better stability
  output: 'standalone',
};

module.exports = nextConfig;
