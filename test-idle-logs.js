import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fkpiqcxkmrtaetvfgcli.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testIdleLogs() {
  console.log('🧪 Testing idle_logs table...');
  
  try {
    // Test 1: Try to select from idle_logs
    console.log('1. Testing SELECT from idle_logs...');
    const { data, error } = await supabase
      .from('idle_logs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('📝 Table does not exist');
        return false;
      }
    } else {
      console.log('✅ Table exists! Sample data:', data);
      return true;
    }
  } catch (err) {
    console.log('❌ Unexpected error:', err);
  }
  
  // Test 2: Try to insert a test record
  console.log('2. Testing INSERT into idle_logs...');
  try {
    const testRecord = {
      user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      idle_start: new Date().toISOString(),
      idle_end: new Date().toISOString(),
      duration_seconds: 60
    };
    
    const { data, error } = await supabase
      .from('idle_logs')
      .insert(testRecord)
      .select();
    
    if (error) {
      console.log('❌ Insert error:', error.message);
      
      // Check if it's a schema issue
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('🔍 Schema mismatch detected');
        
        // Try with duration_minutes instead
        console.log('3. Testing with duration_minutes...');
        const testRecord2 = {
          user_id: '00000000-0000-0000-0000-000000000000',
          idle_start: new Date().toISOString(),
          idle_end: new Date().toISOString(),
          duration_minutes: 1
        };
        
        const { data: data2, error: error2 } = await supabase
          .from('idle_logs')
          .insert(testRecord2)
          .select();
        
        if (error2) {
          console.log('❌ Still error with duration_minutes:', error2.message);
        } else {
          console.log('✅ Success with duration_minutes! Schema uses duration_minutes, not duration_seconds');
          
          // Clean up test record
          if (data2 && data2[0]) {
            await supabase.from('idle_logs').delete().eq('id', data2[0].id);
            console.log('🧹 Cleaned up test record');
          }
          return 'duration_minutes';
        }
      }
    } else {
      console.log('✅ Insert successful with duration_seconds!');
      
      // Clean up test record
      if (data && data[0]) {
        await supabase.from('idle_logs').delete().eq('id', data[0].id);
        console.log('🧹 Cleaned up test record');
      }
      return 'duration_seconds';
    }
  } catch (err) {
    console.log('❌ Insert test error:', err);
  }
  
  return false;
}

async function main() {
  const result = await testIdleLogs();
  
  if (result === 'duration_minutes') {
    console.log('🎯 SOLUTION: Update your code to use duration_minutes instead of duration_seconds');
  } else if (result === 'duration_seconds') {
    console.log('🎯 SOLUTION: Your code is correct, table uses duration_seconds');
  } else if (result === true) {
    console.log('🎯 Table exists but couldn\'t determine schema');
  } else {
    console.log('🎯 Table does not exist or is inaccessible');
  }
}

main().catch(console.error); 