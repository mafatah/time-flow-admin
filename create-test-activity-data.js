import { createClient } from '@supabase/supabase-js';
import { addDays, subDays } from 'date-fns';

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Suspicious domains and apps for different risk levels
const SUSPICIOUS_URLS = {
  high_risk: [
    'https://facebook.com/feed',
    'https://instagram.com/explore',
    'https://tiktok.com/trending',
    'https://youtube.com/watch?v=entertainment',
    'https://netflix.com/browse',
    'https://twitch.tv/games',
    'https://reddit.com/r/funny',
    'https://twitter.com/home',
    'https://steam.com/games',
    'https://amazon.com/shopping'
  ],
  medium_risk: [
    'https://linkedin.com/feed', 
    'https://news.google.com',
    'https://cnn.com/breaking',
    'https://youtube.com/educational',
    'https://spotify.com/playlists',
    'https://bbc.com/news'
  ],
  productive: [
    'https://google.com/search',
    'https://github.com/repositories',
    'https://stackoverflow.com/questions',
    'https://docs.google.com/document',
    'https://office.com/excel',
    'https://slack.com/workspace'
  ]
};

const APPS = {
  high_risk: [
    'Discord - Gaming Chat',
    'Steam - Gaming Platform', 
    'Spotify - Music Player',
    'WhatsApp - Personal Chat',
    'Instagram - Social Media',
    'TikTok - Entertainment'
  ],
  medium_risk: [
    'News App - CNN',
    'LinkedIn - Professional',
    'Music Player - Work Playlist',
    'Notes - Personal'
  ],
  productive: [
    'Visual Studio Code - Development',
    'Google Chrome - Research',
    'Microsoft Word - Documentation',
    'Slack - Team Communication',
    'Zoom - Video Conference',
    'Excel - Data Analysis'
  ]
};

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateTimeseriesData(startDate, endDate, dataType, riskLevel) {
  const data = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    // Skip weekends
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      // Generate work hours data (9 AM to 5 PM)
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 10) { // Every 10 minutes
          const timestamp = new Date(current);
          timestamp.setHours(hour, minute, 0, 0);
          
          // Determine activity based on risk level
          let shouldGenerate = false;
          if (riskLevel === 'high_risk') shouldGenerate = Math.random() < 0.7;
          else if (riskLevel === 'medium_risk') shouldGenerate = Math.random() < 0.4;
          else shouldGenerate = Math.random() < 0.8; // Productive users are more active
          
          if (shouldGenerate) {
            data.push({
              timestamp: timestamp.toISOString(),
              type: dataType,
              riskLevel
            });
          }
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }
  
  return data;
}

