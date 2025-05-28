import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = ''; // Replace with your service role key

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('🚀 Setting up idle logs functionality in remote Supabase...\n');

async function checkAndCreateIdleLogsTable() {
  console.log('📊 Checking if idle_logs table exists...');
  
  try {
    // Try to query the table to see if it exists
    const { data, error } = await supabase
      .from('idle_logs')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('❌ idle_logs table does not exist');
      console.log('\n📋 SQL needed to create the table in Supabase Studio:');
      console.log('=' .repeat(60));
      console.log(`
-- Create idle_logs table
CREATE TABLE IF NOT EXISTS public.idle_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    project_id UUID,
    idle_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    idle_end TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for consistency with other tables
ALTER TABLE public.idle_logs DISABLE ROW LEVEL SECURITY;

-- Create permissive policy
CREATE POLICY "Allow all idle_logs operations" ON public.idle_logs
FOR ALL USING (true) WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_idle_logs_user_id ON public.idle_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_idle_logs_start_time ON public.idle_logs(idle_start);
      `);
      console.log('=' .repeat(60));
      return false;
    } else if (error) {
      console.log('❌ Unexpected error checking table:', error);
      return false;
    } else {
      console.log('✅ idle_logs table already exists!');
      return true;
    }
  } catch (error) {
    console.log('❌ Failed to check table:', error);
    return false;
  }
}

async function fixUrlLogsConstraint() {
  console.log('\n🔧 Checking URL logs constraint issue...');
  
  try {
    // Check if url_logs table has the problematic constraint
    const { data, error } = await supabase
      .from('url_logs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ URL logs table issue:', error.message);
      console.log('\n📋 SQL to fix URL logs constraint in Supabase Studio:');
      console.log('=' .repeat(60));
      console.log(`
-- Fix URL logs constraint issue
-- First, check what constraints exist
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.url_logs'::regclass;

-- If there's a category check constraint causing issues, drop it
-- ALTER TABLE public.url_logs DROP CONSTRAINT IF EXISTS url_logs_category_check;

-- Or modify the constraint to be more permissive
-- ALTER TABLE public.url_logs DROP CONSTRAINT IF EXISTS url_logs_category_check;
-- ALTER TABLE public.url_logs ADD CONSTRAINT url_logs_category_check 
--   CHECK (category IS NULL OR category IN ('work', 'social', 'entertainment', 'development', 'other'));
      `);
      console.log('=' .repeat(60));
    } else {
      console.log('✅ URL logs table accessible');
    }
  } catch (error) {
    console.log('❌ Error checking URL logs:', error);
  }
}

async function testIdleFunctionality() {
  console.log('\n🧪 Testing idle functionality...');
  
  const userId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
  const projectId = '00000000-0000-0000-0000-000000000001';
  
  try {
    // Check if idle_logs table is accessible
    const { data: tableCheck, error: tableError } = await supabase
      .from('idle_logs')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Cannot access idle_logs table:', tableError.message);
      console.log('📝 Using screenshots table for idle simulation instead...');
      
      // Create test idle data in screenshots table
      const now = new Date();
      const testIdleData = {
        user_id: userId,
        project_id: projectId,
        image_url: `idle_test_${Date.now()}.png`,
        captured_at: now.toISOString(),
        activity_percent: 0, // 0% indicates idle
        classification: 'idle_test'
      };
      
      const { data: screenshotData, error: screenshotError } = await supabase
        .from('screenshots')
        .insert(testIdleData)
        .select();
      
      if (screenshotError) {
        console.log('❌ Failed to create test idle data:', screenshotError.message);
      } else {
        console.log('✅ Created test idle data in screenshots table');
        console.log('📊 Test entry:', {
          id: screenshotData[0].id,
          activity_percent: screenshotData[0].activity_percent,
          classification: screenshotData[0].classification
        });
      }
    } else {
      console.log('✅ idle_logs table is accessible');
      
      // Create test idle log entry
      const now = new Date();
      const idleStart = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
      
      const testIdleLog = {
        user_id: userId,
        project_id: projectId,
        idle_start: idleStart.toISOString(),
        idle_end: now.toISOString(),
        duration_minutes: 5
      };
      
      const { data: idleData, error: idleError } = await supabase
        .from('idle_logs')
        .insert(testIdleLog)
        .select();
      
      if (idleError) {
        console.log('❌ Failed to create test idle log:', idleError.message);
      } else {
        console.log('✅ Created test idle log entry');
        console.log('📊 Test entry:', {
          id: idleData[0].id,
          duration_minutes: idleData[0].duration_minutes,
          idle_start: idleData[0].idle_start
        });
      }
    }
  } catch (error) {
    console.log('❌ Error testing idle functionality:', error);
  }
}

