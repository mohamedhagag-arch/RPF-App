# ✅ Complete Audit Log System Setup Guide

## 📋 Overview

This guide explains how to set up a complete audit log system that tracks **EVERY** change to KPI, BOQ, and Projects records, even if a record is modified 100 times.

## 🎯 What the Audit Log System Does

The audit log system automatically records:
- ✅ **Every INSERT** (creation)
- ✅ **Every UPDATE** (modification) - even if 100 times!
- ✅ **Every DELETE**
- ✅ **Every APPROVE/REJECT** (for KPIs)
- ✅ **Who made the change** (user email/ID)
- ✅ **When the change was made** (timestamp)
- ✅ **What changed** (old values vs new values)
- ✅ **Summary of changes**

## 🚀 Quick Setup

### Step 1: Create Audit Log Tables

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Login and select your project

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run the Audit Log Script**
   - Open file: `Database/create-audit-log-tables.sql`
   - Copy ALL the content
   - Paste into SQL Editor
   - Click **RUN** or press `Ctrl+Enter`

4. **Verify Success**
   - You should see success messages
   - The script will create 3 tables:
     - `boq_audit_log`
     - `projects_audit_log`
     - `kpi_audit_log`
   - The script will also create triggers that automatically log all changes

## 📊 How It Works

### Automatic Logging

Once the triggers are created, **every change is automatically logged**:

1. **When you create a BOQ**: A record is added to `boq_audit_log` with action `INSERT`
2. **When you update a BOQ**: A record is added with action `UPDATE`, showing old and new values
3. **When you delete a BOQ**: A record is added with action `DELETE`
4. **Same for Projects and KPIs**

### Viewing History

1. Click the **👤** button in the Actions column
2. The **Record History Modal** will open
3. It will show:
   - **All audit log entries** (if available) - showing every single change
   - **Basic history** (if audit log not available) - showing created_by and updated_by only

## 🔍 Verify Audit Log is Working

### Check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('boq_audit_log', 'projects_audit_log', 'kpi_audit_log');
```

### Check if triggers exist:
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN ('boq_audit_trigger', 'projects_audit_trigger', 'kpi_audit_trigger');
```

### View recent audit log entries:
```sql
-- BOQ audit log
SELECT * FROM boq_audit_log ORDER BY changed_at DESC LIMIT 10;

-- Projects audit log
SELECT * FROM projects_audit_log ORDER BY changed_at DESC LIMIT 10;

-- KPI audit log
SELECT * FROM kpi_audit_log ORDER BY changed_at DESC LIMIT 10;
```

## 📝 What Gets Logged

### For Each Change:
- **Action Type**: INSERT, UPDATE, DELETE, APPROVE, REJECT
- **Changed By**: Email or ID of the user
- **Changed At**: Timestamp of the change
- **Old Values**: Complete record before change (JSON)
- **New Values**: Complete record after change (JSON)
- **Changes Summary**: Text summary of what changed

### Example Audit Log Entry:
```json
{
  "id": "uuid",
  "boq_id": "uuid",
  "action": "UPDATE",
  "changed_by": "user@example.com",
  "changed_at": "2025-01-15T10:30:00Z",
  "old_values": {
    "Planned Units": "100",
    "Total Value": "5000"
  },
  "new_values": {
    "Planned Units": "150",
    "Total Value": "7500"
  }
}
```

## 🎯 Benefits

1. ✅ **Complete History**: See every single change, even if modified 100 times
2. ✅ **Automatic**: No need to manually log changes - triggers do it automatically
3. ✅ **Detailed**: See exactly what changed (old value → new value)
4. ✅ **User Tracking**: Know who made each change
5. ✅ **Timestamp**: Know when each change was made
6. ✅ **Audit Trail**: Perfect for compliance and debugging

## 🐛 Troubleshooting

### Problem: Audit log tables don't exist

**Solution:**
- Run `Database/create-audit-log-tables.sql` script
- Verify tables were created using the SQL queries above

### Problem: Changes not being logged

**Solution:**
- Check if triggers exist: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%audit%'`
- If triggers don't exist, re-run the script
- Check Supabase logs for trigger errors

### Problem: History Modal shows "No audit log entries"

**Solution:**
- This is normal for old records (created before audit log was set up)
- New changes will be logged automatically
- The modal will show basic history (created_by, updated_by) for old records

## 📝 Notes

- **Old Records**: Records created before the audit log system won't have complete history
- **New Records**: All new changes will be logged automatically
- **Performance**: Audit logs are indexed for fast queries
- **Storage**: Audit logs can grow large over time - consider archiving old logs periodically

## 🎯 After Setup

Once the audit log system is set up:

1. ✅ Every new change will be automatically logged
2. ✅ Click 👤 button to see complete history
3. ✅ See every modification, even if 100 times
4. ✅ Know exactly who changed what and when
5. ✅ View detailed changes (old value → new value)

---

**Need Help?** Check the console logs for detailed debugging information when viewing history.

