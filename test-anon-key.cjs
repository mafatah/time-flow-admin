require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testAnonKey() {
  console.log('🔍 Testing anonymous key for time_logs access...');
  
  // Use the working anonymous key
  const supabaseUrl = 'process.env.VITE_SUPABASE_URL';
  const anonKey = 'process.env.VITE_SUPABASE_ANON_KEY';
  
  
// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);
  
  try {
    // Test simple query first
    console.log('📊 Testing basic connection...');
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Basic connection failed:', error.message);
      return;
    } else {
      console.log('✅ Basic connection successful!');
    }
    
    // Test time_logs insert (what's failing in desktop agent)
    const testTimeLog = {
      id: '87654321-4321-4321-4321-210987654321',
      user_id: '0c3d3092-913e-436f-a352-3378e558c34f',
      project_id: '00000000-0000-0000-0000-000000000001',
      start_time: new Date().toISOString(),
      status: 'active'
    };
    
    console.log('\n🧪 Testing time_logs insert with anonymous key...');
    const { data: insertData, error: insertError } = await supabase
      .from('time_logs')
      .insert(testTimeLog)
      .select();
    
    if (insertError) {
      console.log('❌ Time logs insert failed:', insertError.message);
      console.log('💡 RLS is probably still enabled on time_logs table');
    } else {
      console.log('✅ Time logs insert successful with anonymous key!');
      console.log('💡 This means RLS is properly disabled');
      // Clean up test record
      await supabase.from('time_logs').delete().eq('id', testTimeLog.id);
      console.log('🧹 Cleaned up test record');
    }
    
    // Test screenshots table too
    console.log('\n📸 Testing screenshots table...');
    const testScreenshot = {
      id: '87654321-4321-4321-4321-210987654322',
      user_id: '0c3d3092-913e-436f-a352-3378e558c34f',
      project_id: '00000000-0000-0000-0000-000000000001',
      image_url: 'test-image.png',
      file_path: 'test-image.png',
      captured_at: new Date().toISOString()
    };
    
    const { data: screenshotData, error: screenshotError } = await supabase
      .from('screenshots')
      .insert(testScreenshot)
      .select();
    
    if (screenshotError) {
      console.log('❌ Screenshots insert failed:', screenshotError.message);
    } else {
      console.log('✅ Screenshots insert successful!');
      // Clean up
      await supabase.from('screenshots').delete().eq('id', testScreenshot.id);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testAnonKey(); 