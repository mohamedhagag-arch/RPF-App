-- Add Retention columns to Planning Database - ProjectsList
DO $$
BEGIN
    -- Add Retention after Completion column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Planning Database - ProjectsList' AND column_name = 'Retention after Completion') THEN
        ALTER TABLE "public"."Planning Database - ProjectsList"
        ADD COLUMN "Retention after Completion" NUMERIC(5,2) NULL;
        RAISE NOTICE 'Column "Retention after Completion" added to "Planning Database - ProjectsList" table.';
    ELSE
        RAISE NOTICE 'Column "Retention after Completion" already exists in "Planning Database - ProjectsList" table.';
    END IF;

    -- Add Retention after 6 Month column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Planning Database - ProjectsList' AND column_name = 'Retention after 6 Month') THEN
        ALTER TABLE "public"."Planning Database - ProjectsList"
        ADD COLUMN "Retention after 6 Month" NUMERIC(5,2) NULL;
        RAISE NOTICE 'Column "Retention after 6 Month" added to "Planning Database - ProjectsList" table.';
    ELSE
        RAISE NOTICE 'Column "Retention after 6 Month" already exists in "Planning Database - ProjectsList" table.';
    END IF;

    -- Add Retention after 12 Month column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Planning Database - ProjectsList' AND column_name = 'Retention after 12 Month') THEN
        ALTER TABLE "public"."Planning Database - ProjectsList"
        ADD COLUMN "Retention after 12 Month" NUMERIC(5,2) NULL;
        RAISE NOTICE 'Column "Retention after 12 Month" added to "Planning Database - ProjectsList" table.';
    ELSE
        RAISE NOTICE 'Column "Retention after 12 Month" already exists in "Planning Database - ProjectsList" table.';
    END IF;
END $$;

