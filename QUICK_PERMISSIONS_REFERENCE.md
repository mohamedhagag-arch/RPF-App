# 🔐 Quick Permissions Reference

## 🎯 What Each Role Can Do

### 👑 **Admin** (46 permissions)
```
✅ EVERYTHING
✅ Manage Users
✅ Full Database Management (Backup, Restore, Import, Export, Clear)
✅ All Settings Management
✅ All System Operations
```

### 👨‍💼 **Manager** (36 permissions)
```
✅ Manage Projects (Create, Edit, Delete)
✅ Manage BOQ Activities (All operations)
✅ Manage KPIs (All operations)
✅ Manage Settings (Company, Divisions, Types, Currencies, Holidays)
✅ View & Export Reports
✅ Database: Backup & Export only
❌ Cannot manage Users
❌ Cannot Restore/Import/Clear Database
```

### 👨‍🔧 **Engineer** (18 permissions)
```
✅ View Projects
✅ Create & Edit BOQ Activities
✅ Create & Edit KPIs
✅ View & Export Reports
✅ View Database Stats
❌ Cannot Delete anything
❌ Cannot Manage Settings
❌ Cannot Manage Database
```

### 👁️ **Viewer** (11 permissions)
```
✅ View Everything (Projects, BOQ, KPIs, Reports)
✅ View Database Statistics
❌ Cannot Create/Edit/Delete anything
❌ Cannot Export
❌ Cannot Manage anything
```

---

## 🗄️ Database Management Permissions

| Permission | Admin | Manager | Engineer | Viewer |
|-----------|-------|---------|----------|--------|
| View Stats | ✅ | ✅ | ✅ | ✅ |
| Create Backups | ✅ | ✅ | ❌ | ❌ |
| Restore Database | ✅ | ❌ | ❌ | ❌ |
| Export Tables | ✅ | ✅ | ❌ | ❌ |
| Import Tables | ✅ | ❌ | ❌ | ❌ |
| Clear Table Data | ✅ | ❌ | ❌ | ❌ |
| Full Management | ✅ | ❌ | ❌ | ❌ |

---

## ⚙️ Settings Permissions (Updated)

| Permission | Admin | Manager | Engineer | Viewer |
|-----------|-------|---------|----------|--------|
| View Settings | ✅ | ✅ | ✅ | ✅ |
| Company Settings 🆕 | ✅ | ✅ | ❌ | ❌ |
| Divisions | ✅ | ✅ | ❌ | ❌ |
| Project Types | ✅ | ✅ | ❌ | ❌ |
| Currencies | ✅ | ✅ | ❌ | ❌ |
| Activities | ✅ | ✅ | ❌ | ❌ |
| Holidays 🆕 | ✅ | ✅ | ❌ | ❌ |

---

## 🚨 Dangerous Operations (Admin Only)

```
⚠️ database.restore - Restore entire database
⚠️ database.import - Import data to tables
⚠️ database.clear - Clear all table data
⚠️ users.delete - Delete users
⚠️ users.permissions - Manage permissions
```

---

## 📝 How to Use

### Check Permission:
```typescript
import { hasPermission } from '@/lib/permissionsSystem'

const canBackup = hasPermission(appUser, 'database.backup')
```

### Check Multiple:
```typescript
import { hasAnyPermission } from '@/lib/permissionsSystem'

const canManageSettings = hasAnyPermission(appUser, [
  'settings.company',
  'settings.divisions'
])
```

### Get User's Available Actions:
```typescript
import { getAvailableActions } from '@/lib/permissionsSystem'

const dbActions = getAvailableActions(appUser, 'database')
// Returns: ['view', 'backup', 'export'] for Manager
```

---

## 🎯 Summary

**Total Permissions:** 46 (was 39)  
**New Category:** Database (7 permissions)  
**Updated Category:** Settings (7 permissions, was 5)  
**No Database Changes Required:** Works immediately!

✅ **Ready to use!**

