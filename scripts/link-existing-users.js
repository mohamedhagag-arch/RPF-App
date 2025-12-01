const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function linkExistingUsers() {
  console.log('👥 Linking existing users...\n');
  
  try {
    // Get all users from auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log(`❌ Error fetching auth users: ${authError.message}`);
      return;
    }
    
    console.log(`📊 Found ${authUsers.users.length} users in auth system:`);
    authUsers.users.forEach(user => {
      console.log(`   - ${user.email}: ${user.user_metadata?.full_name || 'No name'} (${user.user_metadata?.role || 'No role'})`);
    });
    
    // Define user roles and divisions
    const userConfigs = {
      'admin@rabat.com': { role: 'admin', division: 'Management', full_name: 'System Administrator' },
      'manager@rabat.com': { role: 'manager', division: 'Project Management', full_name: 'Project Manager' },
      'engineer@rabat.com': { role: 'engineer', division: 'Engineering', full_name: 'Site Engineer' },
      'viewer@rabat.com': { role: 'viewer', division: 'General', full_name: 'Project Viewer' },
      'test@rabat.com': { role: 'engineer', division: 'Testing', full_name: 'Test User' }
    };
    
    console.log('\n📊 Creating user records...');
    
    for (const authUser of authUsers.users) {
      const config = userConfigs[authUser.email] || {
        role: 'viewer',
        division: 'General',
        full_name: authUser.user_metadata?.full_name || authUser.email
      };
      
      console.log(`👤 Creating record for: ${authUser.email}`);
      
      try {
        // Create user record in public.users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: config.full_name,
            role: config.role,
            division: config.division
          })
          .select()
          .single();
        
        if (userError) {
          console.log(`❌ Error creating user record ${authUser.email}: ${userError.message}`);
        } else {
          console.log(`✅ User record created: ${authUser.email} (${config.role})`);
        }
        
      } catch (error) {
        console.log(`❌ Error creating user ${authUser.email}: ${error.message}`);
      }
    }
    
    // Verify final users
    console.log('\n📊 Final users list:');
    
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (finalError) {
      console.log(`❌ Error fetching final users: ${finalError.message}`);
    } else {
      console.log(`✅ Total users: ${finalUsers.length}`);
      finalUsers.forEach(user => {
        console.log(`   - ${user.email}: ${user.full_name} (${user.role}) - ${user.division}`);
      });
    }
    
    // Show login credentials
    console.log('\n🔐 Login Credentials:');
    console.log('================================');
    console.log('Note: Use the passwords you set when creating these users in Supabase Auth.');
    console.log('If you need to reset passwords, use the Supabase dashboard.');
    console.log('');
    finalUsers?.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Division: ${user.division}`);
      console.log('---');
    });
    
    console.log('\n🎉 Users linking completed!');
    console.log('📊 You can now login to the application.');
    console.log('🌐 Application URL: http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Error linking users:', error);
  }
}

linkExistingUsers().catch(console.error);
