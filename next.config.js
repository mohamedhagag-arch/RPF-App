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
    keepAlive: false,
  },
  // Fix for static files issues
  trailingSlash: false,
  assetPrefix: '',
  // Ensure proper static file handling
  experimental: {
    optimizeCss: false,
    // ✅ Disable Fast Refresh to prevent constant re-mounting
    fastRefresh: false,
  },
  // Webpack configuration for better static file handling
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
      // ✅ Disable hot reloading to prevent constant re-mounting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
          },
        },
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
