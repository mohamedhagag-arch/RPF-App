-- Remove Duplicate KPI Notifications
-- حذف الإشعارات المكررة لـ KPI

-- This script removes duplicate notifications (same kpi_id + recipient_id + notification_type)
-- هذا السكريبت يحذف الإشعارات المكررة (نفس kpi_id + recipient_id + notification_type)

-- Step 1: Find duplicates
SELECT 
    kpi_id,
    recipient_id,
    notification_type,
    COUNT(*) as duplicate_count
FROM kpi_notifications
WHERE kpi_id IS NOT NULL
GROUP BY kpi_id, recipient_id, notification_type
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Delete duplicates, keeping only the most recent one
-- This will keep the notification with the latest created_at for each kpi_id + recipient_id + notification_type combination
DELETE FROM kpi_notifications
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY kpi_id, recipient_id, notification_type 
                ORDER BY created_at DESC, id DESC
            ) as rn
        FROM kpi_notifications
        WHERE kpi_id IS NOT NULL
    ) t
    WHERE rn > 1
);

-- Also handle cases where kpi_id might be NULL (keep only one per recipient_id + notification_type)
DELETE FROM kpi_notifications
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY recipient_id, notification_type, title, message
                ORDER BY created_at DESC, id DESC
            ) as rn
        FROM kpi_notifications
        WHERE kpi_id IS NULL
    ) t
    WHERE rn > 1
);

-- Step 3: Verify - should return 0 rows
SELECT 
    kpi_id,
    recipient_id,
    notification_type,
    COUNT(*) as duplicate_count
FROM kpi_notifications
WHERE kpi_id IS NOT NULL
GROUP BY kpi_id, recipient_id, notification_type
HAVING COUNT(*) > 1;

-- Step 4: Add unique constraint to prevent future duplicates (optional but recommended)
-- Note: This will fail if duplicates still exist, so run Step 2 first
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'kpi_notifications_unique_kpi_recipient_type'
    ) THEN
        ALTER TABLE kpi_notifications
        ADD CONSTRAINT kpi_notifications_unique_kpi_recipient_type
        UNIQUE (kpi_id, recipient_id, notification_type);
        
        RAISE NOTICE '✅ Added unique constraint to prevent duplicate notifications';
    ELSE
        RAISE NOTICE 'ℹ️ Unique constraint already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '⚠️ Could not add unique constraint. Please remove duplicates first.';
END $$;

