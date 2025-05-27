import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fkpiqcxkmrtaetvfgcli.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🚀 Creating idle_logs table...\n');

async function createIdleLogsTable() {
  try {
    // First, let's create a simple idle_logs table that matches the desktop agent expectations
    const { data, error } = await supabase
      .from('idle_logs')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('📊 Table does not exist, but we cannot create it via API');
      console.log('⚠️  The idle_logs table needs to be created through Supabase Studio or database migration');
      console.log('\n📋 SQL to create the table:');
      console.log(`
CREATE TABLE public.idle_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    project_id UUID,
    idle_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    idle_end TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for testing
ALTER TABLE public.idle_logs DISABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_idle_logs_user_id ON public.idle_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_idle_logs_start_time ON public.idle_logs(idle_start);
      `);
      
      console.log('\n💡 For now, let\'s create a simple workaround by using an existing table');
      console.log('   We can simulate idle logging using the screenshots table metadata');
      
      return false;
    } else if (error) {
      console.log('❌ Unexpected error:', error);
      return false;
    } else {
      console.log('✅ idle_logs table already exists!');
      return true;
    }
  } catch (error) {
    console.log('❌ Failed to check/create table:', error);
    return false;
  }
}

async function createTestIdleData() {
  console.log('\n🧪 Creating test idle data in screenshots table...');
  
  try {
    // Let's simulate idle time data by creating some test entries
    const now = new Date();
    const userId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
    const projectId = '00000000-0000-0000-0000-000000000001';
    
    // Create some test screenshots with idle-like data
    const testScreenshots = [
      {
        user_id: userId,
        project_id: projectId,
        image_url: 'idle_test_1.png',
        captured_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 min ago
        activity_percent: 0, // 0% activity indicates idle
        classification: 'idle'
      },
      {
        user_id: userId,
        project_id: projectId,
        image_url: 'idle_test_2.png',
        captured_at: new Date(now.getTime() - 25 * 60 * 1000).toISOString(), // 25 min ago
        activity_percent: 0,
        classification: 'idle'
      },
      {
        user_id: userId,
        project_id: projectId,
        image_url: 'active_test.png',
        captured_at: new Date(now.getTime() - 20 * 60 * 1000).toISOString(), // 20 min ago
        activity_percent: 85,
        classification: 'productive'
      }
    ];
    
    const { data, error } = await supabase
      .from('screenshots')
      .insert(testScreenshots)
      .select();
    
    if (error) {
      console.log('❌ Failed to create test data:', error.message);
    } else {
      console.log(`✅ Created ${data.length} test entries for idle simulation`);
      console.log('📊 Test data includes:');
      data.forEach((entry, i) => {
        const time = new Date(entry.captured_at).toLocaleTimeString();
        const status = entry.activity_percent === 0 ? '💤 Idle' : '✅ Active';
        console.log(`   ${i + 1}. ${time} - ${status} (${entry.activity_percent}% activity)`);
      });
    }
  } catch (error) {
    console.log('❌ Error creating test data:', error);
  }
}

// Run the functions
const tableExists = await createIdleLogsTable();

if (!tableExists) {
  console.log('\n🔄 Creating simulated idle data for testing...');
  await createTestIdleData();
}

console.log('\n🎯 Next steps:');
console.log('1. Create idle_logs table in Supabase Studio using the SQL above');
console.log('2. Or use the simulated data in screenshots table for testing');
console.log('3. Add manual test button to the UI');
console.log('\n✅ Setup complete!'); 