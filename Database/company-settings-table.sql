-- إنشاء جدول إعدادات الشركة
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL DEFAULT 'AlRabat RPF',
    company_slogan TEXT NOT NULL DEFAULT 'Masters of Foundation Construction',
    company_logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_company_settings_created_at ON company_settings(created_at DESC);

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث updated_at
DROP TRIGGER IF EXISTS trigger_update_company_settings_updated_at ON company_settings;
CREATE TRIGGER trigger_update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_company_settings_updated_at();

-- إدراج إعدادات افتراضية
INSERT INTO company_settings (company_name, company_slogan, created_by, updated_by)
VALUES (
    'AlRabat RPF',
    'Masters of Foundation Construction',
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1)
) ON CONFLICT DO NOTHING;

-- سياسات Row Level Security (RLS)
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة - جميع المستخدمين المسجلين يمكنهم القراءة
CREATE POLICY "Users can read company settings" ON company_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- سياسة للتحديث - فقط المديرين يمكنهم التحديث
CREATE POLICY "Admins can update company settings" ON company_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- سياسة للإدراج - فقط المديرين يمكنهم الإدراج
CREATE POLICY "Admins can insert company settings" ON company_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- سياسة للحذف - فقط المديرين يمكنهم الحذف
CREATE POLICY "Admins can delete company settings" ON company_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- دالة للحصول على إعدادات الشركة الحالية
CREATE OR REPLACE FUNCTION get_company_settings()
RETURNS TABLE (
    company_name TEXT,
    company_slogan TEXT,
    company_logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.company_name,
        cs.company_slogan,
        cs.company_logo_url,
        cs.updated_at
    FROM company_settings cs
    ORDER BY cs.updated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث إعدادات الشركة
CREATE OR REPLACE FUNCTION update_company_settings(
    p_company_name TEXT,
    p_company_slogan TEXT,
    p_company_logo_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- التحقق من صلاحيات المستخدم
    SELECT role INTO user_role
    FROM users
    WHERE id = auth.uid();
    
    IF user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can update company settings';
    END IF;
    
    -- تحديث الإعدادات
    UPDATE company_settings 
    SET 
        company_name = p_company_name,
        company_slogan = p_company_slogan,
        company_logo_url = p_company_logo_url,
        updated_by = auth.uid()
    WHERE id = (
        SELECT id FROM company_settings 
        ORDER BY updated_at DESC 
        LIMIT 1
    );
    
    -- إذا لم توجد إعدادات، إنشاء جديدة
    IF NOT FOUND THEN
        INSERT INTO company_settings (
            company_name, 
            company_slogan, 
            company_logo_url,
            created_by,
            updated_by
        ) VALUES (
            p_company_name,
            p_company_slogan,
            p_company_logo_url,
            auth.uid(),
            auth.uid()
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تعليقات على الجدول
COMMENT ON TABLE company_settings IS 'إعدادات الشركة العامة مثل الاسم والشعار واللوجو';
COMMENT ON COLUMN company_settings.company_name IS 'اسم الشركة';
COMMENT ON COLUMN company_settings.company_slogan IS 'شعار الشركة';
COMMENT ON COLUMN company_settings.company_logo_url IS 'رابط لوجو الشركة';
COMMENT ON COLUMN company_settings.created_by IS 'المستخدم الذي أنشأ الإعدادات';
COMMENT ON COLUMN company_settings.updated_by IS 'المستخدم الذي حدث الإعدادات آخر مرة';
