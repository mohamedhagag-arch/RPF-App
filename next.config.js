/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Disable React Strict Mode to prevent double mounting in development
  reactStrictMode: false,
  images: {
    domains: ['localhost'],
  },
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  httpAgentOptions: {
    keepAlive: true,
  },
  // Fix for static files issues
  trailingSlash: false,
  assetPrefix: '',
  // Ensure proper static file handling
  experimental: {
    optimizeCss: false,
  },
  // Webpack configuration for better static file handling
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
  // Disable caching in development to prevent stale data issues
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig
