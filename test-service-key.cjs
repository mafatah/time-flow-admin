require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testServiceKey() {
  console.log('🔍 Testing service role key...');
  
  // Read service role key from desktop-agent .env
  const envContent = fs.readFileSync('desktop-agent/.env', 'utf8');
  let serviceKey = '';
  
  envContent.split('\n').forEach(line => {
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      serviceKey = line.split('=')[1];
    }
  });
  
  if (!serviceKey) {
    console.log('❌ No service role key found in desktop-agent/.env');
    return;
  }
  
  console.log(`📋 Service key length: ${serviceKey.length}`);
  console.log(`📋 Service key starts with: ${serviceKey.substring(0, 50)}...`);
  
  // Test connection
  const supabaseUrl = 'process.env.VITE_SUPABASE_URL';
  
// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
  
  try {
    // Test simple query
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Service key connection failed:', error.message);
    } else {
      console.log('✅ Service key connection successful!');
      console.log(`📊 Test query returned ${data ? data.length : 0} results`);
    }
    
    // Test time_logs insert (what's failing)
    const testTimeLog = {
      id: '12345678-1234-1234-1234-123456789012',
      user_id: '0c3d3092-913e-436f-a352-3378e558c34f',
      project_id: '00000000-0000-0000-0000-000000000001',
      start_time: new Date().toISOString(),
      status: 'active'
    };
    
    console.log('\n🧪 Testing time_logs insert...');
    const { data: insertData, error: insertError } = await supabase
      .from('time_logs')
      .insert(testTimeLog)
      .select();
    
    if (insertError) {
      console.log('❌ Time logs insert failed:', insertError.message);
      console.log('💡 This explains why desktop agent is failing');
    } else {
      console.log('✅ Time logs insert successful!');
      // Clean up test record
      await supabase.from('time_logs').delete().eq('id', testTimeLog.id);
    }
    
  } catch (error) {
    console.log('❌ Service key test failed:', error.message);
  }
}

testServiceKey(); 