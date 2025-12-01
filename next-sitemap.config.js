/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://rabat-mvp.vercel.app',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: [
    '/api/*',
    '/admin/*',
    '/_next/*',
    '/static/*',
    '/scripts/*',
    '/Database/*',
    '*.md',
    '*.json',
    '*.js',
    '*.ts',
    '*.tsx'
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/static/',
          '/scripts/',
          '/Database/'
        ]
      }
    ]
  },
  transform: async (config, path) => {
    // Custom transform function
    return {
      loc: path,
      changefreq: 'daily',
      priority: path === '/' ? 1.0 : 0.8,
      lastmod: new Date().toISOString()
    }
  }
}
