-- Allow Arabic department names to be optional while preserving uniqueness for non-null values

BEGIN;

-- 1) Drop NOT NULL and current unique constraint on name_ar
ALTER TABLE departments
  ALTER COLUMN name_ar DROP NOT NULL;

ALTER TABLE departments
  DROP CONSTRAINT IF EXISTS departments_name_ar_key;

-- 2) Convert empty strings to NULL now that the column accepts NULL
UPDATE departments
SET name_ar = NULL
WHERE name_ar IS NOT NULL AND trim(name_ar) = '';

-- 3) Recreate uniqueness only for populated Arabic names (case-insensitive)
DROP INDEX IF EXISTS departments_name_ar_unique_non_null;

CREATE UNIQUE INDEX departments_name_ar_unique_non_null
  ON departments (lower(trim(name_ar)))
  WHERE name_ar IS NOT NULL AND trim(name_ar) <> '';

COMMIT;

