# ✅ Migration to Production Checklist

## 📋 Pre-Migration (Before Starting)

- [ ] **Backup current data**
  - Go to Settings → Database Management → Create Full Backup
  - Save file: `database_backup_YYYY-MM-DD.json`
  - Keep backup in safe place (Google Drive, Dropbox)

- [ ] **Save current credentials**
  - Copy `.env.local` to `.env.local.backup`
  - Note down current Supabase URL and keys

- [ ] **Verify all features working**
  - Test login
  - Test all pages
  - Test data operations

---

## 🆕 Create New Supabase Project

- [ ] **Go to Supabase Dashboard**
  - URL: https://supabase.com/dashboard
  - Sign in or create account

- [ ] **Create New Project**
  - Project Name: `AlRabat-RPF-Production`
  - Database Password: `________________` (SAVE THIS!)
  - Region: Frankfurt (or closest)
  - Pricing Plan: Pro ($25/month recommended)
  - Click "Create Project"
  - Wait 2-3 minutes

- [ ] **Get Connection Details**
  - Go to Settings → API
  - Copy and save:
    - Project URL: `https://_____.supabase.co`
    - anon public key: `eyJhbGc...`
    - service_role key: `eyJhbGc...` (Click "Reveal")

---

## 🗄️ Setup Database

- [ ] **Run SQL Schema**
  - Open Supabase Dashboard → SQL Editor
  - Click "New Query"
  - Open file: `Database/PRODUCTION_SCHEMA_COMPLETE.sql`
  - Copy all content (Ctrl+A, Ctrl+C)
  - Paste in SQL Editor (Ctrl+V)
  - Click "Run" or press F5
  - Wait for completion message

- [ ] **Verify Tables Created**
  - Go to Table Editor
  - Should see 10 tables:
    - ✅ users
    - ✅ Planning Database - ProjectsList
    - ✅ Planning Database - BOQ Rates
    - ✅ Planning Database - KPI
    - ✅ divisions
    - ✅ project_types
    - ✅ currencies
    - ✅ holidays
    - ✅ activities
    - ✅ company_settings

---

## 👤 Create Admin User

- [ ] **Run Migration Script**
  ```bash
  npm run migrate-to-production
  ```
  OR
  ```bash
  node scripts/migrate-to-production.js
  ```

- [ ] **Follow Prompts**
  - Enter new Supabase URL
  - Enter anon key
  - Enter service role key
  - Create admin user? (y)
  - Admin email: `______________`
  - Admin password: `______________` (min 8 chars)
  - Admin name: `______________`

- [ ] **Save Admin Credentials**
  - Email: `______________`
  - Password: `______________`

---

## 🔧 Update Local Project

- [ ] **Update .env.local**
  - Open `.env.local`
  - Update these values:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=https://_____.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
    SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```

- [ ] **Restart Local Server**
  - Stop server (Ctrl+C)
  - Start again: `npm run dev`
  - Open: http://localhost:3000

- [ ] **Test Local Connection**
  - Login with new admin credentials
  - Should see empty dashboard (no data yet)
  - Check Console (F12) for errors

---

## 📥 Import Data

- [ ] **Go to Database Management**
  - Settings → Database Management → Restore

- [ ] **Load Backup File**
  - Click "Choose File"
  - Select: `database_backup_YYYY-MM-DD.json`
  - Click "Load Backup File"

- [ ] **Review Backup Info**
  - Check date
  - Check tables count
  - Check rows count

- [ ] **Choose Import Mode**
  - Select: "Append" (safe - adds to existing data)
  - Click "Restore Database"

- [ ] **Wait for Completion**
  - Progress bar will show
  - Wait 1-3 minutes
  - Should see: "Restore completed successfully!"

- [ ] **Verify Data Imported**
  - Go to Projects → Should see all projects
  - Go to BOQ → Should see all activities
  - Go to KPI → Should see all KPIs
  - Test creating new project
  - Test reports

---

## ☁️ Deploy to Vercel

- [ ] **Update Vercel Environment Variables**
  - Go to: https://vercel.com/dashboard
  - Select project: `alrabat-rpf`
  - Go to: Settings → Environment Variables

- [ ] **Update Each Variable**
  
  Variable: `NEXT_PUBLIC_SUPABASE_URL`
  - Value: `https://_____.supabase.co`
  - Environment: ✅ Production
  - Click "Save"
  
  Variable: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Value: `eyJhbGc...` (new anon key)
  - Environment: ✅ Production
  - Click "Save"
  
  Variable: `SUPABASE_SERVICE_ROLE_KEY`
  - Value: `eyJhbGc...` (new service key)
  - Environment: ✅ Production
  - Click "Save"
  
  Variable: `NEXT_PUBLIC_APP_URL`
  - Value: `https://alrabat-rpf.vercel.app`
  - Environment: ✅ Production
  - Click "Save"

