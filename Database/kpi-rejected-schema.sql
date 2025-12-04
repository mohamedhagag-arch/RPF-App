-- ============================================================
-- جدول KPIs المرفوضة (Rejected KPIs)
-- ============================================================
-- هذا الجدول يحفظ KPIs المرفوضة بشكل منفصل عن الجدول الأساسي
-- حتى لا تظهر في الجدول الأساسي للـ KPI

CREATE TABLE IF NOT EXISTS public.kpi_rejected (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- ✅ نسخ جميع الأعمدة من الجدول الأساسي
  "Project Full Code" TEXT,
  "Project Code" TEXT,
  "Project Sub Code" TEXT,
  "Activity Name" TEXT,
  "Activity" TEXT,
  "Activity Division" TEXT, -- ✅ Activity Division column
  "Activity Scope" TEXT,
  "Activity Timing" TEXT,
  "Input Type" TEXT,
  "Quantity" TEXT,
  "Unit" TEXT,
  "Section" TEXT,
  "Zone" TEXT,
  "Zone Ref" TEXT,
  "Zone #" TEXT,
  "Zone Number" TEXT, -- ✅ Zone Number column
  "Drilled Meters" TEXT,
  "Value" TEXT,
  "Target Date" TEXT,
  "Actual Date" TEXT,
  "Activity Date" TEXT,
  "Day" TEXT,
  "Recorded By" TEXT,
  "Notes" TEXT,
  -- ✅ Approval/Rejection columns (from main KPI table)
  "Approval Status" TEXT,
  "Approved By" TEXT,
  "Approval Date" TEXT,
  -- ✅ Additional columns that may exist in KPI table
  "Column 45" TEXT,
  "Column 44" TEXT,
  "Total Units" TEXT,
  "Planned Units" TEXT,
  "Actual Units" TEXT,
  "Diffrence" TEXT,
  "Variance Units" TEXT,
  "Rate" TEXT,
  "Total Value" TEXT,
  "Planned Activity Start Date" TEXT,
  "Deadline" TEXT,
  "Calendar Duration" TEXT,
  "Activity Progress %" TEXT,
  "Productivity Daily Rate" TEXT,
  "Total Drilling Meters" TEXT,
  "Drilled Meters Planned Progress" TEXT,
  "Drilled Meters Actual Progress" TEXT,
  "Remaining Meters" TEXT,
  "Activity Planned Status" TEXT,
  "Activity Actual Status" TEXT,
  "Reported on Data Date?" TEXT,
  "Planned Value" TEXT,
  "Earned Value" TEXT,
  "Delay %" TEXT,
  "Planned Progress %" TEXT,
  "Activity Planned Start Date" TEXT,
  "Activity Planned Completion Date" TEXT,
  "Activity Delayed?" TEXT,
  "Activity On Track?" TEXT,
  "Activity Completed" TEXT,
  "Project Full Name" TEXT,
  "Project Status" TEXT,
  "Remaining Work Value" TEXT,
  "Variance Works Value" TEXT,
  "LookAhead Start Date" TEXT,
  "LookAhead Activity Completion Date" TEXT,
  "Remaining LookAhead Duration For Activity Completion" TEXT,
  
  -- ✅ معلومات الرفض
  "Rejection Reason" TEXT,
  "Rejected By" TEXT,
  "Rejected Date" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "Original KPI ID" UUID, -- ✅ ID من الجدول الأساسي (إن وجد)
  
  -- ✅ Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE public.kpi_rejected IS 'KPIs المرفوضة - منفصلة عن الجدول الأساسي';
COMMENT ON COLUMN public.kpi_rejected."Original KPI ID" IS 'ID من الجدول الأساسي قبل الرفض';
COMMENT ON COLUMN public.kpi_rejected."Rejection Reason" IS 'سبب الرفض';
COMMENT ON COLUMN public.kpi_rejected."Rejected By" IS 'من رفض الـ KPI';
COMMENT ON COLUMN public.kpi_rejected."Rejected Date" IS 'تاريخ الرفض';

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_kpi_rejected_project_code 
  ON public.kpi_rejected("Project Full Code");

CREATE INDEX IF NOT EXISTS idx_kpi_rejected_activity 
  ON public.kpi_rejected("Activity Name");

CREATE INDEX IF NOT EXISTS idx_kpi_rejected_rejected_date 
  ON public.kpi_rejected("Rejected Date");

CREATE INDEX IF NOT EXISTS idx_kpi_rejected_original_id 
  ON public.kpi_rejected("Original KPI ID");

CREATE INDEX IF NOT EXISTS idx_kpi_rejected_activity_division 
  ON public.kpi_rejected("Activity Division");

CREATE INDEX IF NOT EXISTS idx_kpi_rejected_zone_number 
  ON public.kpi_rejected("Zone Number");

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.kpi_rejected ENABLE ROW LEVEL SECURITY;

-- ✅ Policy: يمكن لجميع المستخدمين المصرح لهم قراءة KPIs المرفوضة
CREATE POLICY "kpi_rejected_select_all_authenticated"
  ON public.kpi_rejected
  FOR SELECT
  TO authenticated
  USING (true);

-- ✅ Policy: يمكن للمستخدمين المصرح لهم إضافة KPIs مرفوضة
CREATE POLICY "kpi_rejected_insert_authenticated"
  ON public.kpi_rejected
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated'
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (
        users.role = 'admin' 
        OR users.role = 'manager'
        OR EXISTS (
          SELECT 1 FROM unnest(users.permissions) AS perm
          WHERE perm = 'kpi.approve'
        )
      )
    )
  );

