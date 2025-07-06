const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4'
);

// Social media domains to test
const SOCIAL_MEDIA_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com',
  'snapchat.com', 'reddit.com', 'pinterest.com', 'whatsapp.com', 'telegram.org',
  'discord.com', 'slack.com', 'teams.microsoft.com'
];

async function debugSocialMediaDetection() {
  console.log('🔍 Starting Social Media Detection Debug...\n');
  
  try {
    // Get the latest few days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // Last 7 days
    
    console.log(`📅 Analyzing data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n`);
    
    // 1. Check URL logs table structure and data
    console.log('1️⃣ Checking URL logs...');
    const { data: urlLogs, error: urlError } = await supabase
      .from('url_logs')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(20);
    
    if (urlError) {
      console.error('❌ URL logs error:', urlError);
    } else {
      console.log(`✅ Found ${urlLogs.length} URL log entries`);
      
      if (urlLogs.length > 0) {
        console.log('📊 Sample URL log entry:');
        console.log(JSON.stringify(urlLogs[0], null, 2));
        
        // Check for social media in URL logs
        let socialMediaCount = 0;
        urlLogs.forEach(log => {
          const url = (log.site_url || log.url || '').toLowerCase();
          if (SOCIAL_MEDIA_DOMAINS.some(domain => url.includes(domain))) {
            socialMediaCount++;
            console.log(`🔍 Social media detected in URL: ${url}`);
          }
        });
        
        console.log(`📱 Social media URLs found: ${socialMediaCount}`);
      } else {
        console.log('⚠️ No URL logs found for this period');
      }
    }
    
    console.log('\n');
    
    // 2. Check screenshots table structure and data
    console.log('2️⃣ Checking screenshots...');
    const { data: screenshots, error: screenshotError } = await supabase
      .from('screenshots')
      .select('*')
      .gte('captured_at', startDate.toISOString())
      .lte('captured_at', endDate.toISOString())
      .order('captured_at', { ascending: false })
      .limit(20);
    
    if (screenshotError) {
      console.error('❌ Screenshots error:', screenshotError);
    } else {
      console.log(`✅ Found ${screenshots.length} screenshot entries`);
      
      if (screenshots.length > 0) {
        console.log('📊 Sample screenshot entry:');
        console.log(JSON.stringify(screenshots[0], null, 2));
        
        // Check for social media in screenshots
        let socialMediaScreenshots = 0;
        screenshots.forEach(screenshot => {
          const title = (screenshot.active_window_title || '').toLowerCase();
          const url = (screenshot.url || '').toLowerCase();
          
          if (SOCIAL_MEDIA_DOMAINS.some(domain => 
            title.includes(domain.split('.')[0]) || url.includes(domain)
          )) {
            socialMediaScreenshots++;
            console.log(`🔍 Social media detected in screenshot: ${title} | ${url}`);
          }
        });
        
        console.log(`📱 Social media screenshots found: ${socialMediaScreenshots}`);
      } else {
        console.log('⚠️ No screenshots found for this period');
      }
    }
    
    console.log('\n');
    
    // 3. Check users table
    console.log('3️⃣ Checking users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .limit(10);
    
    if (usersError) {
      console.error('❌ Users error:', usersError);
    } else {
      console.log(`✅ Found ${users.length} users`);
      if (users.length > 0) {
        console.log('👤 Sample user:');
        console.log(JSON.stringify(users[0], null, 2));
      }
    }
    
    console.log('\n');
    
    // 4. Check app logs table
    console.log('4️⃣ Checking app logs...');
    const { data: appLogs, error: appError } = await supabase
      .from('app_logs')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(10);
    
    if (appError) {
      console.error('❌ App logs error:', appError);
    } else {
      console.log(`✅ Found ${appLogs.length} app log entries`);
      if (appLogs.length > 0) {
        console.log('📊 Sample app log entry:');
        console.log(JSON.stringify(appLogs[0], null, 2));
      }
    }
    
    console.log('\n');
    
    // 5. Test the detection logic directly
    console.log('5️⃣ Testing detection logic...');
    
    // Test URLs
    const testUrls = [
      'https://facebook.com/feed',
      'https://www.instagram.com/explore/',
      'https://twitter.com/home',
      'https://reddit.com/r/programming',
      'https://linkedin.com/feed'
    ];
    
    console.log('Testing URL detection:');
    testUrls.forEach(testUrl => {
      const detected = SOCIAL_MEDIA_DOMAINS.some(domain => testUrl.toLowerCase().includes(domain));
      console.log(`${detected ? '✅' : '❌'} ${testUrl} - ${detected ? 'DETECTED' : 'NOT DETECTED'}`);
    });
    
    // Test window titles
    const testTitles = [
      'Facebook - Home',
      'Instagram - Explore',
      'Twitter - Home',
      'Reddit - r/programming',
      'LinkedIn - Feed'
    ];
    
    console.log('\nTesting window title detection:');
    testTitles.forEach(testTitle => {
      const detected = SOCIAL_MEDIA_DOMAINS.some(domain => 
        testTitle.toLowerCase().includes(domain.split('.')[0])
      );
      console.log(`${detected ? '✅' : '❌'} ${testTitle} - ${detected ? 'DETECTED' : 'NOT DETECTED'}`);
    });
    
    console.log('\n🎯 Debug complete! Check the results above to identify the issue.');
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug script
debugSocialMediaDetection(); 