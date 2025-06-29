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

async function cleanupStaleSession() {
  console.log('🧹 Cleaning up stale active session...');
  
  try {
    const { data, error } = await supabase
      .from('time_logs')
      .update({ 
        end_time: new Date().toISOString(),
        status: 'completed'
      })
      .is('end_time', null)
      .select();

    if (error) {
      console.error('❌ Error cleaning up session:', error);
      return;
    }

    console.log(`✅ Cleaned up ${data.length} stale sessions`);
    console.log('🎯 Timer should now stop fluctuating');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

cleanupStaleSession();
