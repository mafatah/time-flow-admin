require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');


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

async function removeForeignKeyConstraint() {
  console.log('🔧 Attempting to remove foreign key constraint...');
  
  // Try to execute the SQL to remove the constraint
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS fk_screenshots_tasks;'
  });
  
  if (error) {
    console.error('❌ RPC method not available. Direct SQL execution needed.');
    console.log('');
    console.log('🚨 MANUAL ACTION REQUIRED:');
    console.log('   Go to Supabase Dashboard → SQL Editor');
    console.log('   Execute: ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS fk_screenshots_tasks;');
    console.log('');
  } else {
    console.log('✅ Foreign key constraint removed successfully');
  }
  
  // Test screenshot insert after attempting to remove constraint
  console.log('🧪 Testing screenshot insert...');
  
  const testData = {
    user_id: '00000000-0000-0000-0000-000000000002',
    task_id: '00000000-0000-0000-0000-000000000001', 
    image_url: 'https://test.com/test.png',
    captured_at: new Date().toISOString()
  };

  const { data: insertData, error: insertError } = await supabase
    .from('screenshots')
    .insert(testData)
    .select();
    
  if (insertError) {
    console.error('❌ Screenshot insert still failed:', insertError.message);
    
    if (insertError.message.includes('foreign key')) {
      console.log('');
      console.log('🚨 FOREIGN KEY CONSTRAINT STILL EXISTS');
      console.log('   Manual SQL execution required in Supabase Dashboard');
    } else if (insertError.message.includes('row-level security')) {
      console.log('');
      console.log('🚨 RLS POLICY BLOCKING INSERT');
      console.log('   Need to disable RLS: ALTER TABLE public.screenshots DISABLE ROW LEVEL SECURITY;');
    }
  } else {
    console.log('✅ Screenshot insert successful!', insertData);
    
    // Clean up test record
    await supabase
      .from('screenshots') 
      .delete()
      .eq('id', insertData[0].id);
    console.log('🧹 Test record cleaned up');
  }
}

removeForeignKeyConstraint().catch(console.error); 