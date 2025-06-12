const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseSystemIssues() {
  console.log('🔍 DIAGNOSING SYSTEM ISSUES');
  console.log('============================');

  try {
    // 1. Check database structure
    await checkDatabaseStructure();
    
    // 2. Check current data state
    await checkCurrentDataState();
    
    // 3. Check URL tracking configuration
    await checkURLTrackingIssues();
    
    // 4. Check app activity issues
    await checkAppActivityIssues();
    
    // 5. Check user display issues
    await checkUserDisplayIssues();

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

async function checkDatabaseStructure() {
  console.log('\n1️⃣ Checking database structure...');
  
  try {
    // Check url_logs table structure
    const { data: urlLogs, error: urlError } = await supabase
      .from('url_logs')
      .select('*')
      .limit(1);
    
    if (urlError) {
      console.log('   ❌ URL logs table issue:', urlError.message);
    } else {
      console.log('   ✅ URL logs table accessible');
      if (urlLogs.length > 0) {
        console.log('   📝 URL logs columns:', Object.keys(urlLogs[0]));
      }
    }

    // Check app_logs table structure  
    const { data: appLogs, error: appError } = await supabase
      .from('app_logs')
      .select('*')
      .limit(1);
    
    if (appError) {
      console.log('   ❌ App logs table issue:', appError.message);
    } else {
      console.log('   ✅ App logs table accessible');
      if (appLogs.length > 0) {
        console.log('   📝 App logs columns:', Object.keys(appLogs[0]));
      }
    }

    // Check users table structure
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('   ❌ Users table issue:', usersError.message);
    } else {
      console.log('   ✅ Users table accessible');
      if (users.length > 0) {
        console.log('   📝 Users columns:', Object.keys(users[0]));
      }
    }

  } catch (error) {
    console.error('   ❌ Database structure check failed:', error);
  }
}

async function checkCurrentDataState() {
  console.log('\n2️⃣ Checking current data state...');
  
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Check recent app logs
    const { data: recentAppLogs, error: appError } = await supabase
      .from('app_logs')
      .select('*')
      .gte('timestamp', yesterday.toISOString())
      .order('timestamp', { ascending: false })
      .limit(10);

    if (!appError && recentAppLogs) {
      console.log(`   📱 Recent app logs (${recentAppLogs.length}):`);
      recentAppLogs.slice(0, 5).forEach(log => {
        console.log(`     - ${log.app_name}: ${log.window_title} (${new Date(log.timestamp).toLocaleString()})`);
      });
    }

    // Check recent URL logs
    const { data: recentURLLogs, error: urlError } = await supabase
      .from('url_logs')
      .select('*')
      .gte('started_at', yesterday.toISOString())
      .order('started_at', { ascending: false })
      .limit(10);

    if (!urlError && recentURLLogs) {
      console.log(`   🌐 Recent URL logs (${recentURLLogs.length}):`);
      recentURLLogs.slice(0, 5).forEach(log => {
        console.log(`     - ${log.site_url} (${new Date(log.started_at).toLocaleString()})`);
      });
    } else {
      console.log('   🌐 No recent URL logs found');
    }

    // Check ongoing sessions
    const { data: activeSessions, error: sessionError } = await supabase
      .from('time_logs')
      .select('*')
      .is('end_time', null)
      .order('start_time', { ascending: false });

    if (!sessionError && activeSessions) {
      console.log(`   ⏰ Active sessions (${activeSessions.length}):`);
      activeSessions.forEach(session => {
        console.log(`     - Started: ${new Date(session.start_time).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('   ❌ Data state check failed:', error);
  }
}

async function checkURLTrackingIssues() {
  console.log('\n3️⃣ Diagnosing URL tracking issues...');
  
  try {
    // Check if URLs are being captured but not saved
    console.log('   🔍 Potential URL tracking issues:');
    
    // Check for browser apps in recent app logs
    const { data: browserApps, error } = await supabase
      .from('app_logs')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .or('app_name.ilike.%chrome%,app_name.ilike.%safari%,app_name.ilike.%firefox%,app_name.ilike.%edge%');

    if (!error && browserApps && browserApps.length > 0) {
      console.log(`   🌐 Found ${browserApps.length} recent browser activities:`);
      browserApps.slice(0, 5).forEach(app => {
        console.log(`     - ${app.app_name}: ${app.window_title}`);
      });
      
      // Check if corresponding URLs exist
      const { data: correspondingURLs, error: urlError } = await supabase
        .from('url_logs')
        .select('*')
        .gte('started_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

      if (!urlError) {
        console.log(`   📊 Corresponding URL logs: ${correspondingURLs?.length || 0}`);
        
        if (!correspondingURLs || correspondingURLs.length === 0) {
          console.log('   ⚠️ ISSUE FOUND: Browser activity detected but no URLs captured');
          console.log('   💡 Possible causes:');
          console.log('     - URL tracking is disabled in settings');
          console.log('     - AppleScript permissions not granted');
          console.log('     - URL extraction logic failing');
          console.log('     - Browser security blocking access');
        }
      }
    } else {
      console.log('   📱 No recent browser activity found');
    }

  } catch (error) {
    console.error('   ❌ URL tracking diagnosis failed:', error);
  }
}

async function checkAppActivityIssues() {
  console.log('\n4️⃣ Diagnosing app activity display issues...');
  
  try {
    // Check if app logs are being duplicated or incorrectly categorized
    const { data: appSummary, error } = await supabase
      .from('app_logs')
      .select('app_name, count(*)')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .group('app_name')
      .order('count', { ascending: false })
      .limit(10);

    if (!error && appSummary) {
      console.log('   📊 Top apps by activity count (last 24h):');
      appSummary.forEach(app => {
        console.log(`     - ${app.app_name}: ${app.count} activities`);
      });
      
      // Check for suspicious high-volume apps
      const highVolumeApps = appSummary.filter(app => app.count > 100);
      if (highVolumeApps.length > 0) {
        console.log('   ⚠️ High-volume apps detected (possible over-tracking):');
        highVolumeApps.forEach(app => {
          console.log(`     - ${app.app_name}: ${app.count} activities (suspicious)`);
        });
      }
    }

  } catch (error) {
    console.error('   ❌ App activity diagnosis failed:', error);
  }
}

async function checkUserDisplayIssues() {
  console.log('\n5️⃣ Diagnosing user display issues...');
  
  try {
    // Check all users and their display information
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('*');

    if (!error && allUsers) {
      console.log('   👤 All users in system:');
      allUsers.forEach(user => {
        console.log(`     - Email: ${user.email}`);
        console.log(`       Name: ${user.first_name} ${user.last_name}`);
        console.log(`       Role: ${user.role}`);
        console.log(`       ID: ${user.id}`);
        console.log('');
      });

      // Check for duplicate or test users
      const emailCounts = {};
      allUsers.forEach(user => {
        emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
      });

      const duplicates = Object.entries(emailCounts).filter(([email, count]) => count > 1);
      if (duplicates.length > 0) {
        console.log('   ⚠️ Duplicate users found:');
        duplicates.forEach(([email, count]) => {
          console.log(`     - ${email}: ${count} entries`);
        });
      }
    }

  } catch (error) {
    console.error('   ❌ User display diagnosis failed:', error);
  }
}

// Run the diagnosis
diagnoseSystemIssues(); 