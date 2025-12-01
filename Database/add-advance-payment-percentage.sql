-- ============================================================
-- Add Advance Payment Percentage column to Projects table
-- ============================================================

-- Add column if it doesn't exist
ALTER TABLE public."Planning Database - ProjectsList"
ADD COLUMN IF NOT EXISTS "Advance Payment Percentage" TEXT;

-- Add comment
COMMENT ON COLUMN public."Planning Database - ProjectsList"."Advance Payment Percentage" IS 'Percentage of advance payment (0-100)';

-- Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_projects_advance_payment_percentage 
  ON public."Planning Database - ProjectsList"("Advance Payment Percentage");















