-- Allow Arabic job titles to be optional while keeping uniqueness for non-null values

BEGIN;

-- 1) Drop the existing NOT NULL + unique constraint on title_ar
ALTER TABLE job_titles
  ALTER COLUMN title_ar DROP NOT NULL;

ALTER TABLE job_titles
  DROP CONSTRAINT IF EXISTS job_titles_title_ar_key;

-- 2) Clean up existing empty strings now that NULL values are allowed
UPDATE job_titles
SET title_ar = NULL
WHERE title_ar IS NOT NULL AND trim(title_ar) = '';

-- 3) Re-create uniqueness only for populated Arabic titles (case-insensitive)
DROP INDEX IF EXISTS job_titles_title_ar_unique_non_null;

CREATE UNIQUE INDEX job_titles_title_ar_unique_non_null
  ON job_titles (lower(trim(title_ar)))
  WHERE title_ar IS NOT NULL AND trim(title_ar) <> '';

COMMIT;