- [ ] **Redeploy Application**
  
  Method 1 - Via Git:
  ```bash
  git add .
  git commit -m "Migrate to production Supabase"
  git push origin main
  ```
  
  Method 2 - Via Vercel Dashboard:
  - Deployments → Select latest
  - Menu (...) → "Redeploy"
  - Use existing Build Cache: No
  - Click "Redeploy"

- [ ] **Wait for Deployment**
  - Wait 2-5 minutes
  - Check deployment status

---

## ✅ Final Verification

### Database:
- [ ] All 10 tables exist
- [ ] Data imported successfully
- [ ] RLS enabled on all tables
- [ ] Indexes created
- [ ] Policies working

### Local Application:
- [ ] `.env.local` updated
- [ ] Connection works
- [ ] Login works
- [ ] All pages load
- [ ] No errors in Console (F12)

### Live Application:
- [ ] Open: https://alrabat-rpf.vercel.app
- [ ] Login works
- [ ] Dashboard loads
- [ ] Projects page works
- [ ] BOQ page works
- [ ] KPI page works
- [ ] Reports work
- [ ] Settings work
- [ ] No errors in Console

### Security:
- [ ] Strong database password saved
- [ ] Service role key saved securely
- [ ] No keys committed to Git
- [ ] Admin credentials saved
- [ ] Backup file saved safely

### Performance:
- [ ] Page load time < 5 seconds
- [ ] No connection timeouts
- [ ] All data displays correctly
- [ ] Reports generate successfully

---

## 🎉 Post-Migration Tasks

### Immediately:
- [ ] Create real user accounts
  - Settings → User Management → Add User
- [ ] Customize Company Settings
  - Settings → Company Settings
- [ ] Add custom holidays
  - Settings → Holidays
- [ ] Test all features with team

### Within a Week:
- [ ] Train team on the system
- [ ] Import any additional real data
- [ ] Monitor performance
- [ ] Share link with team
- [ ] Setup user permissions

### Maintenance Schedule:
- [ ] **Weekly:**
  - Manual backup
  - Review logs
  - Check performance
  
- [ ] **Monthly:**
  - Clean old data
  - Review Supabase usage/billing
  - Update packages (`npm update`)
  - Review team feedback

---

## 🚨 Important Notes

### ⚠️ Do NOT delete old Supabase project yet!
- Keep it for at least 1 month as backup
- Verify everything works on new setup first
- Keep final backup before deleting

### 🔐 Save These Securely:
- Database password
- Service role key
- Admin credentials
- Backup files
- `.env.local.backup`

### 📞 If Problems Occur:
1. Check detailed guide: `MIGRATION_TO_PRODUCTION_SUPABASE.md`
2. Check Console logs (F12)
3. Check Supabase logs (Dashboard → Logs)
4. Check Vercel logs (Deployments → View Function Logs)
5. Restore from backup if needed

---

## 📊 Quick Reference

### Commands:
```bash
# Run migration wizard
npm run migrate-to-production

# Restart dev server
npm run dev

# Deploy to production
git push origin main
```

### URLs:
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Local App:** http://localhost:3000
- **Live App:** https://alrabat-rpf.vercel.app

### Files:
- **SQL Schema:** `Database/PRODUCTION_SCHEMA_COMPLETE.sql`
- **Migration Script:** `scripts/migrate-to-production.js`
- **Detailed Guide:** `MIGRATION_TO_PRODUCTION_SUPABASE.md`
- **Quick Guide (Arabic):** `الانتقال_للحساب_الفعلي_خطوات_سريعة.md`

---

## ✅ Completion Status

Migration Started: `____/____/________ __:__`

Migration Completed: `____/____/________ __:__`

Total Time Taken: `_______ minutes`

Issues Encountered: 
```
_____________________________________________
_____________________________________________
_____________________________________________
```

---

**🎯 Once all checkboxes are checked, migration is complete!**

**Congratulations! You're now on production Supabase! 🚀**

