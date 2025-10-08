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
  // Output configuration for Vercel
  output: 'standalone',
  // Webpack configuration for better static file handling
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    
    // Fix for static file issues in production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Create a separate chunk for vendor libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
            },
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
