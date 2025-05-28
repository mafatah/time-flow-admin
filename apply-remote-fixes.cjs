const { createClient } = require('@supabase/supabase-js');

// Note: You'll need the SERVICE_ROLE key for admin operations, not the anon key
const SUPABASE_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'; // Replace with actual service role key

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyDatabaseFixes() {
  console.log('🔧 Applying database constraint fixes remotely...');
  console.log('⚠️  Note: This requires the SERVICE_ROLE key, not the anon key');
  
  const fixes = [
    {
      name: 'URL Logs Category Constraint',
      sql: `
        ALTER TABLE public.url_logs DROP CONSTRAINT IF EXISTS url_logs_category_check;
        ALTER TABLE public.url_logs ADD CONSTRAINT url_logs_category_check 
        CHECK (category IN ('development', 'entertainment', 'social', 'research', 'other', 'communication', 'system'));
      `
    },
    {
      name: 'Unusual Activity RLS Policy',
      sql: `
        ALTER TABLE public.unusual_activity DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all unusual_activity operations" ON public.unusual_activity;
        CREATE POLICY "Allow all unusual_activity operations" ON public.unusual_activity
        FOR ALL USING (true) WITH CHECK (true);
      `
    },
    {
      name: 'Unusual Activity Confidence Constraint',
      sql: `
        ALTER TABLE public.unusual_activity DROP CONSTRAINT IF EXISTS unusual_activity_confidence_check;
        ALTER TABLE public.unusual_activity ADD CONSTRAINT unusual_activity_confidence_check 
        CHECK (confidence IS NULL OR (confidence >= 0.00 AND confidence <= 100.00));
      `
    },
    {
      name: 'Screenshots Classification Constraint',
      sql: `
        ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS screenshots_classification_check;
        ALTER TABLE public.screenshots ADD CONSTRAINT screenshots_classification_check 
        CHECK (classification IS NULL OR classification IN ('core', 'non_core', 'unproductive', 'productive', 'neutral', 'distracting', 'idle_test'));
      `
    }
  ];

  try {
    for (const fix of fixes) {
      console.log(`\n📝 Applying: ${fix.name}`);
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: fix.sql 
      });
      
      if (error) {
        // Try direct query execution instead
        console.log('   ⚠️  RPC failed, trying direct execution...');
        
        // For constraint operations, we might need to use the REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql_query: fix.sql })
        });
        
        if (!response.ok) {
          console.log(`   ❌ Failed: ${fix.name} - ${error?.message || 'Unknown error'}`);
          console.log('   💡 This fix may need to be applied manually in Supabase Studio');
        } else {
          console.log(`   ✅ Applied: ${fix.name}`);
        }
      } else {
        console.log(`   ✅ Applied: ${fix.name}`);
      }
    }
    
    // Test the fixes
    console.log('\n🧪 Testing applied fixes...');
    await testFixes();
    
  } catch (error) {
    console.error('❌ Error applying fixes:', error);
    console.log('\n📋 Manual application required:');
    console.log('1. Go to https://supabase.com/dashboard/project/fkpiqcxkmrtaetvfgcli');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the COMPLETE_DATABASE_FIXES.sql script');
  }
}

async function testFixes() {
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
        
        return !error;
      }
    },
    {
      name: 'Unusual activity with decimal confidence',
      test: async () => {
        const { error } = await supabase
          .from('unusual_activity')
          .insert({
            user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
            rule_triggered: 'test_fix',
            confidence: 85.5,
            notes: 'Testing remote fix'
          });
        
        if (!error) {
          // Clean up
          await supabase
            .from('unusual_activity')
            .delete()
            .eq('notes', 'Testing remote fix');
        }
        
        return !error;
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
        
        return !error;
      }
    }
  ];
  
  for (const test of tests) {
    try {
      const result = await test.test();
      console.log(`   ${result ? '✅' : '❌'} ${test.name}`);
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
    }
  }
}

// Check if service role key is provided
if (SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.log('❌ SERVICE_ROLE_KEY not provided!');
  console.log('');
  console.log('To use this script:');
  console.log('1. Get your service role key from Supabase Dashboard > Settings > API');
  console.log('2. Replace "YOUR_SERVICE_ROLE_KEY_HERE" in this file with the actual key');
  console.log('3. Run: node apply-remote-fixes.cjs');
  console.log('');
  console.log('⚠️  WARNING: The service role key has admin privileges. Keep it secure!');
  console.log('');
  console.log('Alternative: Use Supabase Studio SQL Editor instead (recommended)');
  process.exit(1);
} else {
  applyDatabaseFixes();
} 