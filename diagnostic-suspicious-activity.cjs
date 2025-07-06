const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticSuspiciousActivity() {
  console.log('🔍 DIAGNOSING SUSPICIOUS ACTIVITY DETECTION ISSUE');
  console.log('================================================');
  console.log('👤 User reported: Instagram visits not being detected as suspicious');
  console.log('📧 Account: m_Afatah@me.com');
  console.log('');

  try {
    // 1. Check if user exists in the system
    await checkUserExists();
    
    // 2. Check URL tracking data
    await checkUrlTrackingData();
    
    // 3. Check suspicious activity detection logic
    await checkSuspiciousActivityLogic();
    
    // 4. Check desktop agent status
    await checkDesktopAgentStatus();
    
    // 5. Provide solutions
    await provideSolutions();

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

async function checkUserExists() {
  console.log('1️⃣ Checking if user exists in system...');
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .eq('email', 'm_Afatah@me.com');

    if (error) {
      console.error('   ❌ Database error:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('   ⚠️  User not found in database');
      console.log('   💡 The user may need to log in first to create their account');
      return;
    }

    const user = users[0];
    console.log(`   ✅ User found: ${user.full_name || user.email}`);
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   🏷️  Role: ${user.role}`);
    console.log(`   📅 Created: ${new Date(user.created_at).toLocaleString()}`);
    
    // Store user ID globally for other checks
    global.userId = user.id;
    
  } catch (error) {
    console.error('   ❌ Failed to check user:', error);
  }
}

async function checkUrlTrackingData() {
  console.log('\n2️⃣ Checking URL tracking data...');
  
  if (!global.userId) {
    console.log('   ⚠️  Cannot check URL data - user not found');
    return;
  }

  try {
    // Check recent URL logs for this user
    const { data: urlLogs, error } = await supabase
      .from('url_logs')
      .select('*')
      .eq('user_id', global.userId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('   ❌ Failed to fetch URL logs:', error.message);
      return;
    }

    console.log(`   📊 Total URL logs for user: ${urlLogs?.length || 0}`);
    
    if (!urlLogs || urlLogs.length === 0) {
      console.log('   ⚠️  NO URL LOGS FOUND - This is the main issue!');
      console.log('   💡 The desktop agent is not capturing URLs from browsers');
      console.log('   📝 Without URL logs, suspicious activity detection cannot work');
      return;
    }

    // Check for Instagram visits
    const instagramLogs = urlLogs.filter(log => 
      log.site_url?.toLowerCase().includes('instagram.com') || 
      log.url?.toLowerCase().includes('instagram.com') ||
      log.domain?.toLowerCase().includes('instagram.com')
    );

    console.log(`   📸 Instagram visits found: ${instagramLogs.length}`);
    
    if (instagramLogs.length > 0) {
      console.log('   ✅ Instagram visits are being captured!');
      instagramLogs.forEach((log, index) => {
        console.log(`      ${index + 1}. ${log.site_url || log.url} - ${new Date(log.timestamp).toLocaleString()}`);
      });
    } else {
      console.log('   ⚠️  No Instagram visits found in URL logs');
      console.log('   💡 Either user didn\'t visit Instagram recently, or URL tracking is not working');
    }

    // Show recent URL activity
    console.log('\n   📋 Recent URL activity (last 10):');
    urlLogs.slice(0, 10).forEach((log, index) => {
      const url = log.site_url || log.url || 'Unknown URL';
      const domain = log.domain || 'Unknown domain';
      const time = new Date(log.timestamp).toLocaleString();
      console.log(`      ${index + 1}. ${domain} - ${time}`);
    });

  } catch (error) {
    console.error('   ❌ Failed to check URL tracking data:', error);
  }
}

async function checkSuspiciousActivityLogic() {
  console.log('\n3️⃣ Checking suspicious activity detection logic...');
  
  // Test the suspicious patterns
  const SUSPICIOUS_PATTERNS = {
    social_media: [
      'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'tiktok.com',
      'snapchat.com', 'reddit.com', 'pinterest.com', 'whatsapp.com', 'telegram.org'
    ],
    news: [
      'cnn.com', 'bbc.com', 'fox.com', 'reuters.com', 'ap.org', 'news.google.com',
      'yahoo.com/news', 'msn.com/news', 'nytimes.com', 'washingtonpost.com'
    ],
    entertainment: [
      'youtube.com', 'netflix.com', 'hulu.com', 'disney.com', 'twitch.tv',
      'spotify.com', 'soundcloud.com', 'tiktok.com', 'vine.co'
    ]
  };

  console.log('   🔍 Testing suspicious patterns detection...');
  
  // Test Instagram detection
  const testUrls = [
    'https://www.instagram.com/profile/user',
    'https://instagram.com/explore',
    'https://www.instagram.com/stories',
    'https://m.instagram.com/mobile'
  ];

  console.log('   📸 Testing Instagram URL detection:');
  testUrls.forEach(url => {
    const isDetected = SUSPICIOUS_PATTERNS.social_media.some(domain => url.includes(domain));
    console.log(`      ${url} -> ${isDetected ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
  });

  // Test the actual suspicious activity function logic
  if (global.userId) {
    console.log('\n   🧪 Testing suspicious activity analysis...');
    
    const { data: urlLogs, error } = await supabase
      .from('url_logs')
      .select('*')
      .eq('user_id', global.userId)
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (!error && urlLogs) {
      // Simulate the suspicious activity analysis
      let socialMediaUsage = 0;
      let riskScore = 0;

      urlLogs.forEach(log => {
        const url = (log.site_url || log.url || '').toLowerCase();
        
        if (SUSPICIOUS_PATTERNS.social_media.some(domain => url.includes(domain))) {
          socialMediaUsage++;
          riskScore += 2;
        }
      });

      console.log(`   📊 Analysis Results:`);
      console.log(`      Social Media Usage: ${socialMediaUsage} visits`);
      console.log(`      Risk Score: ${riskScore}`);
      console.log(`      Would be flagged as suspicious: ${riskScore >= 10 ? '✅ YES' : '❌ NO'}`);
    }
  }
}

async function checkDesktopAgentStatus() {
  console.log('\n4️⃣ Checking desktop agent status...');
  
  try {
    // Check if there's recent activity indicating desktop agent is running
    const { data: recentActivity, error } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', global.userId)
      .gte('start_time', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('start_time', { ascending: false })
      .limit(1);

    if (error) {
      console.error('   ❌ Failed to check recent activity:', error.message);
      return;
    }

    if (!recentActivity || recentActivity.length === 0) {
      console.log('   ⚠️  No recent time tracking activity found');
      console.log('   💡 Desktop agent may not be running or user is not actively tracking');
    } else {
      console.log('   ✅ Recent time tracking activity found');
      console.log(`   🕐 Last activity: ${new Date(recentActivity[0].start_time).toLocaleString()}`);
    }

    // Check app logs (indicates desktop agent is capturing apps)
    const { data: appLogs, error: appError } = await supabase
      .from('app_logs')
      .select('*')
      .eq('user_id', global.userId)
      .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .limit(5);

    if (!appError && appLogs && appLogs.length > 0) {
      console.log(`   ✅ App tracking is working - ${appLogs.length} recent app logs found`);
      console.log('   📱 Recent apps:');
      appLogs.forEach((log, index) => {
        console.log(`      ${index + 1}. ${log.app_name} - ${new Date(log.timestamp).toLocaleString()}`);
      });
    } else {
      console.log('   ⚠️  No recent app logs found');
    }

  } catch (error) {
    console.error('   ❌ Failed to check desktop agent status:', error);
  }
}

async function provideSolutions() {
  console.log('\n5️⃣ SOLUTIONS TO FIX SUSPICIOUS ACTIVITY DETECTION');
  console.log('================================================');
  
  console.log('🔧 Based on the diagnosis, here are the solutions:');
  console.log('');
  
  console.log('**PRIMARY ISSUE: URL Tracking Not Working**');
  console.log('');
  console.log('1. **Restart Desktop Agent with URL Tracking:**');
  console.log('   - Close the desktop agent completely');
  console.log('   - Open Terminal and run: `cd desktop-agent && npm start`');
  console.log('   - Make sure to grant permissions when prompted');
  console.log('');
  
  console.log('2. **Enable Browser Permissions (macOS):**');
  console.log('   - System Preferences → Security & Privacy → Privacy');
  console.log('   - Select "Accessibility" - add the desktop agent');
  console.log('   - Select "Full Disk Access" - add the desktop agent');
  console.log('   - This allows URL extraction from browsers');
  console.log('');
  
  console.log('3. **Test URL Tracking Manually:**');
  console.log('   - Start time tracking in the desktop agent');
  console.log('   - Visit Instagram in your browser');
  console.log('   - Check the debug console for URL capture logs');
  console.log('   - Look for messages like: "🔗 NEW URL DETECTED: instagram.com"');
  console.log('');
  
  console.log('4. **Verify Data in Database:**');
  console.log('   - Run this script again after testing');
  console.log('   - Check if Instagram URLs appear in the url_logs table');
  console.log('   - Visit the suspicious activity page to see if it detects the visits');
  console.log('');
  
  console.log('5. **Force Enable URL Tracking:**');
  console.log('   - In desktop agent, check if "URL Tracking" is enabled');
  console.log('   - If disabled, enable it in the settings');
  console.log('   - The system should automatically detect Instagram as suspicious');
  console.log('');
  
  console.log('**EXPECTED BEHAVIOR:**');
  console.log('- Instagram visits should be logged to url_logs table');
  console.log('- Suspicious activity page should show social media usage');
  console.log('- Risk score should increase with Instagram visits');
  console.log('- Flags should include "High social media usage"');
  console.log('');
  
  console.log('**NEXT STEPS:**');
  console.log('1. Fix the URL tracking system first');
  console.log('2. Test with Instagram visits');
  console.log('3. Check suspicious activity detection');
  console.log('4. Run this diagnostic again to confirm fixes');
  console.log('');
  
  console.log('✅ Once URL tracking is working, Instagram visits will be automatically');
  console.log('   detected as suspicious activity with appropriate risk scoring.');
}

// Run the diagnostic
diagnosticSuspiciousActivity(); 