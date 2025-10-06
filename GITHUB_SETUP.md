# GitHub Setup Guide

## 🚀 Quick Setup Commands

```bash
# 1. Initialize Git
git init

# 2. Add all files
git add .

# 3. First commit
git commit -m "Initial commit: Rabat MVP Project Management System"

# 4. Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/rabat-mvp.git

# 5. Push to GitHub
git branch -M main
git push -u origin main
```

## 📋 Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] Build test passed (`npm run build`)
- [ ] All dependencies installed
- [ ] Supabase project ready
- [ ] Database schema deployed

## 🔧 Vercel Deployment

1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## 🌐 Live URL
After deployment: `https://rabat-mvp.vercel.app`
