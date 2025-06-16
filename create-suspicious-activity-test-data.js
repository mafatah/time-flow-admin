import { createClient } from '@supabase/supabase-js';
import "dotenv/config";
import { addDays, subDays, format } from 'date-fns';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test employees with different risk profiles
const TEST_EMPLOYEES = [
  {
    full_name: 'High Risk Employee',
    email: 'highrisk@test.com',
    profile: 'high_risk' // Lots of social media, gaming, idle time
  },
  {
    full_name: 'Medium Risk Employee', 
    email: 'mediumrisk@test.com',
    profile: 'medium_risk' // Some unproductive activity
  },
  {
    full_name: 'Low Risk Employee',
    email: 'lowrisk@test.com', 
    profile: 'low_risk' // Mostly productive
  },
  {
    full_name: 'Productive Employee',
    email: 'productive@test.com',
    profile: 'productive' // Very productive, minimal risk
  }
];

// Suspicious domains and apps
const DOMAINS = {
  social_media: [
    'facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com', 'reddit.com',
    'linkedin.com', 'snapchat.com', 'pinterest.com'
  ],
  news: [
    'cnn.com', 'bbc.com', 'fox.com', 'nytimes.com', 'washingtonpost.com',
    'reuters.com', 'news.google.com'
  ],
  entertainment: [
    'youtube.com', 'netflix.com', 'hulu.com', 'spotify.com', 'twitch.tv',
    'soundcloud.com', 'disney.com'
  ],
  gaming: [
    'steam.com', 'epic.com', 'battlenet.com', 'minecraft.net', 'roblox.com',
    'origin.com', 'uplay.com'
  ],
  shopping: [
    'amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'alibaba.com',
    'etsy.com', 'aliexpress.com'
  ],
  productive: [
    'google.com', 'github.com', 'stackoverflow.com', 'docs.google.com',
    'microsoft.com', 'office.com', 'slack.com', 'notion.so'
  ]
};

const APPS = {
  entertainment: [
    'Spotify', 'Discord', 'Steam', 'Epic Games Launcher', 'WhatsApp',
    'Telegram', 'VLC Media Player', 'iTunes'
  ],
  gaming: [
    'Minecraft', 'Counter-Strike', 'Fortnite', 'League of Legends', 
    'World of Warcraft', 'Valorant', 'Among Us'
  ],
  productive: [
    'Visual Studio Code', 'Chrome', 'Firefox', 'Microsoft Word', 'Excel',
    'PowerPoint', 'Slack', 'Zoom', 'Teams', 'Figma', 'Photoshop'
  ]
};

// Risk profiles define behavior patterns
const RISK_PROFILES = {
  high_risk: {
    social_media_frequency: 0.4, // 40% of logs
    entertainment_frequency: 0.3,
    gaming_frequency: 0.2,
    shopping_frequency: 0.1,
    productive_frequency: 0.2,
    idle_time_multiplier: 3, // 3x more idle time
    entertainment_apps_frequency: 0.3
  },
  medium_risk: {
    social_media_frequency: 0.2,
    entertainment_frequency: 0.15,
    gaming_frequency: 0.1,
    shopping_frequency: 0.05,
    productive_frequency: 0.4,
    idle_time_multiplier: 1.5,
    entertainment_apps_frequency: 0.15
  },
  low_risk: {
    social_media_frequency: 0.05,
    entertainment_frequency: 0.05,
    gaming_frequency: 0.02,
    shopping_frequency: 0.02,
    productive_frequency: 0.7,
    idle_time_multiplier: 0.8,
    entertainment_apps_frequency: 0.05
  },
  productive: {
    social_media_frequency: 0.02,
    entertainment_frequency: 0.02,
    gaming_frequency: 0.01,
    shopping_frequency: 0.01,
    productive_frequency: 0.85,
    idle_time_multiplier: 0.5,
    entertainment_apps_frequency: 0.02
  }
};

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shouldInclude(frequency) {
  return Math.random() < frequency;
}

async function createTestEmployee(employeeData) {
  console.log(`Creating test employee: ${employeeData.full_name}`);
  
  // Create user
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: employeeData.email,
    password: 'testpassword123',
    email_confirm: true,
    user_metadata: {
      full_name: employeeData.full_name,
      role: 'employee'
    }
  });

  if (userError) {
    console.error('Error creating user:', userError);
    return null;
  }

  // Insert into users table
  const { data: userRecord, error: insertError } = await supabase
    .from('users')
    .insert({
      id: userData.user.id,
      email: employeeData.email,
      full_name: employeeData.full_name,
      role: 'employee',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting user record:', insertError);
    return null;
  }

  return userRecord;
}

