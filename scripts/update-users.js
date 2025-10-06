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

async function updateUsers() {
  console.log('👥 Updating users...\n');
  
  try {
    // Get all existing users
    const { data: existingUsers, error: fetchError } = await supabase
      .from('users')
      .select('*');
    
    if (fetchError) {
      console.log(`❌ Error fetching users: ${fetchError.message}`);
      return;
    }
    
    console.log(`📊 Found ${existingUsers.length} existing users:`);
    existingUsers.forEach(user => {
      console.log(`   - ${user.email}: ${user.full_name} (${user.role}) - ${user.division || 'No division'}`);
    });
    
    // Define users to update/create
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
    
    console.log('\n📊 Updating user information...');
    
    for (const user of users) {
      console.log(`👤 Updating user: ${user.email}`);
      
      // Check if user exists
      const existingUser = existingUsers.find(u => u.email === user.email);
      
      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: user.full_name,
            role: user.role,
            division: user.division
          })
          .eq('email', user.email);
        
        if (updateError) {
          console.log(`❌ Error updating user ${user.email}: ${updateError.message}`);
        } else {
          console.log(`✅ User updated: ${user.email} (${user.role})`);
        }
      } else {
        // Create new user record (without auth for now)
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            division: user.division
          });
        
        if (insertError) {
          console.log(`❌ Error creating user ${user.email}: ${insertError.message}`);
        } else {
          console.log(`✅ User created: ${user.email} (${user.role})`);
        }
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
        console.log(`   - ${user.email}: ${user.full_name} (${user.role}) - ${user.division || 'No division'}`);
      });
    }
    
    // Show login information
    console.log('\n🔐 Login Information:');
    console.log('================================');
    console.log('Note: If you need to reset passwords, use the Supabase dashboard or create new auth users.');
    console.log('Current users in database:');
    finalUsers?.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });
    
    console.log('\n🎉 Users update completed!');
    
  } catch (error) {
    console.error('❌ Error updating users:', error);
  }
}

updateUsers().catch(console.error);
