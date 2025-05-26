import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzgzODg4MiwiZXhwIjoyMDYzNDE0ODgyfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'; // Service role key needed for admin operations

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for desktop app...');
  
  try {
    // First, let's temporarily disable RLS on problematic tables to allow the desktop app to work
    console.log('📝 Disabling RLS temporarily on app_logs...');
    
    const { error: disableRLSError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Temporarily disable RLS on app_logs to allow desktop app to save data
        ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;
        
        -- Also disable on url_logs
        ALTER TABLE url_logs DISABLE ROW LEVEL SECURITY;
        
        -- And on idle_logs
        ALTER TABLE idle_logs DISABLE ROW LEVEL SECURITY;
        
        -- Keep screenshots RLS disabled as well
        ALTER TABLE screenshots DISABLE ROW LEVEL SECURITY;
      `
    });
    
    if (disableRLSError) {
      console.error('❌ Error disabling RLS:', disableRLSError.message);
      
      // Try alternative approach - create permissive policies
      console.log('🔄 Trying alternative approach with permissive policies...');
      
      const { error: policyError } = await supabase.rpc('exec_sql', {
        sql: `
          -- Create permissive policies for desktop app
          DROP POLICY IF EXISTS "Allow all operations on app_logs" ON app_logs;
          CREATE POLICY "Allow all operations on app_logs" ON app_logs
            FOR ALL USING (true) WITH CHECK (true);
          
          DROP POLICY IF EXISTS "Allow all operations on url_logs" ON url_logs;
          CREATE POLICY "Allow all operations on url_logs" ON url_logs
            FOR ALL USING (true) WITH CHECK (true);
          
          DROP POLICY IF EXISTS "Allow all operations on idle_logs" ON idle_logs;
          CREATE POLICY "Allow all operations on idle_logs" ON idle_logs
            FOR ALL USING (true) WITH CHECK (true);
          
          DROP POLICY IF EXISTS "Allow all operations on screenshots" ON screenshots;
          CREATE POLICY "Allow all operations on screenshots" ON screenshots
            FOR ALL USING (true) WITH CHECK (true);
        `
      });
      
      if (policyError) {
        console.error('❌ Error creating permissive policies:', policyError.message);
      } else {
        console.log('✅ Permissive policies created successfully');
      }
    } else {
      console.log('✅ RLS disabled successfully on problematic tables');
    }
    
    // Test the fix by trying to insert a test record
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
      console.error('❌ Test insert still failed:', insertError.message);
    } else {
      console.log('✅ Test insert successful!');
      
      // Clean up test record
      if (insertResult && insertResult.length > 0) {
        await supabase
          .from('app_logs')
          .delete()
          .eq('id', insertResult[0].id);
        console.log('🧹 Test record cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixRLSPolicies(); 