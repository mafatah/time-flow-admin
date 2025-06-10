const { createClient } = require('@supabase/supabase-js');

// Supabase configuration from the client file
const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

async function upgradeUserToAdmin(userEmail) {
  console.log('🔧 Upgrading User to Admin Role...\n');

  try {
    if (!userEmail) {
      console.log('📧 No email provided. Looking for users to upgrade...');
      
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .limit(10);

      if (usersError) {
        console.error('❌ Error fetching users:', usersError.message);
        return;
      }

      if (!users || users.length === 0) {
        console.log('❌ No users found in database');
        return;
      }

      console.log('\n📋 Available users:');
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.full_name}) - Role: ${user.role}`);
      });

      console.log('\n📍 Usage: node upgrade-to-admin.cjs <email>');
      console.log(`📍 Example: node upgrade-to-admin.cjs ${users[0].email}`);
      return;
    }

    console.log('👤 Target user:', userEmail);

    // Find the user by email
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('email', userEmail)
      .single();

    if (fetchError) {
      console.error('❌ Error finding user:', fetchError.message);
      return;
    }

    if (!userData) {
      console.log('❌ User not found:', userEmail);
      return;
    }

    console.log('📋 Found user:', userData.full_name, '(', userData.email, ')');
    console.log('📋 Current role:', userData.role);

    if (userData.role === 'admin') {
      console.log('✅ User already has admin role!');
      return;
    }

    // Upgrade to admin
    console.log('🔄 Upgrading role to admin...');
    const { data, error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userData.id)
      .select();

    if (updateError) {
      console.error('❌ Error upgrading role:', updateError.message);
      return;
    }

    console.log('✅ Successfully upgraded', userEmail, 'to admin role!');
    console.log('📍 The user can now access admin features including time reports');
    console.log('📍 URL: http://localhost:8080/reports/time-reports');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Get email from command line arguments
const userEmail = process.argv[2];

// Run the upgrade function
upgradeUserToAdmin(userEmail).then(() => {
  console.log('\n✅ Upgrade process complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Upgrade failed:', error);
  process.exit(1);
}); 