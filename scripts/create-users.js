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

async function createUsers() {
  console.log('👥 Creating users...\n');
  
  try {
    // Define users to create
    const users = [
      {
        email: 'admin@rabat.com',
        full_name: 'System Administrator',
        role: 'admin',
        division: 'Management',
        password: 'Admin123!'
      },
      {
        email: 'manager@rabat.com',
        full_name: 'Project Manager',
        role: 'manager',
        division: 'Project Management',
        password: 'Manager123!'
      },
      {
        email: 'engineer@rabat.com',
        full_name: 'Site Engineer',
        role: 'engineer',
        division: 'Engineering',
        password: 'Engineer123!'
      },
      {
        email: 'viewer@rabat.com',
        full_name: 'Project Viewer',
        role: 'viewer',
        division: 'General',
        password: 'Viewer123!'
      },
      {
        email: 'test@rabat.com',
        full_name: 'Test User',
        role: 'engineer',
        division: 'Testing',
        password: 'Test123!'
      }
    ];
    
    console.log('📊 Creating users...');
    
    for (const user of users) {
      console.log(`👤 Creating user: ${user.email}`);
      
      try {
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
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
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role: ${user.role}`);
      console.log(`Division: ${user.division}`);
      console.log('---');
    });
    
    console.log('\n🎉 Users creation completed!');
    console.log('📊 You can now login to the application with any of these credentials.');
    
  } catch (error) {
    console.error('❌ Error creating users:', error);
  }
}

createUsers().catch(console.error);
