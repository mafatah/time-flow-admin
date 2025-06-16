require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');


// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(
  'process.env.VITE_SUPABASE_URL', 
  'process.env.VITE_SUPABASE_ANON_KEY'
);

async function applyConstraintFixes() {
  console.log('🔧 Applying database constraint fixes...');
  
  try {
    // Step 1: Fix URL logs category constraint
    console.log('\n1️⃣ Fixing URL logs category constraint...');
    
    // Test current constraint
    const { error: testError1 } = await supabase
      .from('url_logs')
      .insert({
        user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
        site_url: 'https://test-development.com',
        category: 'development'
      });
    
    if (testError1 && testError1.message.includes('url_logs_category_check')) {
      console.log('❌ URL category constraint needs fixing');
      console.log('⚠️ Note: Constraint fixes require database admin access');
      console.log('📋 Please run this SQL in Supabase Studio SQL Editor:');
      console.log(`
-- Fix URL logs category constraint
ALTER TABLE public.url_logs DROP CONSTRAINT IF EXISTS url_logs_category_check;
ALTER TABLE public.url_logs ADD CONSTRAINT url_logs_category_check 
CHECK (category IN ('development', 'entertainment', 'social', 'research', 'other', 'communication', 'system'));
      `);
    } else if (!testError1) {
      console.log('✅ URL category constraint already working');
      // Clean up test record
      await supabase
        .from('url_logs')
        .delete()
        .eq('site_url', 'https://test-development.com');
    }
    
    // Step 2: Fix unusual activity RLS
    console.log('\n2️⃣ Testing unusual activity table access...');
    
    const { error: testError2 } = await supabase
      .from('unusual_activity')
      .insert({
        user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
        rule_triggered: 'test_constraint',
        confidence: 85.5,
        notes: 'Testing RLS fix'
      });
    
    if (testError2 && testError2.message.includes('row-level security')) {
      console.log('❌ Unusual activity RLS needs fixing');
      console.log('📋 Please run this SQL in Supabase Studio SQL Editor:');
      console.log(`
-- Fix unusual activity RLS
ALTER TABLE public.unusual_activity DISABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all unusual_activity operations" ON public.unusual_activity
FOR ALL USING (true) WITH CHECK (true);
      `);
    } else if (testError2 && testError2.message.includes('confidence_check')) {
      console.log('❌ Unusual activity confidence constraint needs fixing');
      console.log('📋 Please run this SQL in Supabase Studio SQL Editor:');
      console.log(`
-- Fix confidence constraint
ALTER TABLE public.unusual_activity DROP CONSTRAINT IF EXISTS unusual_activity_confidence_check;
ALTER TABLE public.unusual_activity ADD CONSTRAINT unusual_activity_confidence_check 
CHECK (confidence IS NULL OR (confidence >= 0.00 AND confidence <= 100.00));
      `);
    } else if (!testError2) {
      console.log('✅ Unusual activity table access working');
      // Clean up test record
      await supabase
        .from('unusual_activity')
        .delete()
        .eq('notes', 'Testing RLS fix');
    } else {
      console.log('❌ Unusual activity error:', testError2.message);
    }
    
    // Step 3: Test both fixes together
    console.log('\n3️⃣ Testing complete fixes...');
    
    // Test URL with development category
    const { error: urlTest } = await supabase
      .from('url_logs')
      .insert({
        user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
        site_url: 'https://github.com/test',
        category: 'development'
      });
    
    if (!urlTest) {
      console.log('✅ URL logs with development category working');
      await supabase
        .from('url_logs')
        .delete()
        .eq('site_url', 'https://github.com/test');
    } else {
      console.log('❌ URL logs still failing:', urlTest.message);
    }
    
    // Test unusual activity with decimal confidence
    const { error: unusualTest } = await supabase
      .from('unusual_activity')
      .insert({
        user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
        rule_triggered: 'low_activity',
        confidence: 85.5,
        notes: 'Final test of constraint fixes'
      });
    
    if (!unusualTest) {
      console.log('✅ Unusual activity with decimal confidence working');
      await supabase
        .from('unusual_activity')
        .delete()
        .eq('notes', 'Final test of constraint fixes');
    } else {
      console.log('❌ Unusual activity still failing:', unusualTest.message);
    }
    
    // Step 4: Test screenshot classification constraint
    console.log('\n4️⃣ Testing screenshot classification constraint...');
    
    const { error: screenshotTest } = await supabase
      .from('screenshots')
      .insert({
        user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
        project_id: '00000000-0000-0000-0000-000000000001',
        image_url: 'https://test-productive.png',
        classification: 'productive',
        activity_percent: 50,
        focus_percent: 50
      });
    
    if (screenshotTest && screenshotTest.message.includes('screenshots_classification_check')) {
      console.log('❌ Screenshot classification constraint needs fixing');
      console.log('📋 Please run this SQL in Supabase Studio SQL Editor:');
      console.log(`
-- Fix screenshot classification constraint
ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS screenshots_classification_check;
ALTER TABLE public.screenshots ADD CONSTRAINT screenshots_classification_check 
CHECK (classification IS NULL OR classification IN ('core', 'non_core', 'unproductive', 'productive', 'neutral', 'distracting', 'idle_test'));
      `);
    } else if (!screenshotTest) {
      console.log('✅ Screenshot classification constraint working');
      await supabase
        .from('screenshots')
        .delete()
        .eq('image_url', 'https://test-productive.png');
    } else {
      console.log('❌ Screenshot classification error:', screenshotTest.message);
    }

    console.log('\n🎯 Summary:');
    console.log('If you see any ❌ errors above, please run the provided SQL commands in Supabase Studio.');
    console.log('The SQL commands need to be run with database admin privileges.');
    console.log('\n📍 To apply fixes:');
    console.log('1. Go to https://supabase.com/dashboard/project/fkpiqcxkmrtaetvfgcli');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL commands shown above');
    console.log('4. Re-run this script to verify fixes');
    
  } catch (error) {
    console.error('❌ Failed to apply constraint fixes:', error);
  }
}

applyConstraintFixes(); 