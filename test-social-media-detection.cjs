// Test social media detection logic
const SUSPICIOUS_PATTERNS = {
  social_media: [
    'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com',
    'snapchat.com', 'reddit.com', 'pinterest.com', 'whatsapp.com', 'telegram.org',
    'discord.com', 'slack.com', 'teams.microsoft.com'
  ]
};

function testSocialMediaDetection() {
  console.log('🧪 Testing Social Media Detection Logic...\n');
  
  // Test URL detection
  const testUrls = [
    'https://facebook.com/feed',
    'https://www.instagram.com/explore/',
    'https://twitter.com/home',
    'https://reddit.com/r/programming',
    'https://linkedin.com/feed',
    'https://worktime.ebdaadt.com/suspicious-activity',
    'https://google.com/search'
  ];
  
  console.log('1️⃣ Testing URL Detection:');
  testUrls.forEach(testUrl => {
    const allText = testUrl.toLowerCase();
    const detected = SUSPICIOUS_PATTERNS.social_media.some(domain => 
      allText.includes(domain) || allText.includes(domain.split('.')[0])
    );
    console.log(`${detected ? '✅' : '❌'} ${testUrl} - ${detected ? 'DETECTED' : 'NOT DETECTED'}`);
  });
  
  // Test window title detection
  const testTitles = [
    'Facebook - Home',
    'Instagram - Explore',
    'Twitter - Home',
    'Reddit - r/programming',
    'LinkedIn - Feed',
    'Cursor - code editor',
    'Safari - Google Search'
  ];
  
  console.log('\n2️⃣ Testing Window Title Detection:');
  testTitles.forEach(testTitle => {
    const allText = testTitle.toLowerCase();
    const detected = SUSPICIOUS_PATTERNS.social_media.some(domain => 
      allText.includes(domain) || allText.includes(domain.split('.')[0])
    );
    console.log(`${detected ? '✅' : '❌'} ${testTitle} - ${detected ? 'DETECTED' : 'NOT DETECTED'}`);
  });
  
  // Test app analysis
  const testApps = [
    { app_name: 'Safari', window_title: 'Facebook - Home', app_path: 'com.apple.safari' },
    { app_name: 'Chrome', window_title: 'Instagram - Explore', app_path: 'com.google.chrome' },
    { app_name: 'Firefox', window_title: 'Twitter - Home', app_path: 'org.mozilla.firefox' },
    { app_name: 'Cursor', window_title: 'No Window', app_path: 'com.todesktop.cursor' }
  ];
  
  console.log('\n3️⃣ Testing App Analysis:');
  testApps.forEach(testApp => {
    const appName = (testApp.app_name || '').toLowerCase();
    const windowTitle = (testApp.window_title || '').toLowerCase();
    const appPath = (testApp.app_path || '').toLowerCase();
    
    const allAppText = `${appName} ${windowTitle} ${appPath}`.toLowerCase();
    
    const detected = SUSPICIOUS_PATTERNS.social_media.some(domain => 
      allAppText.includes(domain) || allAppText.includes(domain.split('.')[0])
    );
    
    console.log(`${detected ? '✅' : '❌'} ${testApp.app_name} - ${testApp.window_title} - ${detected ? 'DETECTED' : 'NOT DETECTED'}`);
  });
  
  console.log('\n🎯 Detection logic test complete!');
}

// Test the enhanced detection function
function testEnhancedDetection() {
  console.log('\n🔬 Testing Enhanced Detection Function...\n');
  
  // Simulate URL logs with different field combinations
  const mockUrlLogs = [
    { site_url: 'https://facebook.com/feed', title: 'Facebook - Home', domain: 'facebook.com' },
    { url: 'https://instagram.com/explore/', title: 'Instagram - Explore' },
    { domain: 'twitter.com', title: 'Twitter - Home' },
    { site_url: 'https://worktime.ebdaadt.com/suspicious-activity', title: 'Work Time Admin' }
  ];
  
  console.log('4️⃣ Testing Enhanced URL Analysis:');
  let socialMediaUsage = 0;
  
  mockUrlLogs.forEach(log => {
    const url = (log.site_url || log.url || log.domain || '').toLowerCase();
    const title = (log.title || '').toLowerCase();
    const windowTitle = (log.window_title || '').toLowerCase();
    
    const allText = `${url} ${title} ${windowTitle}`.toLowerCase();
    
    const detected = SUSPICIOUS_PATTERNS.social_media.some(domain => 
      allText.includes(domain) || allText.includes(domain.split('.')[0])
    );
    
    if (detected) {
      socialMediaUsage++;
      console.log(`✅ Social media detected: ${allText}`);
    } else {
      console.log(`❌ Not detected: ${allText}`);
    }
  });
  
  console.log(`\n📊 Total social media usage detected: ${socialMediaUsage}`);
  
  // Test screenshot analysis
  console.log('\n5️⃣ Testing Screenshot Analysis:');
  const mockScreenshots = [
    { active_window_title: 'Facebook - Home', url: 'https://facebook.com/feed', app_name: 'Safari' },
    { window_title: 'Instagram - Explore', url: null, app_name: 'Chrome' },
    { active_window_title: null, url: null, app_name: 'Cursor' },
    { active_window_title: 'Twitter - Home', url: 'https://twitter.com/home', app_name: 'Firefox' }
  ];
  
  let socialMediaScreenshots = 0;
  
  mockScreenshots.forEach(screenshot => {
    const title = (screenshot.active_window_title || screenshot.window_title || '').toLowerCase();
    const url = (screenshot.url || '').toLowerCase();
    const appName = (screenshot.app_name || '').toLowerCase();
    
    const allText = `${title} ${url} ${appName}`.toLowerCase();
    
    const detected = SUSPICIOUS_PATTERNS.social_media.some(domain => 
      allText.includes(domain) || 
      allText.includes(domain.split('.')[0]) ||
      title.includes(domain.split('.')[0]) ||
      url.includes(domain)
    );
    
    if (detected) {
      socialMediaScreenshots++;
      console.log(`✅ Social media detected in screenshot: ${allText}`);
    } else {
      console.log(`❌ Not detected in screenshot: ${allText}`);
    }
  });
  
  console.log(`\n📱 Total social media screenshots detected: ${socialMediaScreenshots}`);
}

console.log('🚀 Starting Social Media Detection Tests...\n');
testSocialMediaDetection();
testEnhancedDetection();
console.log('\n✅ All tests completed!'); 