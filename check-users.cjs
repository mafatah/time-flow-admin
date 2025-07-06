const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://fkpiqcxkmrtaetvfgcli.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4');

async function checkUsers() {
  console.log('📋 Checking existing users in the system...');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`✅ Found ${users?.length || 0} users in the system:`);
  if (users && users.length > 0) {
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.full_name || user.email} (${user.role}) - ${new Date(user.created_at).toLocaleString()}`);
    });
  }
  
  // Check if there are any users with similar email patterns
  const { data: similarUsers, error: similarError } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .or('email.ilike.%afatah%,email.ilike.%m_%,full_name.ilike.%afatah%');
  
  if (!similarError && similarUsers && similarUsers.length > 0) {
    console.log('\n🔍 Found users with similar names:');
    similarUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.full_name || user.email} (${user.role})`);
    });
  }
}

checkUsers();
