const { getSupabaseClient } = require('../lib/supabase.ts');

async function addDashboardPermission() {
  try {
    const supabase = getSupabaseClient();
    
    console.log('🔍 بدء إضافة صلاحية Dashboard...');
    
    // جلب المستخدم الحالي
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'hajeta4728@aupvs.com')
      .single();

    if (fetchError) {
      console.error('❌ خطأ في جلب المستخدم:', fetchError);
      return;
    }

    console.log('📊 المستخدم الحالي:', user.email);
    console.log('📋 الصلاحيات الحالية:', user.permissions?.length || 0);

    // إضافة dashboard.view إلى الصلاحيات
    const currentPermissions = user.permissions || [];
    const newPermissions = [...currentPermissions];
    
    if (!newPermissions.includes('dashboard.view')) {
      newPermissions.push('dashboard.view');
      console.log('✅ تم إضافة dashboard.view');
    } else {
      console.log('ℹ️ dashboard.view موجودة بالفعل');
    }

    // تحديث قاعدة البيانات
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        permissions: newPermissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ خطأ في التحديث:', updateError);
      return;
    }

    console.log('✅ تم تحديث الصلاحيات بنجاح!');
    console.log('📊 عدد الصلاحيات الجديد:', updatedUser.permissions?.length || 0);
    console.log('📋 الصلاحيات الجديدة:', updatedUser.permissions);

    // التحقق من وجود dashboard.view
    if (updatedUser.permissions.includes('dashboard.view')) {
      console.log('✅ dashboard.view موجودة في الصلاحيات!');
    } else {
      console.log('❌ dashboard.view غير موجودة في الصلاحيات!');
    }

  } catch (error) {
    console.error('❌ خطأ عام:', error);
  }
}

addDashboardPermission();