async function generateTestData(userId, profile, days = 7) {
  console.log(`Generating ${days} days of test data for profile: ${profile}`);
  
  const riskProfile = RISK_PROFILES[profile];
  const endDate = new Date();
  const startDate = subDays(endDate, days);

  const urlLogs = [];
  const appLogs = [];
  const idleLogs = [];
  const screenshots = [];

  // Generate data for each day
  for (let day = 0; day < days; day++) {
    const currentDate = addDays(startDate, day);
    
    // Skip weekends for more realistic data
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
    
    // Generate 8 hours of work day data (9 AM to 5 PM)
    for (let hour = 9; hour < 17; hour++) {
      const hourStart = new Date(currentDate);
      hourStart.setHours(hour, 0, 0, 0);
      
      // Generate 10-20 activities per hour
      const activitiesPerHour = Math.floor(Math.random() * 10) + 10;
      
      for (let activity = 0; activity < activitiesPerHour; activity++) {
        const timestamp = new Date(hourStart.getTime() + (activity * (60000 * 6))); // Every 6 minutes
        
        // Generate URL logs based on risk profile
        let domain;
        let category;
        
        if (shouldInclude(riskProfile.social_media_frequency)) {
          domain = getRandomElement(DOMAINS.social_media);
          category = 'social_media';
        } else if (shouldInclude(riskProfile.entertainment_frequency)) {
          domain = getRandomElement(DOMAINS.entertainment);
          category = 'entertainment';
        } else if (shouldInclude(riskProfile.gaming_frequency)) {
          domain = getRandomElement(DOMAINS.gaming);
          category = 'gaming';
        } else if (shouldInclude(riskProfile.shopping_frequency)) {
          domain = getRandomElement(DOMAINS.shopping);
          category = 'shopping';
        } else {
          domain = getRandomElement(DOMAINS.productive);
          category = 'productive';
        }
        
        urlLogs.push({
          user_id: userId,
          url: `https://${domain}/${Math.random().toString(36).substring(7)}`,
          domain: domain,
          title: `${domain} - Random Page`,
          timestamp: timestamp.toISOString(),
          category: category
        });

        // Generate app logs
        let appName;
        if (shouldInclude(riskProfile.entertainment_apps_frequency)) {
          if (Math.random() < 0.5) {
            appName = getRandomElement(APPS.entertainment);
          } else {
            appName = getRandomElement(APPS.gaming);
          }
        } else {
          appName = getRandomElement(APPS.productive);
        }
        
        appLogs.push({
          user_id: userId,
          app_name: appName,
          window_title: `${appName} - Working`,
          timestamp: timestamp.toISOString(),
          duration_seconds: Math.floor(Math.random() * 300) + 60 // 1-5 minutes
        });

        // Generate screenshots with suspicious content
        let isSuspicious = false;
        let activeWindowTitle = `${appName} - Working`;
        let url = `https://${domain}`;
        
        if (category !== 'productive') {
          isSuspicious = true;
          activeWindowTitle = `${domain} - ${category}`;
        }
        
        screenshots.push({
          user_id: userId,
          file_path: `/screenshots/${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.png`,
          activity_level: Math.floor(Math.random() * 100),
          focus_level: Math.floor(Math.random() * 100),
          active_window_title: activeWindowTitle,
          url: url,
          created_at: timestamp.toISOString(),
          is_suspicious: isSuspicious
        });
      }
      
      // Generate idle periods based on risk profile
      if (shouldInclude(riskProfile.idle_time_multiplier * 0.1)) {
        const idleStart = new Date(hourStart.getTime() + (Math.random() * 3600000)); // Random time in hour
        const idleDuration = Math.floor(Math.random() * 30 * riskProfile.idle_time_multiplier) + 5; // 5-35 minutes
        const idleEnd = new Date(idleStart.getTime() + (idleDuration * 60000));
        
        idleLogs.push({
          user_id: userId,
          start_time: idleStart.toISOString(),
          end_time: idleEnd.toISOString(),
          duration_seconds: idleDuration * 60,
          idle_type: 'automatic'
        });
      }
    }
  }

  // Insert all data in batches
  console.log(`Inserting ${urlLogs.length} URL logs...`);
  if (urlLogs.length > 0) {
    const { error: urlError } = await supabase.from('url_logs').insert(urlLogs);
    if (urlError) console.error('Error inserting URL logs:', urlError);
  }

  console.log(`Inserting ${appLogs.length} app logs...`);
  if (appLogs.length > 0) {
    const { error: appError } = await supabase.from('app_logs').insert(appLogs);
    if (appError) console.error('Error inserting app logs:', appError);
  }

  console.log(`Inserting ${idleLogs.length} idle logs...`);
  if (idleLogs.length > 0) {
    const { error: idleError } = await supabase.from('idle_logs').insert(idleLogs);
    if (idleError) console.error('Error inserting idle logs:', idleError);
  }

  console.log(`Inserting ${screenshots.length} screenshots...`);
  if (screenshots.length > 0) {
    const { error: screenshotError } = await supabase.from('screenshots').insert(screenshots);
    if (screenshotError) console.error('Error inserting screenshots:', screenshotError);
  }

  console.log(`✅ Generated test data for ${profile} profile`);
}

async function main() {
  console.log('🚀 Creating suspicious activity test data...\n');

  try {
    // Create test employees and generate data
    for (const employeeData of TEST_EMPLOYEES) {
      const user = await createTestEmployee(employeeData);
      if (user) {
        await generateTestData(user.id, employeeData.profile, 7);
        console.log(`✅ Completed data for ${employeeData.full_name}\n`);
      }
    }

    console.log('🎉 Test data creation completed!');
    console.log('\nTest employees created:');
    TEST_EMPLOYEES.forEach(emp => {
      console.log(`- ${emp.full_name} (${emp.email}) - ${emp.profile} profile`);
    });
    console.log('\nYou can now test the suspicious activity detection page!');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

main(); 