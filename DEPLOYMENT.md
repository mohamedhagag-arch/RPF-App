# AlRabat RPF - Masters of Foundation Construction - Deployment Guide

## 🚀 Deployment to Vercel

### Prerequisites
- GitHub account
- Vercel account
- Supabase project

### Step 1: Prepare the Project

1. **Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Build Test**
   ```bash
   npm run build
   ```

### Step 2: Push to GitHub

1. **Initialize Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: AlRabat RPF - Masters of Foundation Construction"
   ```

2. **Create GitHub Repository**
   - Go to [GitHub](https://github.com)
   - Create a new repository named `rabat-mvp`
   - Don't initialize with README (we already have one)

3. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/rabat-mvp.git
   git branch -M main
   git push -u origin main
   ```

### Step 3: Deploy to Vercel

1. **Connect to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your `rabat-mvp` repository

2. **Configure Environment Variables**
   - In Vercel dashboard, go to Project Settings > Environment Variables
   - Add the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL = your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key
   ```

3. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be available at `https://rabat-mvp.vercel.app`

### Step 4: Configure Supabase

1. **Update Supabase Settings**
   - Go to Supabase Dashboard > Settings > API
   - Add your Vercel domain to allowed origins:
   ```
   https://rabat-mvp.vercel.app
   https://rabat-mvp-git-main.vercel.app
   ```

2. **Database Setup**
   - Run the database setup scripts in your Supabase SQL editor
   - Import your data using the provided scripts

### Step 5: Custom Domain (Optional)

1. **Add Custom Domain**
   - In Vercel dashboard, go to Project Settings > Domains
   - Add your custom domain
   - Update DNS records as instructed

2. **Update Supabase Origins**
   - Add your custom domain to Supabase allowed origins

## 🔧 Configuration Files

### vercel.json
- Configured for Next.js 14
- Environment variables setup
- Security headers
- Function timeout settings

### .gitignore
- Excludes sensitive files
- Node modules and build artifacts
- Environment variables

## 📊 Monitoring

### Vercel Analytics
- Built-in performance monitoring
- Real-time analytics
- Error tracking

### Supabase Monitoring
- Database performance
- API usage
- Real-time subscriptions

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check environment variables
   - Verify all dependencies are installed
   - Check TypeScript errors

2. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check network policies
   - Ensure database is accessible

3. **Authentication Issues**
   - Check Supabase auth settings
   - Verify redirect URLs
   - Check CORS settings

### Support
- Check Vercel logs in dashboard
- Check Supabase logs
- Review browser console for errors

## 🔄 Continuous Deployment

### Automatic Deployments
- Every push to `main` branch triggers deployment
- Preview deployments for pull requests
- Automatic rollback on build failures

### Manual Deployments
- Use Vercel CLI: `vercel --prod`
- Deploy specific branches
- Promote preview deployments

## 📈 Performance Optimization

### Vercel Optimizations
- Automatic code splitting
- Image optimization
- Edge caching
- CDN distribution

### Next.js Optimizations
- Static generation where possible
- Dynamic imports
- Bundle analysis
- Performance monitoring
