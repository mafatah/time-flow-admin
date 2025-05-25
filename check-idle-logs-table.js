import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fkpiqcxkmrtaetvfgcli.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCreateIdleLogsTable() {
  try {
    console.log('🔍 Checking if idle_logs table exists...');
    
    // Try to query the table to see if it exists
    const { data, error } = await supabase
      .from('idle_logs')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('relation "public.idle_logs" does not exist')) {
      console.log('❌ idle_logs table does not exist');
      console.log('📝 Creating idle_logs table...');
      
      // Create the table using SQL
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS idle_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            time_log_id UUID REFERENCES time_logs(id) ON DELETE CASCADE,
            idle_start TIMESTAMPTZ NOT NULL,
            idle_end TIMESTAMPTZ,
            duration_seconds INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Enable RLS
          ALTER TABLE idle_logs ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Users can view own idle logs" ON idle_logs
            FOR SELECT USING (auth.uid() = user_id);
          
          CREATE POLICY "Users can insert own idle logs" ON idle_logs
            FOR INSERT WITH CHECK (auth.uid() = user_id);
          
          CREATE POLICY "Admins can view all idle logs" ON idle_logs
            FOR SELECT USING (
              EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'manager')
              )
            );
          
          CREATE POLICY "Service role can manage idle logs" ON idle_logs
            FOR ALL USING (auth.role() = 'service_role');
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_idle_logs_user_date ON idle_logs(user_id, idle_start);
        `
      });
      
      if (createError) {
        console.error('❌ Error creating table:', createError);
        return false;
      }
      
      console.log('✅ idle_logs table created successfully');
      return true;
    } else if (error) {
      console.error('❌ Error checking table:', error);
      return false;
    } else {
      console.log('✅ idle_logs table already exists');
      return true;
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function testIdleLogsTable() {
  try {
    console.log('🧪 Testing idle_logs table access...');
    
    const { data, error } = await supabase
      .from('idle_logs')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error accessing idle_logs:', error);
      return false;
    }
    
    console.log(`✅ Successfully accessed idle_logs table (${data?.length || 0} records found)`);
    return true;
  } catch (error) {
    console.error('❌ Error testing table:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting idle_logs table check...');
  
  const tableExists = await checkAndCreateIdleLogsTable();
  if (!tableExists) {
    console.log('❌ Failed to ensure idle_logs table exists');
    process.exit(1);
  }
  
  const testPassed = await testIdleLogsTable();
  if (!testPassed) {
    console.log('❌ Failed to access idle_logs table');
    process.exit(1);
  }
  
  console.log('🎉 idle_logs table is ready!');
  console.log('💡 You can now re-enable the idle_logs queries in the employee dashboard');
}

main().catch(console.error); 