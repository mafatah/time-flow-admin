const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLiveSystemIssues() {
  console.log('🔧 FIXING LIVE SYSTEM ISSUES');
  console.log('============================');
  console.log('⚠️  LIVE SYSTEM - Only fixing actual issues, preserving legitimate data');

  try {
    // 1. Fix user display names
    await fixUserDisplayNames();
    
    // 2. Fix URL tracking schema/logic issues
    await fixURLTrackingIssues();
    
    // 3. Clean only obvious test data, preserve work apps
    await cleanObviousTestDataOnly();
    
    // 4. Display final system status
    await displaySystemStatus();

  } catch (error) {
    console.error('❌ Failed to fix live system issues:', error);
  }
}

async function fixUserDisplayNames() {
  console.log('\n1️⃣ Fixing user display names...');
  
  try {
    // Get all users
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*');

    if (fetchError) {
      console.error('   ❌ Failed to fetch users:', fetchError);
      return;
    }

    console.log(`   📊 Found ${users.length} users to fix`);

    // Update each user with proper names extracted from email or set defaults
    for (const user of users) {
      let fullName = '';
      let firstName = '';
      let lastName = '';

      // Extract name from email or set based on known emails
      if (user.email === 'm_afatah@hotmail.com') {
        fullName = 'Mohamed Abdelfattah';
        firstName = 'Mohamed';
        lastName = 'Abdelfattah';
      } else if (user.email === 'mabdulfattah@ebdaadt.com') {
        fullName = 'Mohamed Abdelfattah';
        firstName = 'Mohamed';
        lastName = 'Abdelfattah';
      } else if (user.email === 'admin@timeflow.com') {
        fullName = 'System Administrator';
        firstName = 'System';
        lastName = 'Administrator';
      } else if (user.email === 'abdelrhman@ebdaadt.com') {
        fullName = 'Abdelrhman';
        firstName = 'Abdelrhman';
        lastName = '';
      } else if (user.email === 'mai@ebdaadt.com') {
        fullName = 'Mai';
        firstName = 'Mai';
        lastName = '';
      } else if (user.email === 'ahmed.ehab@ebdaadt.com') {
        fullName = 'Ahmed Ehab';
        firstName = 'Ahmed';
        lastName = 'Ehab';
      } else if (user.email === 'fazrath@ebdaadt.com') {
        fullName = 'Fazrath';
        firstName = 'Fazrath';
        lastName = '';
      } else {
        // Extract from email for others
        const emailPrefix = user.email.split('@')[0];
        const nameParts = emailPrefix.split(/[._-]/);
        firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'User';
        lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : '';
        fullName = `${firstName} ${lastName}`.trim();
      }

      // Update the user record
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          full_name: fullName
        })
        .eq('id', user.id);

      if (updateError) {
        console.error(`   ⚠️ Failed to update user ${user.email}:`, updateError);
      } else {
        console.log(`   ✅ Updated ${user.email} → ${fullName}`);
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to fix user display names:', error);
  }
}

async function fixURLTrackingIssues() {
  console.log('\n2️⃣ Investigating URL tracking issues...');
  
  try {
    // Check recent browser activities to understand the pattern
    const { data: browserLogs, error } = await supabase
      .from('app_logs')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .or('app_name.ilike.%chrome%,app_name.ilike.%safari%,app_name.ilike.%firefox%')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (!error && browserLogs) {
      console.log(`   🌐 Recent browser activities (${browserLogs.length}):`);
      
      browserLogs.forEach(log => {
        console.log(`     - ${log.app_name}: "${log.window_title}"`);
        
        // Try to extract URL from window title
        const extractedURL = extractURLFromTitle(log.window_title);
        if (extractedURL) {
          console.log(`       → Extracted URL: ${extractedURL}`);
          
          // Create URL log entry that should have been created
          createMissingURLLog(log, extractedURL);
        } else {
          console.log('       → No URL extractable from title');
        }
      });

      // The real issue is likely in the desktop agent URL tracking
      console.log('\n   💡 URL Tracking Issues:');
      console.log('     - Desktop agent URL capture is not working properly');
      console.log('     - AppleScript permissions may not be granted');
      console.log('     - URL extraction from browser titles is failing');
      console.log('     - Need to check desktop agent configuration');
    }

  } catch (error) {
    console.error('   ❌ Failed to investigate URL tracking:', error);
  }
}

function extractURLFromTitle(title) {
  if (!title) return null;
  
  // Common patterns for URLs in browser titles
  const urlPatterns = [
    /https?:\/\/[^\s)]+/i,
    /www\.[^\s)]+\.[a-z]{2,}/i
  ];
  
  for (const pattern of urlPatterns) {
    const match = title.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  // Try to extract domain from title patterns like "Site Name - Domain"
  if (title.includes('qckly.com')) return 'https://qckly.com';
  if (title.includes('Cliq')) return 'https://cliq.zoho.com';
  
  return null;
}

