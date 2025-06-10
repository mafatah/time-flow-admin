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

async function debugTimeReports() {
  console.log('🔍 Debugging Time Reports Access Issue...\n');

  try {
    // 1. Check Supabase connection
    console.log('1. Testing Supabase connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.error('❌ Supabase connection failed:', connectionError.message);
      return;
    }

    console.log('✅ Supabase connection successful');

    // 2. Check if there are any users in the database
    console.log('\n2. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .limit(10);

    if (usersError) {
      console.error('❌ Users table access error:', usersError.message);
      return;
    }

    console.log('✅ Found', users?.length || 0, 'users in the database');
    
    if (users && users.length > 0) {
      console.log('\n📋 User List:');
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (${user.full_name}) - Role: ${user.role}`);
      });
      
      // Check if there are any admin users
      const adminUsers = users.filter(user => user.role === 'admin');
      console.log(`\n👑 Admin users found: ${adminUsers.length}`);
      
      if (adminUsers.length === 0) {
        console.log('⚠️  WARNING: No admin users found!');
        console.log('📍 Action needed: You need to manually set a user role to "admin" in the database');
        
        if (users.length > 0) {
          console.log('\n🔧 To fix this, run:');
          console.log(`   node upgrade-to-admin.cjs ${users[0].email}`);
        }
      }
    } else {
      console.log('⚠️  No users found in database. You may need to create a user account first.');
    }

    // 3. Check time_logs table
    console.log('\n3. Testing time_logs table access...');
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select('id, user_id, start_time, end_time')
      .limit(5);

    if (timeLogsError) {
      console.error('❌ Time logs access error:', timeLogsError.message);
    } else {
      console.log('✅ Time logs accessible. Found', timeLogs?.length || 0, 'records');
    }

    // 4. Check projects table
    console.log('\n4. Testing projects table access...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);

    if (projectsError) {
      console.error('❌ Projects table access error:', projectsError.message);
    } else {
      console.log('✅ Projects table accessible. Found', projects?.length || 0, 'projects');
    }

    console.log('\n📊 Database Status Summary:');
    console.log('- Users table: ✅ Accessible');
    console.log('- Time logs table:', timeLogsError ? '❌ Error' : '✅ Accessible');
    console.log('- Projects table:', projectsError ? '❌ Error' : '✅ Accessible');
    
    console.log('\n📍 Next Steps:');
    console.log('1. Make sure you\'re logged in to the web app at http://localhost:8080/login');
    console.log('2. Ensure your user has admin role');
    console.log('3. Try accessing: http://localhost:8080/reports/time-reports');
    console.log('4. Check browser console for any JavaScript errors');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug function
debugTimeReports().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
}); 