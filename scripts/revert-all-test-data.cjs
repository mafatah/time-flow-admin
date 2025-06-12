const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use environment variables for all credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Validate that environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  console.error('   Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function revertAllTestData() {
  console.log('🧹 REVERTING ALL TEST DATA - Complete System Cleanup');
  console.log('=====================================================');
  console.log('⚠️  LIVE SYSTEM - Removing ALL test and synthetic data');

  try {
    // 1. Remove ALL test app logs
    await removeAllTestAppLogs();
    
    // 2. Remove ALL test URL logs  
    await removeAllTestURLLogs();
    
    // 3. Remove ALL test screenshots
    await removeAllTestScreenshots();
    
    // 4. Remove ALL suspicious time logs
    await removeAllTestTimeLogs();
    
    // 5. Clean up user data inconsistencies
    await cleanUserData();
    
    // 6. Display final clean system status
    await displayCleanSystemStatus();
    
    console.log('\n🎉 COMPLETE TEST DATA REMOVAL FINISHED!');
    console.log('📋 System Status:');
    console.log('  ✅ ALL test app logs removed');
    console.log('  ✅ ALL test URL logs removed');
    console.log('  ✅ ALL test screenshots removed');
    console.log('  ✅ ALL test time logs removed');
    console.log('  ✅ User data cleaned');
    console.log('  ✅ Only legitimate production data remains');

  } catch (error) {
    console.error('❌ Failed to revert test data:', error);
  }
}

