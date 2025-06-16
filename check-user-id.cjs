require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'process.env.VITE_SUPABASE_URL';
const supabaseKey = 'process.env.VITE_SUPABASE_ANON_KEY';


// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('🔍 Checking users in database...');
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role');

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    console.log('👥 Users found:');
    users.forEach(user => {
      console.log(`  - ID: ${user.id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Name: ${user.full_name}`);
      console.log(`    Role: ${user.role}`);
      console.log('');
    });

    // Check if employee@timeflow.com exists
    const employeeUser = users.find(u => u.email === 'employee@timeflow.com');
    if (employeeUser) {
      console.log('✅ Found employee@timeflow.com user:');
      console.log(`   UUID: ${employeeUser.id}`);
      console.log('');
      console.log('📝 Update desktop-agent/config.json with:');
      console.log(`   "user_id": "${employeeUser.id}"`);
    } else {
      console.log('❌ No user found with email: employee@timeflow.com');
      console.log('');
      console.log('💡 Available options:');
      console.log('1. Create a user with email employee@timeflow.com');
      console.log('2. Use an existing user ID from the list above');
    }

  } catch (error) {
    console.error('❌ Failed to check users:', error);
  }
}

checkUsers(); 