-- ✅ Policy: يمكن للمستخدمين المصرح لهم تحديث KPIs مرفوضة
CREATE POLICY "kpi_rejected_update_authenticated"
  ON public.kpi_rejected
  FOR UPDATE
  TO authenticated
  USING (
    auth.role() = 'authenticated'
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (
        users.role = 'admin' 
        OR users.role = 'manager'
        OR EXISTS (
          SELECT 1 FROM unnest(users.permissions) AS perm
          WHERE perm = 'kpi.approve'
        )
      )
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (
        users.role = 'admin' 
        OR users.role = 'manager'
        OR EXISTS (
          SELECT 1 FROM unnest(users.permissions) AS perm
          WHERE perm = 'kpi.approve'
        )
      )
    )
  );

-- ✅ Policy: يمكن للمستخدمين المصرح لهم حذف KPIs مرفوضة (Admin فقط)
CREATE POLICY "kpi_rejected_delete_admin"
  ON public.kpi_rejected
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- ✅ Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_rejected TO authenticated;
GRANT SELECT ON public.kpi_rejected TO anon;

-- ============================================================
-- Trigger: تحديث updated_at تلقائياً
-- ============================================================
CREATE OR REPLACE FUNCTION update_kpi_rejected_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kpi_rejected_updated_at
  BEFORE UPDATE ON public.kpi_rejected
  FOR EACH ROW
  EXECUTE FUNCTION update_kpi_rejected_updated_at();

-- ============================================================
-- Trigger: تسجيل created_by و updated_by
-- ============================================================
CREATE OR REPLACE FUNCTION set_kpi_rejected_user_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = COALESCE(
      current_setting('app.user_email', true),
      current_setting('app.user_id', true),
      'System'
    );
    NEW.updated_by = NEW.created_by;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by = COALESCE(
      current_setting('app.user_email', true),
      current_setting('app.user_id', true),
      OLD.updated_by,
      'System'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER kpi_rejected_user_fields
  BEFORE INSERT OR UPDATE ON public.kpi_rejected
  FOR EACH ROW
  EXECUTE FUNCTION set_kpi_rejected_user_fields();

