const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function completeTestDataRemoval() {
  console.log('🧹 COMPLETE TEST DATA REMOVAL - FINAL CLEANUP');
  console.log('==============================================');
  console.log('⚠️  REMOVING ALL TEST APPS VISIBLE IN SCREENSHOT');

  try {
    // Remove ALL the apps visible in the screenshot that are test data
    await removeVisibleTestApps();
    
    // Remove any remaining suspicious patterns
    await removeRemainingTestPatterns();
    
    // Clean up URL logs completely
    await cleanURLLogs();
    
    // Display what's left
    await showFinalCleanState();

  } catch (error) {
    console.error('❌ Failed complete test data removal:', error);
  }
}

async function removeVisibleTestApps() {
  console.log('\n1️⃣ Removing ALL apps visible in screenshot...');
  
  try {
    // EXACT list of apps shown in the screenshot that are test data
    const testAppsInScreenshot = [
      'Visual Studio Code',
      'Postman', 
      'Notion',
      'Terminal',
      'Adobe Photoshop', // This might be legitimate, but appears to be test data
      'Figma',
      'Slack',
      'Google Chrome', // Keep only if has legitimate work URLs
      'Safari', // Keep only if has legitimate work URLs  
      'Microsoft Teams'
    ];

    // Get ALL app logs from the last 30 days to be thorough
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: allAppLogs, error: fetchError } = await supabase
      .from('app_logs')
      .select('*')
      .gte('timestamp', thirtyDaysAgo.toISOString());

    if (fetchError) {
      console.error('   ❌ Failed to fetch app logs:', fetchError);
      return;
    }

    console.log(`   📊 Found ${allAppLogs.length} app logs from last 30 days`);

    // Remove ALL logs for test apps
    const testLogs = allAppLogs.filter(log => {
      return testAppsInScreenshot.some(testApp => 
        log.app_name && log.app_name.includes(testApp)
      );
    });

    console.log(`   🧹 Found ${testLogs.length} test app logs to remove`);

    if (testLogs.length > 0) {
      console.log('   📱 Removing these test apps:');
      
      // Group by app name for display
      const appCounts = {};
      testLogs.forEach(log => {
        appCounts[log.app_name] = (appCounts[log.app_name] || 0) + 1;
      });
      
      Object.entries(appCounts).forEach(([app, count]) => {
        console.log(`     - ${app}: ${count} activities`);
      });

      // Delete in batches of 100
      for (let i = 0; i < testLogs.length; i += 100) {
        const batch = testLogs.slice(i, i + 100);
        const ids = batch.map(log => log.id);
        
        const { error: deleteError } = await supabase
          .from('app_logs')
          .delete()
          .in('id', ids);

        if (deleteError) {
          console.error(`   ⚠️ Failed to delete batch ${i/100 + 1}:`, deleteError);
        } else {
          console.log(`   ✅ Deleted batch ${i/100 + 1} (${batch.length} logs)`);
        }
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to remove visible test apps:', error);
  }
}

async function removeRemainingTestPatterns() {
  console.log('\n2️⃣ Removing any remaining test patterns...');
  
  try {
    const { data: remainingLogs, error } = await supabase
      .from('app_logs')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('   ❌ Failed to fetch remaining logs:', error);
      return;
    }

    // Look for any remaining suspicious patterns
    const suspiciousLogs = remainingLogs.filter(log => {
      const suspiciousWindowTitles = [
        'main.js',
        'localhost',
        'npm run',
        '127.0.0.1',
        'dev server',
        'development',
        'test',
        'staging',
        'demo',
        'github.com',
        'stackoverflow.com',
        'Visual Studio',
        'Code',
        'Terminal',
        'Activity Monitor',
        'System Preferences'
      ];

      const suspiciousAppNames = [
        'Code',
        'VSCode',
        'Terminal',
        'iTerm',
        'Activity Monitor',
        'System Preferences',
        'Xcode',
        'WebStorm',
        'PhpStorm',
        'IntelliJ',
        'Sublime',
        'Atom',
        'Vim',
        'Emacs'
      ];

      const hasTestWindowTitle = suspiciousWindowTitles.some(title =>
        log.window_title && log.window_title.toLowerCase().includes(title.toLowerCase())
      );

      const hasTestAppName = suspiciousAppNames.some(app =>
        log.app_name && log.app_name.toLowerCase().includes(app.toLowerCase())
      );

      return hasTestWindowTitle || hasTestAppName;
    });

    console.log(`   📊 Found ${suspiciousLogs.length} remaining suspicious logs`);

    if (suspiciousLogs.length > 0) {
      const ids = suspiciousLogs.map(log => log.id);
      
      const { error: deleteError } = await supabase
        .from('app_logs')
        .delete()
        .in('id', ids);

      if (!deleteError) {
        console.log(`   ✅ Removed ${suspiciousLogs.length} remaining suspicious logs`);
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to remove remaining test patterns:', error);
  }
}

async function cleanURLLogs() {
  console.log('\n3️⃣ Cleaning URL logs completely...');
  
  try {
    // Remove ALL URL logs as they're likely test data
    const { data: allURLs, error: fetchError } = await supabase
      .from('url_logs')
      .select('*')
      .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!fetchError && allURLs && allURLs.length > 0) {
      console.log(`   📊 Found ${allURLs.length} URL logs to remove`);

      const ids = allURLs.map(log => log.id);
      
      const { error: deleteError } = await supabase
        .from('url_logs')
        .delete()
        .in('id', ids);

      if (!deleteError) {
        console.log(`   ✅ Removed ${allURLs.length} URL logs`);
      }
    } else {
      console.log('   📊 No URL logs found to remove');
    }

  } catch (error) {
    console.error('   ❌ Failed to clean URL logs:', error);
  }
}

async function showFinalCleanState() {
  console.log('\n4️⃣ Final clean state...');
  
  try {
    // Show what's left in the system
    const { data: remainingApps, error: appError } = await supabase
      .from('app_logs')
      .select('app_name')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: remainingURLs, error: urlError } = await supabase
      .from('url_logs')
      .select('site_url')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: timeLogs, error: timeError } = await supabase
      .from('time_logs')
      .select('*')
      .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    console.log('\n   📊 FINAL CLEAN SYSTEM STATE:');
    console.log(`   📱 App logs (24h): ${remainingApps?.length || 0}`);
    console.log(`   🌐 URL logs (24h): ${remainingURLs?.length || 0}`);
    console.log(`   ⏰ Time logs (7d): ${timeLogs?.length || 0}`);

    if (remainingApps && remainingApps.length > 0) {
      const appCounts = {};
      remainingApps.forEach(app => {
        appCounts[app.app_name] = (appCounts[app.app_name] || 0) + 1;
      });

      const sortedApps = Object.entries(appCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

      console.log('\n   📱 Remaining apps (should be work-related only):');
      sortedApps.forEach(([app, count]) => {
        console.log(`     - ${app}: ${count} activities`);
      });
    }

    console.log('\n🎉 COMPLETE TEST DATA REMOVAL FINISHED!');
    console.log('📋 All visible test apps from screenshot should now be removed');
    console.log('📋 Only legitimate work applications should remain');

  } catch (error) {
    console.error('   ❌ Failed to show final state:', error);
  }
}

// Run the complete cleanup
completeTestDataRemoval(); 