async function checkCurrentData() {
  console.log('\n📈 Checking current activity data...');
  
  try {
    // Check recent screenshots
    const { data: screenshots, error: screenshotError } = await supabase
      .from('screenshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (screenshotError) {
      console.log('❌ Error fetching screenshots:', screenshotError.message);
    } else {
      console.log(`📸 Found ${screenshots.length} recent screenshots`);
      screenshots.forEach((s, i) => {
        const time = new Date(s.created_at).toLocaleTimeString();
        const activity = s.activity_percent || 'N/A';
        console.log(`   ${i + 1}. ${time} - Activity: ${activity}%`);
      });
    }
    
    // Check recent app logs
    const { data: appLogs, error: appError } = await supabase
      .from('app_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (appError) {
      console.log('❌ Error fetching app logs:', appError.message);
    } else {
      console.log(`📱 Found ${appLogs.length} recent app logs`);
      appLogs.forEach((a, i) => {
        const time = new Date(a.created_at).toLocaleTimeString();
        console.log(`   ${i + 1}. ${time} - ${a.app_name}`);
      });
    }
  } catch (error) {
    console.log('❌ Error checking current data:', error);
  }
}

async function applyDatabaseFixes() {
  console.log('🔧 Applying database constraint fixes...');
  console.log('⚠️  Note: DDL operations need to be done manually in Supabase Studio');
  
  // Test current constraint issues
  console.log('\n🧪 Testing current constraint issues...');
  
  const tests = [
    {
      name: 'URL logs with development category',
      test: async () => {
        const { error } = await supabase
          .from('url_logs')
          .insert({
            user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
            site_url: 'https://test-development.com',
            category: 'development'
          });
        
        if (!error) {
          // Clean up
          await supabase
            .from('url_logs')
            .delete()
            .eq('site_url', 'https://test-development.com');
        }
        
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'URL logs with research category',
      test: async () => {
        const { error } = await supabase
          .from('url_logs')
          .insert({
            user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
            site_url: 'https://test-research.com',
            category: 'research'
          });
        
        if (!error) {
          // Clean up
          await supabase
            .from('url_logs')
            .delete()
            .eq('site_url', 'https://test-research.com');
        }
        
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'Screenshot with productive classification',
      test: async () => {
        const { error } = await supabase
          .from('screenshots')
          .insert({
            user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
            project_id: '00000000-0000-0000-0000-000000000001',
            image_url: 'https://test-productive.png',
            classification: 'productive',
            activity_percent: 50,
            focus_percent: 50
          });
        
        if (!error) {
          // Clean up
          await supabase
            .from('screenshots')
            .delete()
            .eq('image_url', 'https://test-productive.png');
        }
        
        return { success: !error, error: error?.message };
      }
    },
    {
      name: 'Unusual activity insert',
      test: async () => {
        const { error } = await supabase
          .from('unusual_activity')
          .insert({
            user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
            rule_triggered: 'test_rule',
            confidence: 85.5,
            notes: 'Testing constraint'
          });
        
        if (!error) {
          // Clean up
          await supabase
            .from('unusual_activity')
            .delete()
            .eq('notes', 'Testing constraint');
        }
        
        return { success: !error, error: error?.message };
      }
    }
  ];
  
  for (const test of tests) {
    try {
      const result = await test.test();
      console.log(`   ${result.success ? '✅' : '❌'} ${test.name}`);
      if (!result.success) {
        console.log(`      Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
    }
  }
  
  console.log('\n📋 Manual SQL commands needed in Supabase Studio:');
  console.log('─'.repeat(60));
  console.log('Copy and paste this SQL in Supabase Studio > SQL Editor:');
  console.log('');
  console.log('-- Fix all database constraint issues');
  console.log('-- Run this entire block in Supabase Studio SQL Editor');
  console.log('');
  console.log('-- 1. Fix URL logs category constraint');
  console.log('ALTER TABLE public.url_logs DROP CONSTRAINT IF EXISTS url_logs_category_check;');
  console.log('ALTER TABLE public.url_logs ADD CONSTRAINT url_logs_category_check');
  console.log("CHECK (category IN ('development', 'entertainment', 'social', 'research', 'other', 'communication', 'system'));");
  console.log('');
  console.log('-- 2. Fix unusual activity RLS policy');
  console.log('ALTER TABLE public.unusual_activity DISABLE ROW LEVEL SECURITY;');
  console.log('DROP POLICY IF EXISTS "Allow all unusual_activity operations" ON public.unusual_activity;');
  console.log('CREATE POLICY "Allow all unusual_activity operations" ON public.unusual_activity');
  console.log('FOR ALL USING (true) WITH CHECK (true);');
  console.log('');
  console.log('-- 3. Fix unusual activity confidence constraint');
  console.log('ALTER TABLE public.unusual_activity DROP CONSTRAINT IF EXISTS unusual_activity_confidence_check;');
  console.log('ALTER TABLE public.unusual_activity ADD CONSTRAINT unusual_activity_confidence_check');
  console.log('CHECK (confidence IS NULL OR (confidence >= 0.00 AND confidence <= 100.00));');
  console.log('');
  console.log('-- 4. Fix screenshots classification constraint');
  console.log('ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS screenshots_classification_check;');
  console.log('ALTER TABLE public.screenshots ADD CONSTRAINT screenshots_classification_check');
  console.log("CHECK (classification IS NULL OR classification IN ('core', 'non_core', 'unproductive', 'productive', 'neutral', 'distracting', 'idle_test'));");
  console.log('');
  console.log('-- 5. Test the fixes');
  console.log("INSERT INTO public.url_logs (user_id, site_url, category) VALUES ('189a8371-8aaf-4551-9b33-8fed7f4cee5d', 'https://test.com', 'development');");
  console.log("INSERT INTO public.screenshots (user_id, project_id, image_url, classification) VALUES ('189a8371-8aaf-4551-9b33-8fed7f4cee5d', '00000000-0000-0000-0000-000000000001', 'https://test.png', 'productive');");
  console.log('');
  console.log('-- Clean up test data');
  console.log("DELETE FROM public.url_logs WHERE site_url = 'https://test.com';");
  console.log("DELETE FROM public.screenshots WHERE image_url = 'https://test.png';");
  console.log('');
  console.log('─'.repeat(60));
  console.log('');
  console.log('📍 To apply these fixes:');
  console.log('1. Go to https://supabase.com/dashboard/project/fkpiqcxkmrtaetvfgcli');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the SQL commands above');
  console.log('4. Click "Run" to execute');
  console.log('5. Re-run this script to verify the fixes worked');
}

// Main execution
async function main() {
  console.log('🎯 Starting idle logs setup...\n');
  
  // Step 1: Check and create idle_logs table
  const tableExists = await checkAndCreateIdleLogsTable();
  
  // Step 2: Fix URL logs constraint
  await fixUrlLogsConstraint();
  
  // Step 3: Test idle functionality
  await testIdleFunctionality();
  
  // Step 4: Check current data
  await checkCurrentData();
  
  // Step 5: Apply database fixes
  await applyDatabaseFixes();
  
  console.log('\n🎉 Setup process complete!');
  console.log('\n📋 Next steps:');
  
  if (!tableExists) {
    console.log('1. 🔧 Copy the SQL above and run it in Supabase Studio SQL Editor');
    console.log('2. 🔄 Run this script again to test the idle_logs table');
  } else {
    console.log('1. ✅ idle_logs table is ready');
  }
  
  console.log('3. 🖥️  Desktop agent should now be able to log idle time');
  console.log('4. 🌐 Web interface at http://localhost:8080/employee/idle-time should work');
  console.log('5. 🧪 Use the manual test buttons in the UI to verify functionality');
  
  console.log('\n🔗 Supabase Studio: https://supabase.com/dashboard/project/fkpiqcxkmrtaetvfgcli');
}

main().catch(console.error); 