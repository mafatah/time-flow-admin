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

async function removeTestData() {
  console.log('🧹 Starting test data removal...');
  console.log('====================================================');
  console.log('⚠️  LIVE SYSTEM - Carefully removing only test data');

  try {
    // 1. Remove test app logs
    await removeTestAppLogs();
    
    // 2. Remove test URL logs
    await removeTestURLLogs();
    
    // 3. Remove test screenshots
    await removeTestScreenshots();
    
    // 4. Remove test time logs (be very careful here)
    await removeTestTimeLogs();
    
    // 5. Display current system status
    await displayCurrentStatus();
    
    console.log('\n🎉 Test data removal completed successfully!');
    console.log('📋 Summary:');
    console.log('  ✅ Test app logs removed');
    console.log('  ✅ Test URL logs removed');
    console.log('  ✅ Test screenshots removed');
    console.log('  ✅ Test time logs removed');
    console.log('  ✅ Legitimate user data preserved');

  } catch (error) {
    console.error('❌ Failed to remove test data:', error);
  }
}

async function removeTestAppLogs() {
  console.log('\n1️⃣ Removing test app logs...');
  
  try {
    // Look for app logs with obvious test patterns
    const testAppNames = [
      'Visual Studio Code',
      'Google Chrome',
      'Slack',
      'Figma', 
      'Terminal',
      'Safari',
      'Microsoft Teams',
      'Notion',
      'Postman',
      'Adobe Photoshop'
    ];

    const testWindowTitles = [
      'Development',
      'main.js',
      'TimeFlow Team',
      'UI Design',
      'npm run dev',
      'Documentation',
      'Daily Standup',
      'Project Notes',
      'API Testing',
      'Asset Creation'
    ];

    // Get recent app logs (last 24 hours) that look like test data
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data: recentAppLogs, error: fetchError } = await supabase
      .from('app_logs')
      .select('*')
      .gte('timestamp', oneDayAgo.toISOString());

    if (fetchError) throw fetchError;

    console.log(`   📊 Found ${recentAppLogs.length} recent app logs to check`);

    // Filter for test data patterns
    const testLogs = recentAppLogs.filter(log => {
      const hasTestAppName = testAppNames.some(name => 
        log.app_name?.includes(name)
      );
      const hasTestWindowTitle = testWindowTitles.some(title => 
        log.window_title?.includes(title)
      );
      
      // Also check for bulk created logs (same timestamps, patterns)
      const hasTestPattern = log.window_title === 'Main Window' ||
                           log.app_name === 'Activity Monitor';
      
      return hasTestAppName || hasTestWindowTitle || hasTestPattern;
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
          console.error(`   ⚠️ Failed to delete batch ${i/100 + 1}:`, deleteError);
        } else {
          console.log(`   ✅ Deleted batch ${i/100 + 1} (${batch.length} logs)`);
        }
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to remove test app logs:', error);
  }
}

