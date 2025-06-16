const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Load desktop agent config
const { loadConfig } = require('./desktop-agent/load-config');
const config = loadConfig();

console.log('🚀 Starting stale session cleanup...');
console.log('📋 Using Supabase URL:', config.supabase_url);
console.log('👤 User ID:', config.user_id);

const supabase = createClient(config.supabase_url, config.supabase_key);

async function cleanupAllStaleSessions() {
  try {
    console.log('🧹 Cleaning up all stale active sessions...');
    
    // Get all active sessions (no end_time)
    const { data: activeSessions, error: fetchError } = await supabase
      .from('time_logs')
      .select('id, user_id, project_id, start_time, status')
      .eq('user_id', config.user_id)
      .is('end_time', null);
    
    if (fetchError) {
      console.error('❌ Error fetching active sessions:', fetchError);
      return;
    }
    
    if (!activeSessions || activeSessions.length === 0) {
      console.log('✅ No stale sessions found');
      return;
    }
    
    console.log(`📊 Found ${activeSessions.length} stale sessions:`);
    activeSessions.forEach((session, index) => {
      console.log(`  ${index + 1}. Session ID: ${session.id}`);
      console.log(`      Started: ${session.start_time}`);
      console.log(`      Status: ${session.status}`);
    });
    
    // Update all stale sessions
    const { data, error: updateError } = await supabase
      .from('time_logs')
      .update({
        end_time: new Date().toISOString(),
        status: 'completed'
      })
      .eq('user_id', config.user_id)
      .is('end_time', null);
    
    if (updateError) {
      console.error('❌ Error updating stale sessions:', updateError);
      return;
    }
    
    console.log(`✅ Successfully cleaned up ${activeSessions.length} stale sessions`);
    console.log('🎯 All sessions are now properly terminated');
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

// Run the cleanup
cleanupAllStaleSessions()
  .then(() => {
    console.log('✅ Cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }); 