async function generateTestDataForUser(userId, riskProfile = 'medium_risk') {
  console.log(`Generating test data for user ${userId} with ${riskProfile} profile...`);
  
  const endDate = new Date();
  const startDate = subDays(endDate, 7); // Last 7 days
  
  // Generate time series
  const timePoints = generateTimeseriesData(startDate, endDate, 'activity', riskProfile);
  
  const urlLogs = [];
  const appLogs = [];
  const screenshots = [];
  const idleLogs = [];
  
  let suspiciousCount = 0;
  let totalActivities = 0;
  
  timePoints.forEach((point, index) => {
    totalActivities++;
    
    // Generate URL logs
    let urls;
    let isSuspicious = false;
    
    if (riskProfile === 'high_risk' && Math.random() < 0.6) {
      urls = SUSPICIOUS_URLS.high_risk;
      isSuspicious = true;
      suspiciousCount++;
    } else if (riskProfile === 'medium_risk' && Math.random() < 0.3) {
      urls = SUSPICIOUS_URLS.medium_risk;
      isSuspicious = Math.random() < 0.5;
      if (isSuspicious) suspiciousCount++;
    } else {
      urls = SUSPICIOUS_URLS.productive;
    }
    
    const selectedUrl = getRandomElement(urls);
    const domain = selectedUrl.split('/')[2];
    
    urlLogs.push({
      user_id: userId,
      url: selectedUrl,
      domain: domain,
      title: `${domain} - Page ${index}`,
      timestamp: point.timestamp
    });
    
    // Generate app logs
    let apps;
    if (riskProfile === 'high_risk' && Math.random() < 0.4) {
      apps = APPS.high_risk;
    } else if (riskProfile === 'medium_risk' && Math.random() < 0.2) {
      apps = APPS.medium_risk;
    } else {
      apps = APPS.productive;
    }
    
    const selectedApp = getRandomElement(apps);
    appLogs.push({
      user_id: userId,
      app_name: selectedApp.split(' - ')[0],
      window_title: selectedApp,
      timestamp: point.timestamp,
      duration_seconds: Math.floor(Math.random() * 300) + 60 // 1-5 minutes
    });
    
    // Generate screenshots
    screenshots.push({
      user_id: userId,
      file_path: `/screenshots/${userId}/${Date.now()}_${index}.png`,
      activity_level: Math.floor(Math.random() * 100),
      focus_level: isSuspicious ? Math.floor(Math.random() * 40) + 10 : Math.floor(Math.random() * 60) + 40,
      active_window_title: selectedApp,
      url: selectedUrl,
      created_at: point.timestamp
    });
  });
  
  // Generate idle periods based on risk profile
  const idlePeriods = riskProfile === 'high_risk' ? 15 : riskProfile === 'medium_risk' ? 8 : 3;
  for (let i = 0; i < idlePeriods; i++) {
    const idleStart = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    const idleDuration = riskProfile === 'high_risk' ? 
      Math.floor(Math.random() * 60) + 30 : // 30-90 minutes
      Math.floor(Math.random() * 20) + 10;  // 10-30 minutes
    const idleEnd = new Date(idleStart.getTime() + (idleDuration * 60000));
    
    idleLogs.push({
      user_id: userId,
      start_time: idleStart.toISOString(),
      end_time: idleEnd.toISOString(),
      duration_seconds: idleDuration * 60,
      idle_type: 'automatic'
    });
  }
  
  // Insert data
  try {
    console.log(`Inserting ${urlLogs.length} URL logs...`);
    if (urlLogs.length > 0) {
      const { error } = await supabase.from('url_logs').insert(urlLogs);
      if (error) console.error('URL logs error:', error.message);
    }
    
    console.log(`Inserting ${appLogs.length} app logs...`);
    if (appLogs.length > 0) {
      const { error } = await supabase.from('app_logs').insert(appLogs);
      if (error) console.error('App logs error:', error.message);
    }
    
    console.log(`Inserting ${screenshots.length} screenshots...`);
    if (screenshots.length > 0) {
      const { error } = await supabase.from('screenshots').insert(screenshots);
      if (error) console.error('Screenshots error:', error.message);
    }
    
    console.log(`Inserting ${idleLogs.length} idle logs...`);
    if (idleLogs.length > 0) {
      const { error } = await supabase.from('idle_logs').insert(idleLogs);
      if (error) console.error('Idle logs error:', error.message);
    }
    
    console.log(`✅ Generated test data for ${riskProfile} profile:`);
    console.log(`   - ${totalActivities} total activities`);
    console.log(`   - ${suspiciousCount} suspicious activities (${Math.round(suspiciousCount/totalActivities*100)}%)`);
    console.log(`   - ${idleLogs.length} idle periods`);
    
    return {
      totalActivities,
      suspiciousCount,
      riskScore: Math.round((suspiciousCount / totalActivities) * 100 + (idleLogs.length * 5))
    };
    
  } catch (error) {
    console.error('Error inserting test data:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Creating test activity data for suspicious activity detection...\n');
  
  try {
    // Fetch existing employee users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('role', 'employee')
      .limit(4);
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No employee users found in the database.');
      console.log('💡 Please create some employee users first, then run this script.');
      return;
    }
    
    console.log(`Found ${users.length} employee users. Generating test data...\n`);
    
    // Assign different risk profiles to users
    const riskProfiles = ['high_risk', 'medium_risk', 'low_risk', 'productive'];
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const profile = riskProfiles[i % riskProfiles.length];
      
      console.log(`\n📊 User: ${user.full_name} (${user.email})`);
      console.log(`🎯 Profile: ${profile}`);
      
      const result = await generateTestDataForUser(user.id, profile);
      
      if (result) {
        console.log(`🔍 Expected risk score: ~${result.riskScore}%`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Test data generation completed!');
    console.log('\nNow you can:');
    console.log('1. 🔄 Refresh the Suspicious Activity page');
    console.log('2. 🔍 Click "Analyze Activity" to process the test data');
    console.log('3. 📊 Lower the risk threshold to see more results');
    console.log('4. 🎯 Test different date ranges');
    console.log('\nExpected results:');
    console.log('- High risk users should show 70-90% risk scores');
    console.log('- Medium risk users should show 30-50% risk scores');
    console.log('- Low risk/productive users should show 10-30% risk scores');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main(); 