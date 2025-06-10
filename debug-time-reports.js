import { supabase } from './src/integrations/supabase/client.js';

async function debugTimeReports() {
  console.log('🔍 Debugging Time Reports Access Issue...\n');

  try {
    // 1. Check Supabase connection
    console.log('1. Checking Supabase connection...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session Error:', sessionError.message);
      return;
    }

    if (!session) {
      console.log('❌ No active session found. Please log in first.');
      console.log('📍 Action: Go to http://localhost:8080/login');
      return;
    }

    console.log('✅ Session found for user:', session.user.email);

    // 2. Check user details and role
    console.log('\n2. Checking user role...');
    const { data: userDetails, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', session.user.id)
      .single();

    if (userError) {
      console.error('❌ User fetch error:', userError.message);
      return;
    }

    if (!userDetails) {
      console.log('❌ No user details found in database');
      return;
    }

    console.log('✅ User details:', {
      email: userDetails.email,
      name: userDetails.full_name,
      role: userDetails.role
    });

    // 3. Check admin access
    if (userDetails.role !== 'admin') {
      console.log('❌ ACCESS DENIED: Your role is "' + userDetails.role + '" but you need "admin" role');
      console.log('📍 Action: Contact your administrator to upgrade your role to admin');
      return;
    }

    console.log('✅ Admin role confirmed');

    // 4. Test time_logs table access
    console.log('\n3. Testing time_logs table access...');
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select('id, user_id, start_time, end_time')
      .limit(5);

    if (timeLogsError) {
      console.error('❌ Time logs access error:', timeLogsError.message);
      return;
    }

    console.log('✅ Time logs accessible. Found', timeLogs?.length || 0, 'records');

    // 5. Test users table access
    console.log('\n4. Testing users table access...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .limit(5);

    if (usersError) {
      console.error('❌ Users table access error:', usersError.message);
      return;
    }

    console.log('✅ Users table accessible. Found', users?.length || 0, 'users');

    // 6. Test projects table access
    console.log('\n5. Testing projects table access...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);

    if (projectsError) {
      console.error('❌ Projects table access error:', projectsError.message);
      return;
    }

    console.log('✅ Projects table accessible. Found', projects?.length || 0, 'projects');

    console.log('\n🎉 ALL CHECKS PASSED!');
    console.log('📍 The time reports page should be accessible at: http://localhost:8080/reports/time-reports');
    console.log('📍 If it still doesn\'t work, check the browser console for JavaScript errors');

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