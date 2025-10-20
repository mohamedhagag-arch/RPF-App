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
  
  // ✅ HTTP optimizations
  httpAgentOptions: {
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    freeSocketTimeout: 30000,
  },
  
  // ✅ Static file handling
  trailingSlash: false,
  assetPrefix: '',
  
  // ✅ Experimental features for performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // ✅ Output configuration for Vercel
  output: 'standalone',
  
  // ✅ Advanced webpack configuration for performance
  webpack: (config, { dev, isServer }) => {
    // ✅ Development optimizations
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      }
      
      // ✅ Faster rebuilds
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      }
    }
    
    // ✅ Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: false,
            vendors: false,
            
            // ✅ Vendor chunk optimization
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
              reuseExistingChunk: true,
            },
            
            // ✅ Supabase chunk
            supabase: {
              name: 'supabase',
              chunks: 'all',
              test: /node_modules\/@supabase/,
              priority: 30,
              reuseExistingChunk: true,
            },
            
            // ✅ React chunk
            react: {
              name: 'react',
              chunks: 'all',
              test: /node_modules\/(react|react-dom)/,
              priority: 25,
              reuseExistingChunk: true,
            },
            
            // ✅ UI components chunk
            ui: {
              name: 'ui',
              chunks: 'all',
              test: /node_modules\/(lucide-react|recharts)/,
              priority: 15,
              reuseExistingChunk: true,
            },
            
            // ✅ Common chunk
            common: {
              name: 'common',
              chunks: 'all',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
        
        // ✅ Tree shaking optimization
        usedExports: true,
        sideEffects: false,
        
        // ✅ Module concatenation
        concatenateModules: true,
      }
      
      // ✅ Module resolution optimization
      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          '@': require('path').resolve(__dirname),
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      }
    }
    
    // ✅ Bundle analyzer (uncomment for analysis)
    // if (process.env.ANALYZE === 'true') {
    //   const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
    //   config.plugins.push(
    //     new BundleAnalyzerPlugin({
    //       analyzerMode: 'static',
    //       openAnalyzer: false,
    //     })
    //   )
    // }
    
    return config
  },
  
  // ✅ On-demand entries optimization
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
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
