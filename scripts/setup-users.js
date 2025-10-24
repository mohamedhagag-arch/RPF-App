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

async function setupUsers() {
  console.log('👥 Setting up users...\n');
  
  try {
    // First, clear existing users
    console.log('🗑️ Clearing existing users...');
    
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.log(`❌ Error clearing users: ${deleteError.message}`);
    } else {
      console.log('✅ Existing users cleared');
    }
    
    // Define users to create
    const users = [
      {
        email: 'admin@rabat.com',
        full_name: 'System Administrator',
        role: 'admin',
        division: 'Management'
      },
      {
        email: 'manager@rabat.com',
        full_name: 'Project Manager',
        role: 'manager',
        division: 'Project Management'
      },
      {
        email: 'engineer@rabat.com',
        full_name: 'Site Engineer',
        role: 'engineer',
        division: 'Engineering'
      },
      {
        email: 'viewer@rabat.com',
        full_name: 'Project Viewer',
        role: 'viewer',
        division: 'General'
      },
      {
        email: 'test@rabat.com',
        full_name: 'Test User',
        role: 'engineer',
        division: 'Testing'
      }
    ];
    
    console.log('\n📊 Creating users...');
    
    for (const user of users) {
      console.log(`👤 Creating user: ${user.email}`);
      
      try {
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'Rabat123!',
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
            role: user.role,
            division: user.division
          }
        });
        
        if (authError) {
          console.log(`❌ Error creating auth user ${user.email}: ${authError.message}`);
          continue;
        }
        
        console.log(`✅ Auth user created: ${user.email}`);
        
        // Create user record in public.users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            division: user.division
          })
          .select()
          .single();
        
        if (userError) {
          console.log(`❌ Error creating user record ${user.email}: ${userError.message}`);
        } else {
          console.log(`✅ User record created: ${user.email} (${user.role})`);
        }
        
      } catch (error) {
        console.log(`❌ Error creating user ${user.email}: ${error.message}`);
      }
    }
    
    // Verify users were created
    console.log('\n📊 Verifying created users...');
    
    const { data: createdUsers, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (fetchError) {
      console.log(`❌ Error fetching users: ${fetchError.message}`);
    } else {
      console.log(`✅ Found ${createdUsers.length} users in database:`);
      createdUsers.forEach(user => {
        console.log(`   - ${user.email}: ${user.full_name} (${user.role}) - ${user.division}`);
      });
    }
    
    // Show login credentials
    console.log('\n🔐 Login Credentials:');
    console.log('================================');
    console.log('All users have the same password: Rabat123!');
    console.log('');
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Password: Rabat123!`);
      console.log(`Role: ${user.role}`);
      console.log(`Division: ${user.division}`);
      console.log('---');
    });
    
    console.log('\n🎉 Users setup completed!');
    console.log('📊 You can now login to the application with any of these credentials.');
    console.log('🌐 Application URL: http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Error setting up users:', error);
  }
}

setupUsers().catch(console.error);
