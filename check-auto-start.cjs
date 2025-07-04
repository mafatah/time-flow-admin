const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let config = {};
const envPath = path.join(__dirname, 'desktop-agent', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/"/g, '');
      config[key.trim()] = value.trim();
    }
  });
}

const supabase = createClient(
  config.SUPABASE_URL || process.env.SUPABASE_URL, 
  config.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkAutoStart() {
  console.log('🔍 Checking auto-start settings...');
  
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('user_id', config.USER_ID)
      .single();

    if (error) {
      console.log('❌ Error querying settings:', error.message);
      console.log('📋 This might be why auto-start is using default values');
      return;
    }

    if (data) {
      console.log('📊 Database settings:');
      console.log(`   auto_start_tracking: ${data.auto_start_tracking}`);
      console.log(`   screenshot_interval: ${data.screenshot_interval_seconds}s`);
      console.log(`   idle_threshold: ${data.idle_threshold_seconds}s`);
      
      if (data.auto_start_tracking) {
        console.log('⚠️ AUTO-START IS ENABLED in database - this is causing the duplicate start!');
        console.log('💡 To fix: Disable auto-start in the TimeFlow settings');
      } else {
        console.log('✅ Auto-start is disabled in database');
      }
    } else {
      console.log('📋 No settings found in database');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAutoStart();
