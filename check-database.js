import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qixfnsdkmcddhpxqswpc.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpeGZuc2RrbWNkZGhweHFzd3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxMzY2NzIsImV4cCI6MjA0ODcxMjY3Mn0.TzkWIHOYL6qNAmKSNZfO77DnrmyVSz5ib2L72HCkpG0'
);

async function checkDatabase() {
  console.log('🔍 Checking time_logs database...');
  
  try {
    // Check total count
    const { data: allLogs, count, error } = await supabase
      .from('time_logs')
      .select('*', { count: 'exact' })
      .order('start_time', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log('📊 Total logs in database:', count);
    console.log('📋 Latest logs:');
    if (allLogs && allLogs.length > 0) {
      allLogs.forEach((log, i) => {
        console.log(`  ${i+1}. ID: ${log.id.slice(0,8)}... | Start: ${log.start_time} | Status: ${log.status} | User: ${log.user_id?.slice(0,8)}...`);
      });
    } else {
      console.log('  No logs found.');
    }
    
    // Check today's logs specifically
    const today = new Date().toISOString().split('T')[0];
    const { data: todayLogs } = await supabase
      .from('time_logs')
      .select('*')
      .gte('start_time', today + 'T00:00:00.000Z')
      .order('start_time', { ascending: false });
    
    console.log(`🗓️ Today's logs (${today}):`, todayLogs?.length || 0);
    if (todayLogs && todayLogs.length > 0) {
      todayLogs.forEach((log, i) => {
        console.log(`  ${i+1}. Start: ${log.start_time} | Status: ${log.status}`);
      });
    } else {
      console.log('  ❌ No logs found for today - this confirms the issue!');
    }
    
    // Also check the current timestamp
    console.log('⏰ Current time:', new Date().toISOString());
    console.log('🌍 Today date filter:', today + 'T00:00:00.000Z');
    
  } catch (err) {
    console.error('💥 Error:', err);
  }
}

checkDatabase(); 