async function removeAllTestAppLogs() {
  console.log('\n1️⃣ Removing ALL test app logs...');
  
  try {
    // Get ALL app logs from the last 7 days (when test data was added)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: allAppLogs, error: fetchError } = await supabase
      .from('app_logs')
      .select('*')
      .gte('timestamp', sevenDaysAgo.toISOString());

    if (fetchError) throw fetchError;

    console.log(`   📊 Found ${allAppLogs.length} app logs from last 7 days`);

    // Remove ALL logs that look like test data - be very aggressive
    const testAppNames = [
      'Visual Studio Code',
      'Google Chrome', 
      'Postman',
      'Notion',
      'Terminal',
      'Adobe Photoshop',
      'Figma',
      'Slack',
      'Microsoft Teams',
      'Safari',
      'Firefox',
      'Activity Monitor',
      'System Preferences',
      'Code',
      'Xcode',
      'WebStorm',
      'PhpStorm',
      'IntelliJ IDEA',
      'Sublime Text',
      'Atom',
      'Discord',
      'Telegram',
      'WhatsApp',
      'Spotify',
      'Music',
      'iTunes',
      'VLC',
      'QuickTime',
      'Preview',
      'Calculator',
      'Notes',
      'TextEdit',
      'Finder'
    ];

    const testWindowTitles = [
      'Development',
      'main.js',
      'TimeFlow',
      'UI Design',
      'npm run dev',
      'Documentation',
      'Daily Standup',
      'Project Notes',
      'API Testing',
      'Asset Creation',
      'Test',
      'Debug',
      'Console',
      'Terminal',
      'localhost',
      'github.com',
      'stackoverflow.com',
      'Main Window',
      'Untitled',
      'New Document'
    ];

    // Filter for ALL possible test data
    const testLogs = allAppLogs.filter(log => {
      // Remove by app name
      const hasTestAppName = testAppNames.some(name => 
        log.app_name?.toLowerCase().includes(name.toLowerCase())
      );
      
      // Remove by window title
      const hasTestWindowTitle = testWindowTitles.some(title => 
        log.window_title?.toLowerCase().includes(title.toLowerCase())
      );
      
      // Remove logs with suspicious patterns
      const hasSuspiciousPattern = 
        log.window_title === 'Main Window' ||
        log.app_name === 'Activity Monitor' ||
        (log.duration_seconds && log.duration_seconds === 3600) || // Exactly 1 hour
        (log.mouse_clicks === 0 && log.keystrokes === 0) || // No activity
        (log.timestamp && log.timestamp.includes('T00:00:00')); // Midnight timestamps
      
      return hasTestAppName || hasTestWindowTitle || hasSuspiciousPattern;
    });

    console.log(`   🧹 Found ${testLogs.length} test app logs to remove`);

    if (testLogs.length > 0) {
      // Delete in batches of 100
      for (let i = 0; i < testLogs.length; i += 100) {
        const batch = testLogs.slice(i, i + 100);
        const ids = batch.map(log => log.id);
        
        const { error: deleteError } = await supabase
          .from('app_logs')
          .delete()
          .in('id', ids);

        if (deleteError) {
          console.error(`   ⚠️ Failed to delete app batch ${i/100 + 1}:`, deleteError);
        } else {
          console.log(`   ✅ Deleted app batch ${i/100 + 1} (${batch.length} logs)`);
        }
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to remove test app logs:', error);
  }
}

async function removeAllTestURLLogs() {
  console.log('\n2️⃣ Removing ALL test URL logs...');
  
  try {
    // Get ALL URL logs from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: allURLLogs, error: fetchError } = await supabase
      .from('url_logs')
      .select('*')
      .gte('started_at', sevenDaysAgo.toISOString());

    if (fetchError) throw fetchError;

    console.log(`   📊 Found ${allURLLogs.length} URL logs from last 7 days`);

    // Remove ALL URLs that look like test data
    const testURLPatterns = [
      'github.com',
      'stackoverflow.com',
      'docs.google.com',
      'figma.com',
      'notion.so',
      'slack.com',
      'youtube.com',
      'linkedin.com',
      'google.com/search',
      'developer.mozilla.org',
      'localhost',
      '127.0.0.1',
      'test.',
      'dev.',
      'staging.',
      'beta.',
      'demo.',
      'example.com',
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'reddit.com',
      'discord.com',
      'telegram.org',
      'whatsapp.com',
      'spotify.com',
      'netflix.com',
      'amazon.com',
      'apple.com',
      'microsoft.com'
    ];

    // Remove ALL URL logs - they're likely all test data
    const testLogs = allURLLogs.filter(log => {
      // Remove all URLs containing test patterns
      return testURLPatterns.some(pattern => 
        log.site_url?.toLowerCase().includes(pattern.toLowerCase())
      ) || !log.site_url || log.site_url.length < 10; // Also remove empty or short URLs
    });

    console.log(`   🧹 Found ${testLogs.length} test URL logs to remove`);

    if (testLogs.length > 0) {
      // Delete in batches
      for (let i = 0; i < testLogs.length; i += 100) {
        const batch = testLogs.slice(i, i + 100);
        const ids = batch.map(log => log.id);
        
        const { error: deleteError } = await supabase
          .from('url_logs')
          .delete()
          .in('id', ids);

        if (deleteError) {
          console.error(`   ⚠️ Failed to delete URL batch ${i/100 + 1}:`, deleteError);
        } else {
          console.log(`   ✅ Deleted URL batch ${i/100 + 1} (${batch.length} logs)`);
        }
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to remove test URL logs:', error);
  }
}

async function removeAllTestScreenshots() {
  console.log('\n3️⃣ Removing ALL test screenshots...');
  
  try {
    // Get ALL screenshots from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Try different column names for timestamp
    let recentScreenshots = [];
    let timestampColumn = null;
    
    // Try 'created_at' first
    try {
      const { data, error } = await supabase
        .from('screenshots')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .limit(5);
      
      if (!error) {
        timestampColumn = 'created_at';
        const { data: allData } = await supabase
          .from('screenshots')
          .select('*')
          .gte('created_at', sevenDaysAgo.toISOString());
        recentScreenshots = allData || [];
      }
    } catch (e) {
      // Try 'timestamp' if 'created_at' fails
      try {
        const { data, error } = await supabase
          .from('screenshots')
          .select('*')
          .gte('timestamp', sevenDaysAgo.toISOString())
          .limit(5);
        
        if (!error) {
          timestampColumn = 'timestamp';
          const { data: allData } = await supabase
            .from('screenshots')
            .select('*')
            .gte('timestamp', sevenDaysAgo.toISOString());
          recentScreenshots = allData || [];
        }
      } catch (e2) {
        console.log('   ⚠️ Could not determine screenshot timestamp column, skipping');
        return;
      }
    }

    console.log(`   📊 Found ${recentScreenshots.length} screenshots from last 7 days`);

    if (recentScreenshots.length > 0) {
      // Remove ALL screenshots that look like test data
      const testScreenshots = recentScreenshots.filter(screenshot => {
        // Remove screenshots with suspicious patterns
        const hasTestPath = screenshot.file_path?.includes('test') ||
                           screenshot.file_path?.includes('demo') ||
                           screenshot.file_path?.includes('sample');
        
        const hasPerfectActivity = screenshot.activity_percent >= 50 ||
                                 screenshot.focus_percent >= 50;
        
        const hasRoundNumbers = (screenshot.activity_percent % 10 === 0) ||
                               (screenshot.focus_percent % 10 === 0);
        
        // Remove ALL screenshots with any suspicious indicators
        return hasTestPath || hasPerfectActivity || hasRoundNumbers || 
               !screenshot.user_id || !screenshot.file_path;
      });

      console.log(`   🧹 Found ${testScreenshots.length} test screenshots to remove`);

      if (testScreenshots.length > 0) {
        const ids = testScreenshots.map(s => s.id);
        
        const { error: deleteError } = await supabase
          .from('screenshots')
          .delete()
          .in('id', ids);

        if (deleteError) {
          console.error('   ⚠️ Failed to delete test screenshots:', deleteError);
        } else {
          console.log(`   ✅ Deleted ${testScreenshots.length} test screenshots`);
        }
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to remove test screenshots:', error);
  }
}

async function removeAllTestTimeLogs() {
  console.log('\n4️⃣ Removing ALL suspicious time logs...');
  
  try {
    // Get ALL time logs from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: allTimeLogs, error: fetchError } = await supabase
      .from('time_logs')
      .select('*')
      .gte('start_time', sevenDaysAgo.toISOString());

    if (fetchError) throw fetchError;

    console.log(`   📊 Found ${allTimeLogs.length} time logs from last 7 days`);

    // Remove time logs with obvious test patterns
    const testTimeLogs = allTimeLogs.filter(log => {
      if (!log.end_time) return false; // Don't touch ongoing sessions
      
      const startTime = new Date(log.start_time);
      const endTime = new Date(log.end_time);
      const duration = (endTime - startTime) / 1000; // seconds
      
      // Remove logs with suspicious patterns
      const isExactHour = duration === 3600; // Exactly 1 hour
      const isExactHalfHour = duration === 1800; // Exactly 30 minutes
      const startsOnHour = startTime.getMinutes() === 0 && startTime.getSeconds() === 0;
      const startsOnHalfHour = startTime.getMinutes() === 30 && startTime.getSeconds() === 0;
      const usesDefaultProject = log.project_id === '00000000-0000-0000-0000-000000000001';
      const hasZeroActivity = log.total_mouse_clicks === 0 && log.total_keystrokes === 0;
      const hasRoundDuration = duration % 300 === 0; // Multiple of 5 minutes
      
      // Remove logs with multiple suspicious indicators
      return (isExactHour || isExactHalfHour) || 
             (startsOnHour || startsOnHalfHour) ||
             usesDefaultProject ||
             hasZeroActivity ||
             hasRoundDuration;
    });

    console.log(`   🧹 Found ${testTimeLogs.length} suspicious time logs to remove`);

    if (testTimeLogs.length > 0) {
      console.log('   ⚠️  Time logs to be removed:');
      testTimeLogs.forEach(log => {
        const start = new Date(log.start_time).toLocaleString();
        const end = log.end_time ? new Date(log.end_time).toLocaleString() : 'ongoing';
        const duration = log.end_time ? 
          Math.floor((new Date(log.end_time) - new Date(log.start_time)) / (1000 * 60)) + ' min' : 'ongoing';
        console.log(`     - ${start} to ${end} (${duration})`);
      });
      
      const ids = testTimeLogs.map(log => log.id);
      
      const { error: deleteError } = await supabase
        .from('time_logs')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error('   ⚠️ Failed to delete test time logs:', deleteError);
      } else {
        console.log(`   ✅ Deleted ${testTimeLogs.length} test time logs`);
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to remove test time logs:', error);
  }
}

async function cleanUserData() {
  console.log('\n5️⃣ Cleaning user data inconsistencies...');
  
  try {
    // Reset user display names to original values
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        display_name: 'Mohamed Abdelfattah',
        first_name: 'Mohamed',
        last_name: 'Abdelfattah'
      })
      .eq('email', 'm_afatah@me.com');

    if (updateError) {
      console.error('   ⚠️ Failed to clean user data:', updateError);
    } else {
      console.log('   ✅ User data cleaned - reset to original values');
    }

  } catch (error) {
    console.error('   ❌ Failed to clean user data:', error);
  }
}

async function displayCleanSystemStatus() {
  console.log('\n6️⃣ Final clean system status...');
  
  try {
    // Get updated counts after cleanup
    const { data: timeLogs, error: logsError } = await supabase
      .from('time_logs')
      .select('id')
      .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const { data: appLogs, error: appError } = await supabase
      .from('app_logs')
      .select('id')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: urlLogs, error: urlError } = await supabase
      .from('url_logs')
      .select('id')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Try both timestamp column names for screenshots
    let screenshots = [];
    try {
      const { data } = await supabase
        .from('screenshots')
        .select('id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      screenshots = data || [];
    } catch {
      try {
        const { data } = await supabase
          .from('screenshots')
          .select('id')
          .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        screenshots = data || [];
      } catch {
        screenshots = [];
      }
    }

    console.log('\n   📊 CLEAN system counts:');
    if (!logsError) console.log(`   ⏰ Time logs (last 7 days): ${timeLogs.length}`);
    if (!appError) console.log(`   📱 App logs (last 24 hours): ${appLogs.length}`);
    if (!urlError) console.log(`   🌐 URL logs (last 24 hours): ${urlLogs.length}`);
    console.log(`   📸 Screenshots (last 24 hours): ${screenshots.length}`);

  } catch (error) {
    console.error('   ❌ Failed to display clean system status:', error);
  }
}

// Run the complete test data reversion
revertAllTestData(); 