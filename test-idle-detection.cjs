require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'process.env.VITE_SUPABASE_URL';
const supabaseKey = 'process.env.VITE_SUPABASE_ANON_KEY';


// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestIdleLogs() {
  console.log('🧪 Creating test idle logs...');
  
  const employeeUserId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
  const now = new Date();
  
  // Create some idle periods for testing
  const idleLogs = [
    {
      user_id: employeeUserId,
      idle_start: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      idle_end: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),   // 25 minutes ago
      duration_seconds: 5 * 60 // 5 minutes
    },
    {
      user_id: employeeUserId,
      idle_start: new Date(now.getTime() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
      idle_end: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),   // 15 minutes ago
      duration_seconds: 5 * 60 // 5 minutes
    },
    {
      user_id: employeeUserId,
      idle_start: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      idle_end: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),    // 5 minutes ago
      duration_seconds: 5 * 60 // 5 minutes
    }
  ];
  
  try {
    const { data, error } = await supabase
      .from('idle_logs')
      .insert(idleLogs)
      .select();
    
    if (error) {
      console.error('❌ Error creating idle logs:', error);
      return;
    }
    
    console.log('✅ Created idle logs:', data.length);
    console.log('📊 Idle logs details:');
    data.forEach((log, index) => {
      const duration = Math.round(log.duration_seconds / 60);
      console.log(`   ${index + 1}. ${duration} minutes idle from ${new Date(log.idle_start).toLocaleTimeString()} to ${new Date(log.idle_end).toLocaleTimeString()}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to create idle logs:', error);
  }
}

async function checkIdleLogs() {
  console.log('\n🔍 Checking existing idle logs...');
  
  const employeeUserId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
  
  try {
    const { data, error } = await supabase
      .from('idle_logs')
      .select('*')
      .eq('user_id', employeeUserId)
      .order('idle_start', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching idle logs:', error);
      return;
    }
    
    console.log(`📋 Found ${data.length} idle logs for employee:`);
    data.forEach((log, index) => {
      const duration = Math.round(log.duration_seconds / 60);
      console.log(`   ${index + 1}. ${duration} minutes idle from ${new Date(log.idle_start).toLocaleTimeString()} to ${new Date(log.idle_end).toLocaleTimeString()}`);
    });
    
    if (data.length === 0) {
      console.log('⚠️ No idle logs found. Creating test data...');
      await createTestIdleLogs();
    }
    
  } catch (error) {
    console.error('❌ Failed to check idle logs:', error);
  }
}

async function main() {
  console.log('🚀 Testing idle time detection...');
  await checkIdleLogs();
  console.log('\n✅ Idle time test completed!');
}

main().catch(console.error); 