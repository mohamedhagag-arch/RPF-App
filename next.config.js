/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Disable React Strict Mode to prevent double mounting in development
  reactStrictMode: false,
  
  // ✅ Performance optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // ✅ Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // ✅ HTTP optimizations (removed unsupported options for Vercel)
  // httpAgentOptions: {
  //   keepAlive: true,
  //   keepAliveMsecs: 30000,
  //   maxSockets: 50,
  //   maxFreeSockets: 10,
  //   timeout: 60000,
  //   freeSocketTimeout: 30000,
  // },
  
  // ✅ Static file handling
  trailingSlash: false,
  assetPrefix: '',
  
  // ✅ Experimental features for performance (simplified for Vercel)
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
  
  // ✅ Output configuration for Vercel (removed standalone for compatibility)
  // output: 'standalone',
  
  // ✅ Simplified webpack configuration for Vercel compatibility
  webpack: (config, { dev, isServer }) => {
    // ✅ Basic optimizations only
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
          },
        },
      }
    }
    
    return config
  },
  
  // ✅ On-demand entries optimization (removed for Vercel compatibility)
  // onDemandEntries: {
  //   maxInactiveAge: 25 * 1000,
  //   pagesBufferLength: 2,
  // },
  
  // ✅ Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
