const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

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