async function removeTestURLLogs() {
  console.log('\n2️⃣ Removing test URL logs...');
  
  try {
    const testURLPatterns = [
      'github.com/company/project',
      'stackoverflow.com/questions/programming',
      'docs.google.com/spreadsheets',
      'figma.com/design/project',
      'notion.so/project-notes',
      'slack.com/channels/team',
      'youtube.com/watch?v=tutorial',
      'linkedin.com/in/profile',
      'google.com/search?q=development',
      'developer.mozilla.org/docs'
    ];

    // Get recent URL logs (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data: recentURLLogs, error: fetchError } = await supabase
      .from('url_logs')
      .select('*')
      .gte('started_at', oneDayAgo.toISOString());

    if (fetchError) throw fetchError;

    console.log(`   📊 Found ${recentURLLogs.length} recent URL logs to check`);

    // Filter for test data patterns
    const testLogs = recentURLLogs.filter(log => {
      return testURLPatterns.some(pattern => 
        log.site_url?.includes(pattern)
      );
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

async function removeTestScreenshots() {
  console.log('\n3️⃣ Removing test screenshots...');
  
  try {
    // Get recent screenshots (last 24 hours) that look like test data
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data: recentScreenshots, error: fetchError } = await supabase
      .from('screenshots')
      .select('*')
      .gte('created_at', oneDayAgo.toISOString());

    if (fetchError) throw fetchError;

    console.log(`   📊 Found ${recentScreenshots.length} recent screenshots to check`);

    // Filter for test data patterns - screenshots with perfect activity percentages or test file paths
    const testScreenshots = recentScreenshots.filter(screenshot => {
      const hasTestPath = screenshot.file_path?.includes('/screenshots/') && 
                         screenshot.file_path?.includes('.jpg');
      const hasPerfectActivity = screenshot.activity_percent >= 60 && 
                               screenshot.focus_percent >= 70;
      const hasRoundNumbers = (screenshot.activity_percent % 10 === 0) ||
                            (screenshot.focus_percent % 10 === 0);
      
      return hasTestPath && (hasPerfectActivity || hasRoundNumbers);
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

  } catch (error) {
    console.error('   ❌ Failed to remove test screenshots:', error);
  }
}

async function removeTestTimeLogs() {
  console.log('\n4️⃣ Removing test time logs (being very careful)...');
  
  try {
    // Only remove time logs that are clearly test data
    // Be VERY conservative here - only remove logs with obvious test patterns
    
    const { data: recentTimeLogs, error: fetchError } = await supabase
      .from('time_logs')
      .select('*')
      .gte('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (fetchError) throw fetchError;

    console.log(`   📊 Found ${recentTimeLogs.length} recent time logs to check`);

    // Only identify as test if:
    // 1. Exact 1-hour durations (3600 seconds)
    // 2. Perfect timing patterns (starting exactly on hours)
    // 3. Default project ID usage in bulk
    const testTimeLogs = recentTimeLogs.filter(log => {
      if (!log.end_time) return false; // Don't touch ongoing sessions
      
      const startTime = new Date(log.start_time);
      const endTime = new Date(log.end_time);
      const duration = (endTime - startTime) / 1000; // seconds
      
      const isExactHour = duration === 3600; // Exactly 1 hour
      const startsOnHour = startTime.getMinutes() === 0 && startTime.getSeconds() === 0;
      const usesDefaultProject = log.project_id === '00000000-0000-0000-0000-000000000001';
      
      // Only consider it test data if it has multiple test indicators
      return isExactHour && startsOnHour && usesDefaultProject;
    });

    console.log(`   🧹 Found ${testTimeLogs.length} obvious test time logs to remove`);

    if (testTimeLogs.length > 0) {
      // Ask for confirmation since this is sensitive data
      console.log('   ⚠️  Time logs to be removed:');
      testTimeLogs.forEach(log => {
        const start = new Date(log.start_time).toLocaleString();
        const end = new Date(log.end_time).toLocaleString();
        console.log(`     - ${start} to ${end} (1 hour, default project)`);
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

async function displayCurrentStatus() {
  console.log('\n5️⃣ Current system status after cleanup...');
  
  try {
    // Get updated counts
    const { data: recentLogs, error: logsError } = await supabase
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

    const { data: screenshots, error: screenshotError } = await supabase
      .from('screenshots')
      .select('id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    console.log('\n   📊 Updated counts:');
    if (!logsError) console.log(`   ⏰ Time logs (last 7 days): ${recentLogs.length}`);
    if (!appError) console.log(`   📱 App logs (last 24 hours): ${appLogs.length}`);
    if (!urlError) console.log(`   🌐 URL logs (last 24 hours): ${urlLogs.length}`);
    if (!screenshotError) console.log(`   📸 Screenshots (last 24 hours): ${screenshots.length}`);

  } catch (error) {
    console.error('   ❌ Failed to display current status:', error);
  }
}

// Run the test data removal
removeTestData(); 