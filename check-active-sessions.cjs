const { createClient } = require('@supabase/supabase-js');

// Load config same way as desktop agent
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

async function checkActiveSessions() {
  console.log('🔍 Checking for active time tracking sessions...');
  
  try {
    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .is('end_time', null)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('❌ Error querying database:', error);
      return;
    }

    console.log(`📊 Found ${data.length} active sessions:`);
    
    if (data.length === 0) {
      console.log('✅ No active sessions - timer should not be running');
    } else {
      data.forEach((session, index) => {
        const startTime = new Date(session.start_time);
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        console.log(`${index + 1}. Session ID: ${session.id}`);
        console.log(`   User ID: ${session.user_id}`);
        console.log(`   Project ID: ${session.project_id}`);
        console.log(`   Started: ${session.start_time}`);
        console.log(`   Elapsed: ${hours}h ${minutes}m ${seconds}s`);
        console.log(`   Status: ${session.status || 'unknown'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkActiveSessions();
