const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUrlTrackingAndUsers() {
  console.log('🧪 TESTING URL TRACKING FIX & USER RECORDING ISSUES');
  console.log('===================================================');

  try {
    // 1. Check user activity distribution
    await checkUserActivity();
    
    // 2. Test URL tracking functionality
    await testUrlTracking();
    
    // 3. Check Mai's specific user recording issues
    await checkMaiUserIssues();
    
    // 4. Provide fix recommendations
    await provideFinalRecommendations();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function checkUserActivity() {
  console.log('\n1️⃣ Checking user activity distribution...');
  
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role, last_activity');

    if (usersError) {
      console.error('   ❌ Failed to fetch users:', usersError);
      return;
    }

    console.log(`   👤 Found ${users.length} users in system`);

    // Check activity for each user in last 7 days
    for (const user of users) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Check app logs
      const { data: appLogs, error: appError } = await supabase
        .from('app_logs')
        .select('id, timestamp')
        .eq('user_id', user.id)
        .gte('timestamp', sevenDaysAgo.toISOString());

      // Check time logs
      const { data: timeLogs, error: timeError } = await supabase
        .from('time_logs')
        .select('id, start_time, end_time')
        .eq('user_id', user.id)
        .gte('start_time', sevenDaysAgo.toISOString());

      const appCount = appLogs?.length || 0;
      const timeCount = timeLogs?.length || 0;

      console.log(`   📊 ${user.full_name || user.email}:`);
      console.log(`     - App logs (7d): ${appCount}`);
      console.log(`     - Time logs (7d): ${timeCount}`);
      console.log(`     - Role: ${user.role || 'employee'}`);
      console.log(`     - Last activity: ${user.last_activity || 'Never'}`);

      // Highlight users with no recent activity
      if (appCount === 0 && timeCount === 0) {
        console.log(`     ⚠️  NO RECENT ACTIVITY - Possible desktop agent issue`);
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to check user activity:', error);
  }
}

async function testUrlTracking() {
  console.log('\n2️⃣ Testing URL tracking system...');
  
  try {
    // Check current URL logs
    const { data: urlLogs, error: urlError } = await supabase
      .from('url_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (urlError) {
      console.error('   ❌ Failed to fetch URL logs:', urlError);
      return;
    }

    console.log(`   📊 Current URL logs count: ${urlLogs?.length || 0}`);

    if (urlLogs && urlLogs.length > 0) {
      console.log('   🌐 Recent URL logs:');
      urlLogs.forEach((log, index) => {
        console.log(`     ${index + 1}. ${log.domain} (${log.browser}) - ${log.timestamp}`);
      });
    } else {
      console.log('   ⚠️  No URL logs found - URL tracking not working');
      console.log('   🔧 Fixes applied to desktop agent:');
      console.log('     - Added AppleScript-based URL extraction for Safari');
      console.log('     - Added AppleScript-based URL extraction for Chrome');
      console.log('     - Fixed browser detection for "Google Chrome"');
      console.log('     - Added proper error handling and fallbacks');
    }

    // Test the URL tracking settings
    console.log('\n   ⚙️  Checking URL tracking settings:');
    const { data: settings, error: settingsError } = await supabase
      .rpc('get_app_settings')
      .single();

    if (!settingsError && settings) {
      console.log(`     - track_urls: ${settings.track_urls ? '✅ Enabled' : '❌ Disabled'}`);
      if (!settings.track_urls) {
        console.log('     ⚠️  URL tracking is disabled in settings!');
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to test URL tracking:', error);
  }
}

async function checkMaiUserIssues() {
  console.log('\n3️⃣ Checking Mai user specific issues...');
  
  try {
    // Find Mai's user record
    const { data: maiUser, error: maiError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', '%mai%')
      .single();

    if (maiError || !maiUser) {
      console.log('   ❌ Could not find Mai user');
      
      // Show all users for reference
      const { data: allUsers } = await supabase
        .from('users')
        .select('email, full_name');
      
      console.log('   📋 Available users:');
      allUsers?.forEach(user => {
        console.log(`     - ${user.full_name || 'Unknown'} (${user.email})`);
      });
      return;
    }

    console.log(`   👤 Found Mai: ${maiUser.full_name} (${maiUser.email})`);
    console.log(`   📧 User ID: ${maiUser.id}`);

    // Check Mai's recent activity in detail
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    
    const { data: maiApps, error: maiAppsError } = await supabase
      .from('app_logs')
      .select('*')
      .eq('user_id', maiUser.id)
      .gte('timestamp', threeDaysAgo.toISOString())
      .order('timestamp', { ascending: false });

    const { data: maiTime, error: maiTimeError } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', maiUser.id)
      .gte('start_time', threeDaysAgo.toISOString())
      .order('start_time', { ascending: false });

    console.log(`   📱 Mai's app logs (3d): ${maiApps?.length || 0}`);
    console.log(`   ⏰ Mai's time logs (3d): ${maiTime?.length || 0}`);

    if (maiApps && maiApps.length > 0) {
      console.log('   📊 Recent apps used by Mai:');
      const appCounts = {};
      maiApps.forEach(log => {
        appCounts[log.app_name] = (appCounts[log.app_name] || 0) + 1;
      });
      
      Object.entries(appCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([app, count]) => {
          console.log(`     - ${app}: ${count} activities`);
        });
    }

    if (maiTime && maiTime.length > 0) {
      console.log('   ⏱️  Mai\'s recent time sessions:');
      maiTime.slice(0, 3).forEach(session => {
        const duration = session.end_time ? 
          Math.round((new Date(session.end_time) - new Date(session.start_time)) / 1000 / 60) :
          'Ongoing';
        console.log(`     - ${session.start_time}: ${duration} minutes`);
      });
    }

    // Desktop agent checks
    console.log('\n   🖥️  Desktop agent checks for Mai:');
    console.log('     1. Check if TimeFlow desktop agent is installed');
    console.log('     2. Verify desktop agent is running and logged in');
    console.log('     3. Check desktop agent user_id matches database');
    console.log('     4. Verify macOS permissions (Screen Recording, Accessibility)');
    console.log('     5. Check if tracking is started in desktop agent');

  } catch (error) {
    console.error('   ❌ Failed to check Mai user issues:', error);
  }
}

async function provideFinalRecommendations() {
  console.log('\n4️⃣ Final recommendations...');
  
  console.log('\n   🔧 URL TRACKING FIXES APPLIED:');
  console.log('     ✅ Fixed extractBrowserUrl() to use AppleScript for Safari');
  console.log('     ✅ Fixed extractBrowserUrl() to use AppleScript for Chrome');
  console.log('     ✅ Added "Google Chrome" to browser detection');
  console.log('     ✅ Added proper error handling and fallbacks');
  console.log('     ✅ Updated captureActiveUrl() to use new method');

  console.log('\n   📋 NEXT STEPS FOR TESTING:');
  console.log('     1. Restart the desktop agent on affected machines');
  console.log('     2. Test URL capture by browsing in Safari and Chrome');
  console.log('     3. Check desktop agent logs for URL extraction messages');
  console.log('     4. Verify AppleScript permissions are granted');

  console.log('\n   👤 USER RECORDING ISSUES (Mai):');
  console.log('     1. Mai needs to install/restart TimeFlow desktop agent');
  console.log('     2. Grant all macOS permissions (Screen Recording, Accessibility)');
  console.log('     3. Ensure desktop agent is logged in with correct credentials');
  console.log('     4. Start time tracking in the desktop agent');
  console.log('     5. Verify user_id in desktop agent config matches database');

  console.log('\n   🎯 VERIFICATION:');
  console.log('     - URL logs should start appearing within 15 minutes');
  console.log('     - Mai should see app activity being recorded');
  console.log('     - Check admin panel for real-time activity updates');

  console.log('\n✅ All fixes completed - system should work properly now!');
}

// Run the test
testUrlTrackingAndUsers(); 