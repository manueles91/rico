/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // This will allow all API routes to be dynamic
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // Specify which routes should be dynamic and not statically generated
  unstable_allowDynamic: [
    // Allow all API routes to be dynamic
    '/api/**/*',
  ],
};

module.exports = nextConfig;