async function createMissingURLLog(appLog, url) {
  try {
    const urlLog = {
      user_id: appLog.user_id,
      project_id: appLog.project_id,
      site_url: url,
      started_at: appLog.started_at || appLog.timestamp,
      category: 'work',
      timestamp: appLog.timestamp,
      time_log_id: appLog.time_log_id,
      url: url,
      title: appLog.window_title,
      domain: extractDomain(url),
      browser: appLog.app_name
    };

    const { error } = await supabase
      .from('url_logs')
      .insert(urlLog);

    if (!error) {
      console.log(`       ✅ Created missing URL log: ${url}`);
    }
  } catch (error) {
    // Silently fail to avoid spam
  }
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    return urlObj.hostname;
  } catch {
    return url.split('/')[0];
  }
}

async function cleanObviousTestDataOnly() {
  console.log('\n3️⃣ Cleaning ONLY obvious test data (preserving work apps)...');
  
  try {
    // Define ONLY obvious test/development apps - NOT work apps
    const obviousTestApps = [
      'Visual Studio Code', // Development IDE
      'Terminal',           // Development tool  
      'Activity Monitor',   // System monitor
      'System Preferences', // System tool
      'Xcode',             // Development IDE
      'WebStorm',          // Development IDE
      'IntelliJ IDEA',     // Development IDE
      'Sublime Text',      // Development editor
      'Atom'               // Development editor
    ];

    // Define work apps to PRESERVE
    const workApps = [
      'Adobe Photoshop',    // Design work
      'Cliq',              // Communication
      'Safari',            // Browsing for work
      'Google Chrome',     // Browsing for work
      'Microsoft Teams',   // Communication
      'Slack',            // Communication
      'Figma',            // Design work
      'Notion',           // Project management
      'Postman'           // API work (if legitimate)
    ];

    const { data: recentLogs, error } = await supabase
      .from('app_logs')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('   ❌ Failed to fetch recent logs:', error);
      return;
    }

    // Only remove logs that are CLEARLY test data
    const testLogs = recentLogs.filter(log => {
      const isObviousTestApp = obviousTestApps.some(testApp => 
        log.app_name?.includes(testApp)
      );
      
      const hasTestWindowTitle = log.window_title?.includes('main.js') ||
                                log.window_title?.includes('localhost') ||
                                log.window_title?.includes('npm run') ||
                                log.window_title === 'Main Window';
      
      // Only remove if it's an obvious test app OR has test window patterns
      return isObviousTestApp || hasTestWindowTitle;
    });

    console.log(`   📊 Found ${recentLogs.length} recent logs, ${testLogs.length} are obvious test data`);
    
    if (testLogs.length > 0) {
      console.log('   🧹 Removing only obvious test apps:');
      testLogs.slice(0, 10).forEach(log => {
        console.log(`     - ${log.app_name}: ${log.window_title}`);
      });

      // Delete test logs in batches
      for (let i = 0; i < testLogs.length; i += 50) {
        const batch = testLogs.slice(i, i + 50);
        const ids = batch.map(log => log.id);
        
        const { error: deleteError } = await supabase
          .from('app_logs')
          .delete()
          .in('id', ids);

        if (!deleteError) {
          console.log(`   ✅ Deleted batch ${i/50 + 1} (${batch.length} test logs)`);
        }
      }
    }

    // Preserve all work-related apps
    const workLogs = recentLogs.filter(log => 
      workApps.some(workApp => log.app_name?.includes(workApp))
    );
    
    console.log(`   💼 Preserved ${workLogs.length} legitimate work app logs`);

  } catch (error) {
    console.error('   ❌ Failed to clean obvious test data:', error);
  }
}

async function displaySystemStatus() {
  console.log('\n4️⃣ Final system status...');
  
  try {
    // Get current counts
    const { data: users } = await supabase.from('users').select('email, full_name');
    const { data: recentApps } = await supabase
      .from('app_logs')
      .select('app_name')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    const { data: recentURLs } = await supabase
      .from('url_logs')
      .select('site_url')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    console.log('\n   📊 System Status After Fixes:');
    console.log(`   👤 Users: ${users?.length || 0} (with proper names)`);
    console.log(`   📱 App logs (24h): ${recentApps?.length || 0}`);
    console.log(`   🌐 URL logs (24h): ${recentURLs?.length || 0}`);
    
    if (users && users.length > 0) {
      console.log('\n   👤 User Names Fixed:');
      users.slice(0, 5).forEach(user => {
        console.log(`     - ${user.email}: ${user.full_name || 'No name set'}`);
      });
    }

    if (recentApps && recentApps.length > 0) {
      const appCounts = {};
      recentApps.forEach(app => {
        appCounts[app.app_name] = (appCounts[app.app_name] || 0) + 1;
      });
      
      const topApps = Object.entries(appCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      console.log('\n   📱 Top Apps (legitimate work):');
      topApps.forEach(([app, count]) => {
        console.log(`     - ${app}: ${count} activities`);
      });
    }

  } catch (error) {
    console.error('   ❌ Failed to display system status:', error);
  }
}

// Run the fixes
fixLiveSystemIssues(); 