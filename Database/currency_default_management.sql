-- ============================================================
-- CURRENCY DEFAULT MANAGEMENT
-- إدارة العملة الافتراضية
-- ============================================================

-- دالة لتحديث العملة الافتراضية
CREATE OR REPLACE FUNCTION update_currency_defaults()
RETURNS VOID AS $$
BEGIN
  -- إلغاء الافتراضية من جميع العملات
  UPDATE public.currencies SET is_default = false WHERE is_default = true;
END;
$$ LANGUAGE plpgsql;

-- دالة لضمان وجود عملة افتراضية واحدة فقط
CREATE OR REPLACE FUNCTION ensure_single_default_currency()
RETURNS VOID AS $$
DECLARE
  default_count INTEGER;
BEGIN
  -- عد العملات الافتراضية
  SELECT COUNT(*) INTO default_count FROM public.currencies WHERE is_default = true;
  
  -- إذا كان هناك أكثر من عملة افتراضية، اجعل الأولى فقط افتراضية
  IF default_count > 1 THEN
    UPDATE public.currencies 
    SET is_default = false 
    WHERE id NOT IN (
      SELECT id FROM public.currencies 
      WHERE is_default = true 
      ORDER BY created_at ASC 
      LIMIT 1
    );
  END IF;
  
  -- إذا لم تكن هناك عملة افتراضية، اجعل الأولى افتراضية
  IF default_count = 0 THEN
    UPDATE public.currencies 
    SET is_default = true 
    WHERE id = (
      SELECT id FROM public.currencies 
      ORDER BY created_at ASC 
      LIMIT 1
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger لضمان عملة افتراضية واحدة فقط
CREATE OR REPLACE FUNCTION trigger_ensure_single_default_currency()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا كان السجل الجديد افتراضياً
  IF NEW.is_default = true THEN
    -- إلغاء الافتراضية من جميع العملات الأخرى
    UPDATE public.currencies 
    SET is_default = false 
    WHERE id != NEW.id AND is_default = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger
DROP TRIGGER IF EXISTS ensure_single_default_currency_trigger ON public.currencies;
CREATE TRIGGER ensure_single_default_currency_trigger
  BEFORE INSERT OR UPDATE ON public.currencies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ensure_single_default_currency();

-- رسالة نجاح
SELECT 'Currency default management functions created successfully!' as status;
