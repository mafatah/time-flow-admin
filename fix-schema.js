import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('desktop-agent/config.json', 'utf8'));
const supabase = createClient(config.supabase_url, config.supabase_key);

async function fixSchema() {
  console.log('🔧 Checking database schema...');
  
  try {
    // First, get a valid project ID
    console.log('🔍 Getting valid project ID...');
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1);
      
    if (projectError) {
      console.log('❌ Project query failed:', projectError.message);
      return;
    }
    
    const projectId = projects?.[0]?.id || '00000000-0000-0000-0000-000000000001';
    console.log('📋 Using project ID:', projectId);
    
    // Test inserting a time log without idle_seconds to see current schema
    console.log('\n🧪 Testing time log insertion without idle_seconds...');
    const { data: testTimeLog, error: testError } = await supabase
      .from('time_logs')
      .insert({
        user_id: config.user_id || 'demo-user',
        project_id: projectId,
        start_time: new Date().toISOString()
      })
      .select()
      .single();
      
    if (testError) {
      console.log('❌ Time log test failed:', testError.message);
    } else {
      console.log('✅ Time log test successful');
      console.log('📊 Available columns:', Object.keys(testTimeLog));
      
      // Clean up test record
      await supabase.from('time_logs').delete().eq('id', testTimeLog.id);
    }
    
    // Test idle_logs table with duration_minutes instead
    console.log('\n🧪 Testing idle log insertion with duration_minutes...');
    const { data: testIdleLog, error: idleError } = await supabase
      .from('idle_logs')
      .insert({
        user_id: config.user_id || 'demo-user',
        project_id: projectId,
        idle_start: new Date().toISOString(),
        duration_minutes: 5
      })
      .select()
      .single();
      
    if (idleError) {
      console.log('❌ Idle log test failed:', idleError.message);
    } else {
      console.log('✅ Idle log test successful');
      console.log('📊 Available columns:', Object.keys(testIdleLog));
      
      // Clean up test record
      await supabase.from('idle_logs').delete().eq('id', testIdleLog.id);
    }
    
    console.log('\n🎉 Schema check completed');
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

fixSchema(); 