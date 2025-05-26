import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixRLSIssues() {
  console.log('🔧 Attempting to fix RLS issues...');
  
  try {
    // Sign in as admin first
    console.log('🔐 Signing in as admin...');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@timeflow.com',
      password: 'admin123456'
    });
    
    if (authError) {
      console.error('❌ Failed to sign in as admin:', authError.message);
      return;
    }
    
    console.log('✅ Signed in as admin');
    
    // Test app_logs insert
    console.log('🧪 Testing app_logs insert...');
    
    const testAppLog = {
      user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
      app_name: 'Test App',
      window_title: 'Test Window',
      started_at: new Date().toISOString(),
      duration_seconds: 10
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('app_logs')
      .insert(testAppLog)
      .select();
    
    if (insertError) {
      console.error('❌ App logs insert failed:', insertError.message);
      console.log('');
      console.log('🚨 MANUAL FIX REQUIRED:');
      console.log('   Go to Supabase Dashboard > Database > Tables');
      console.log('   For each table (app_logs, url_logs, idle_logs, screenshots):');
      console.log('   1. Click on the table');
      console.log('   2. Go to "RLS" tab');
      console.log('   3. Click "Disable RLS" button');
      console.log('   OR run this SQL in the SQL Editor:');
      console.log('');
      console.log('   ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;');
      console.log('   ALTER TABLE url_logs DISABLE ROW LEVEL SECURITY;');
      console.log('   ALTER TABLE idle_logs DISABLE ROW LEVEL SECURITY;');
      console.log('   ALTER TABLE screenshots DISABLE ROW LEVEL SECURITY;');
      console.log('');
    } else {
      console.log('✅ App logs insert successful!');
      
      // Clean up test record
      if (insertResult && insertResult.length > 0) {
        await supabase
          .from('app_logs')
          .delete()
          .eq('id', insertResult[0].id);
        console.log('🧹 Test record cleaned up');
      }
    }
    
    // Test url_logs insert
    console.log('🧪 Testing url_logs insert...');
    
    const testUrlLog = {
      user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
      url: 'https://test.com',
      title: 'Test Page',
      domain: 'test.com',
      browser: 'Chrome',
      timestamp: new Date().toISOString()
    };
    
    const { data: urlResult, error: urlError } = await supabase
      .from('url_logs')
      .insert(testUrlLog)
      .select();
    
    if (urlError) {
      console.error('❌ URL logs insert failed:', urlError.message);
    } else {
      console.log('✅ URL logs insert successful!');
      
      // Clean up test record
      if (urlResult && urlResult.length > 0) {
        await supabase
          .from('url_logs')
          .delete()
          .eq('id', urlResult[0].id);
        console.log('🧹 URL test record cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixRLSIssues(); 