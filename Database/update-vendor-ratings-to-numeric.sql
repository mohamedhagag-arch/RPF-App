-- =====================================================
-- Update Vendor Rating Columns to Numeric (0-5)
-- تحديث أعمدة التقييم إلى أرقام (0-5)
-- =====================================================

-- First, update existing values to numeric if possible
-- This step is skipped if columns are already NUMERIC
-- We'll handle conversion in the DO block below

-- Convert existing columns to NUMERIC if they exist, or add new ones
DO $$ 
DECLARE
  col_type TEXT;
BEGIN
  -- Check if columns exist and convert them
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'delivery') THEN
    -- Get current column type
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'delivery';
    
    -- Convert delivery
    IF col_type = 'text' THEN
      -- Convert from TEXT to NUMERIC
      ALTER TABLE vendors ALTER COLUMN delivery TYPE NUMERIC(3,1) USING 
        CASE 
          WHEN delivery::TEXT ~ '^[0-5](\.[0-9]+)?$' THEN delivery::NUMERIC
          WHEN delivery::TEXT ~ '[0-5]' THEN (regexp_match(delivery::TEXT, '[0-5](\.[0-9]+)?'))[1]::NUMERIC
          ELSE NULL
        END;
    ELSIF col_type != 'numeric' THEN
      -- Try to cast directly
      BEGIN
        ALTER TABLE vendors ALTER COLUMN delivery TYPE NUMERIC(3,1) USING delivery::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        -- If conversion fails, set to NULL
        ALTER TABLE vendors ALTER COLUMN delivery TYPE NUMERIC(3,1) USING NULL;
      END;
    END IF;
    
    -- Drop constraint if exists, then add it
    BEGIN
      ALTER TABLE vendors DROP CONSTRAINT check_delivery_range;
    EXCEPTION WHEN OTHERS THEN
      -- Constraint doesn't exist, that's fine
      NULL;
    END;
    ALTER TABLE vendors ADD CONSTRAINT check_delivery_range CHECK (delivery IS NULL OR (delivery >= 0 AND delivery <= 5));
  ELSE
    ALTER TABLE vendors ADD COLUMN delivery NUMERIC(3,1) CHECK (delivery IS NULL OR (delivery >= 0 AND delivery <= 5));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'quality') THEN
    -- Get current column type
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'quality';
    
    -- Convert quality
    IF col_type = 'text' THEN
      ALTER TABLE vendors ALTER COLUMN quality TYPE NUMERIC(3,1) USING 
        CASE 
          WHEN quality::TEXT ~ '^[0-5](\.[0-9]+)?$' THEN quality::NUMERIC
          WHEN quality::TEXT ~ '[0-5]' THEN (regexp_match(quality::TEXT, '[0-5](\.[0-9]+)?'))[1]::NUMERIC
          ELSE NULL
        END;
    ELSIF col_type != 'numeric' THEN
      BEGIN
        ALTER TABLE vendors ALTER COLUMN quality TYPE NUMERIC(3,1) USING quality::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        ALTER TABLE vendors ALTER COLUMN quality TYPE NUMERIC(3,1) USING NULL;
      END;
    END IF;
    
    -- Drop constraint if exists, then add it
    BEGIN
      ALTER TABLE vendors DROP CONSTRAINT check_quality_range;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    ALTER TABLE vendors ADD CONSTRAINT check_quality_range CHECK (quality IS NULL OR (quality >= 0 AND quality <= 5));
  ELSE
    ALTER TABLE vendors ADD COLUMN quality NUMERIC(3,1) CHECK (quality IS NULL OR (quality >= 0 AND quality <= 5));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'facility') THEN
    -- Get current column type
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'facility';
    
    -- Convert facility
    IF col_type = 'text' THEN
      ALTER TABLE vendors ALTER COLUMN facility TYPE NUMERIC(3,1) USING 
        CASE 
          WHEN facility::TEXT ~ '^[0-5](\.[0-9]+)?$' THEN facility::NUMERIC
          WHEN facility::TEXT ~ '[0-5]' THEN (regexp_match(facility::TEXT, '[0-5](\.[0-9]+)?'))[1]::NUMERIC
          ELSE NULL
        END;
    ELSIF col_type != 'numeric' THEN
      BEGIN
        ALTER TABLE vendors ALTER COLUMN facility TYPE NUMERIC(3,1) USING facility::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        ALTER TABLE vendors ALTER COLUMN facility TYPE NUMERIC(3,1) USING NULL;
      END;
    END IF;
    
    -- Drop constraint if exists, then add it
    BEGIN
      ALTER TABLE vendors DROP CONSTRAINT check_facility_range;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    ALTER TABLE vendors ADD CONSTRAINT check_facility_range CHECK (facility IS NULL OR (facility >= 0 AND facility <= 5));
  ELSE
    ALTER TABLE vendors ADD COLUMN facility NUMERIC(3,1) CHECK (facility IS NULL OR (facility >= 0 AND facility <= 5));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'capacity') THEN
    -- Get current column type
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'vendors' AND column_name = 'capacity';
    
    -- Convert capacity
    IF col_type = 'text' THEN
      ALTER TABLE vendors ALTER COLUMN capacity TYPE NUMERIC(3,1) USING 
        CASE 
          WHEN capacity::TEXT ~ '^[0-5](\.[0-9]+)?$' THEN capacity::NUMERIC
          WHEN capacity::TEXT ~ '[0-5]' THEN (regexp_match(capacity::TEXT, '[0-5](\.[0-9]+)?'))[1]::NUMERIC
          ELSE NULL
        END;
    ELSIF col_type != 'numeric' THEN
      BEGIN
        ALTER TABLE vendors ALTER COLUMN capacity TYPE NUMERIC(3,1) USING capacity::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        ALTER TABLE vendors ALTER COLUMN capacity TYPE NUMERIC(3,1) USING NULL;
      END;
    END IF;
    
    -- Drop constraint if exists, then add it
    BEGIN
      ALTER TABLE vendors DROP CONSTRAINT check_capacity_range;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    ALTER TABLE vendors ADD CONSTRAINT check_capacity_range CHECK (capacity IS NULL OR (capacity >= 0 AND capacity <= 5));
  ELSE
    ALTER TABLE vendors ADD COLUMN capacity NUMERIC(3,1) CHECK (capacity IS NULL OR (capacity >= 0 AND capacity <= 5));
  END IF;

  -- Update prices_rate to also be 0-5 if it's currently a large number
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'prices_rate') THEN
    -- Drop constraint if exists, then add it
    BEGIN
      ALTER TABLE vendors DROP CONSTRAINT check_prices_rate_range;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    -- Only add constraint if values are <= 5, otherwise keep as is (might be actual prices)
    ALTER TABLE vendors ADD CONSTRAINT check_prices_rate_range CHECK (prices_rate IS NULL OR (prices_rate >= 0 AND prices_rate <= 5));
  END IF;

  -- Update total_rate to be 0-5 (average rating)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'total_rate') THEN
    -- Convert total_rate to be 0-5 (average)
    -- If current values are > 5, divide by 5 to get average
    UPDATE vendors 
    SET total_rate = CASE 
      WHEN total_rate > 5 THEN total_rate / 5.0
      ELSE total_rate
    END
    WHERE total_rate IS NOT NULL AND total_rate > 5;
    
    -- Drop constraint if exists, then add it
    BEGIN
      ALTER TABLE vendors DROP CONSTRAINT check_total_rate_range;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    ALTER TABLE vendors ADD CONSTRAINT check_total_rate_range CHECK (total_rate IS NULL OR (total_rate >= 0 AND total_rate <= 5));
  ELSE
    ALTER TABLE vendors ADD COLUMN total_rate NUMERIC(3,2) CHECK (total_rate IS NULL OR (total_rate >= 0 AND total_rate <= 5));
  END IF;
END $$;

-- Update prices_rate to also be 0-5 if it's not already a rate
-- Note: prices_rate might be a price, so we'll add a comment
COMMENT ON COLUMN vendors.prices_rate IS 'Can be either a price (numeric) or rating (0-5)';

-- If you want prices_rate to also be a rating (0-5), uncomment this:
-- ALTER TABLE vendors 
--   DROP COLUMN IF EXISTS prices_rate;
-- ALTER TABLE vendors 
--   ADD COLUMN prices_rate NUMERIC(3,1) CHECK (prices_rate >= 0 AND prices_rate <= 5);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendors_delivery ON vendors(delivery);
CREATE INDEX IF NOT EXISTS idx_vendors_quality ON vendors(quality);
CREATE INDEX IF NOT EXISTS idx_vendors_facility ON vendors(facility);
CREATE INDEX IF NOT EXISTS idx_vendors_capacity ON vendors(capacity);

-- Verify columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'vendors' 
  AND column_name IN ('delivery', 'quality', 'facility', 'capacity', 'prices_rate')
ORDER BY column_name;

