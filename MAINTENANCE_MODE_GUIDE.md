# 🛠️ Maintenance Mode Guide

## Overview

A comprehensive maintenance mode management system has been created. When maintenance mode is enabled, the site will be closed for all users except the Admin.

## Features

✅ **Professional and Dynamic Maintenance Page** - Modern design with attractive visual effects
✅ **Full Protection** - Site closed for all users except admin
✅ **Full Control from Settings** - Enable/disable from settings panel
✅ **Custom Messages** - Ability to customize maintenance message and estimated time
✅ **Auto Refresh** - Page automatically refreshes when maintenance mode is disabled
✅ **Middleware Level Protection** - Protection works even before page loads

## Created Files

### 1. Maintenance Page
- `components/maintenance/MaintenancePage.tsx` - Main maintenance page component
- `app/maintenance/page.tsx` - Maintenance page route

### 2. Maintenance Mode Hook
- `hooks/useMaintenanceMode.ts` - Hook to check maintenance status

### 3. System Updates
- `middleware.ts` - Updated to check maintenance mode
- `app/(authenticated)/layout.tsx` - Added maintenance check in layout
- `components/settings/SystemSettingsManager.tsx` - Added maintenance category in settings

### 4. Database
- `Database/maintenance-mode-settings.sql` - SQL script to initialize settings

## How to Use

### 1. Initialize Database

Run the following SQL script in Supabase:

```sql
-- Run file: Database/maintenance-mode-settings.sql
```

Or run it manually from Supabase Dashboard.

### 2. Enable Maintenance Mode

1. Log in as Admin
2. Go to **Settings** → **System Settings**
3. Select **Maintenance Mode** tab
4. Enable **Maintenance Mode Enabled**
5. Edit **Maintenance Message** (optional)
6. Edit **Maintenance Estimated Time** (optional)
7. Click **Save Changes**

### 3. Disable Maintenance Mode

1. Log in as Admin
2. Go to **Settings** → **System Settings**
3. Select **Maintenance Mode** tab
4. Disable **Maintenance Mode Enabled**
5. Click **Save Changes**

## Available Settings

### 1. Maintenance Mode Enabled
- **Type**: Boolean (true/false)
- **Description**: Enable/disable maintenance mode
- **Default**: false

### 2. Maintenance Message
- **Type**: String
- **Description**: Message displayed to users
- **Default**: "We are performing maintenance on the site. We apologize for the inconvenience and will be back soon."

### 3. Maintenance Estimated Time
- **Type**: String
- **Description**: Estimated time for maintenance completion
- **Default**: "30 minutes"

## How the System Works

### 1. Middleware Level
- Maintenance mode is checked in `middleware.ts`
- If maintenance mode is enabled and user is not admin, redirect to `/maintenance`
- Only admin can access the site

### 2. Layout Level
- Maintenance mode is checked in `app/(authenticated)/layout.tsx`
- If maintenance mode is enabled and user is not admin, show maintenance page
- Only admin can see normal content

### 3. Auto Refresh
- Maintenance page automatically checks every 10 seconds for maintenance status
- When disabled, page automatically reloads

## Important Notes

⚠️ **Warning**: When enabling maintenance mode, the site will be closed for all users except admin. Make sure you want this before enabling.

✅ **Tip**: Use maintenance mode when:
- Performing major system updates
- Database maintenance
- Deploying important updates
- Fixing critical issues

## Technical Features

- **Performance**: Uses Cache for settings check
- **Security**: Protection at Middleware and Layout levels
- **UX**: Professional design with attractive visual effects
- **Accessibility**: Full support for all devices
- **Responsive**: Works on all devices

## Support

If you encounter any issues, make sure:
1. SQL script for settings initialization has been run
2. User has Admin permissions
3. Settings exist in `system_settings` table

---

**Created by**: AI Assistant  
**Date**: 2024
