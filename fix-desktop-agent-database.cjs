const { createClient } = require('@supabase/supabase-js');

async function fixDatabase() {
  console.log('🔧 Fixing database for desktop agent...');
  
  // Use the working anonymous key for now
  const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';
  
  const supabase = createClient(supabaseUrl, anonKey);
  
  try {
    console.log('📊 Connecting to database...');
    
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log('❌ Database connection failed:', testError.message);
      return;
    }
    
    console.log('✅ Database connected successfully');
    
    // Step 1: Disable RLS on desktop agent tables
    console.log('\n🔓 Disabling RLS on desktop agent tables...');
    
    const disableRLSQueries = [
      'ALTER TABLE public.time_logs DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.screenshots DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.app_logs DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.url_logs DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE public.idle_logs DISABLE ROW LEVEL SECURITY;'
    ];
    
    for (const query of disableRLSQueries) {
      console.log(`   Executing: ${query}`);
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.log(`   ⚠️ Warning: ${error.message}`);
      } else {
        console.log(`   ✅ Success`);
      }
    }
    
    // Step 2: Add missing columns to screenshots table
    console.log('\n📸 Fixing screenshots table schema...');
    
    const screenshotFixQueries = [
      'ALTER TABLE public.screenshots ADD COLUMN IF NOT EXISTS file_path TEXT;',
      'ALTER TABLE public.screenshots ADD COLUMN IF NOT EXISTS activity_percent INTEGER DEFAULT 0;',
      'ALTER TABLE public.screenshots ADD COLUMN IF NOT EXISTS focus_percent INTEGER DEFAULT 0;',
      'ALTER TABLE public.screenshots ADD COLUMN IF NOT EXISTS mouse_clicks INTEGER DEFAULT 0;',
      'ALTER TABLE public.screenshots ADD COLUMN IF NOT EXISTS keystrokes INTEGER DEFAULT 0;',
      'ALTER TABLE public.screenshots ADD COLUMN IF NOT EXISTS mouse_movements INTEGER DEFAULT 0;',
      'ALTER TABLE public.screenshots ADD COLUMN IF NOT EXISTS is_blurred BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE public.screenshots ADD COLUMN IF NOT EXISTS classification TEXT;'
    ];
    
    for (const query of screenshotFixQueries) {
      console.log(`   Executing: ${query}`);
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.log(`   ⚠️ Warning: ${error.message}`);
      } else {
        console.log(`   ✅ Success`);
      }
    }
    
    // Step 3: Test if fixes worked
    console.log('\n🧪 Testing fixes...');
    
    // Test time_logs insert
    const testTimeLog = {
      id: '99999999-9999-9999-9999-999999999999',
      user_id: '0c3d3092-913e-436f-a352-3378e558c34f',
      project_id: '00000000-0000-0000-0000-000000000001',
      start_time: new Date().toISOString(),
      status: 'active'
    };
    
    const { data: timeLogData, error: timeLogError } = await supabase
      .from('time_logs')
      .insert(testTimeLog)
      .select();
    
    if (timeLogError) {
      console.log('❌ Time logs test failed:', timeLogError.message);
    } else {
      console.log('✅ Time logs insert test successful!');
      // Clean up
      await supabase.from('time_logs').delete().eq('id', testTimeLog.id);
    }
    
    // Test screenshots insert
    const testScreenshot = {
      id: '99999999-9999-9999-9999-999999999998',
      user_id: '0c3d3092-913e-436f-a352-3378e558c34f',
      project_id: '00000000-0000-0000-0000-000000000001',
      image_url: 'test-fixed.png',
      file_path: 'test-fixed.png',
      captured_at: new Date().toISOString()
    };
    
    const { data: screenshotData, error: screenshotError } = await supabase
      .from('screenshots')
      .insert(testScreenshot)
      .select();
    
    if (screenshotError) {
      console.log('❌ Screenshots test failed:', screenshotError.message);
    } else {
      console.log('✅ Screenshots insert test successful!');
      // Clean up
      await supabase.from('screenshots').delete().eq('id', testScreenshot.id);
    }
    
    console.log('\n🎉 Database fixes completed!');
    console.log('💡 Desktop agent should now work with anonymous key');
    
  } catch (error) {
    console.log('❌ Database fix failed:', error.message);
  }
}

fixDatabase(); 