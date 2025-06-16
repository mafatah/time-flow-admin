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

async function fixRLS() {
  console.log('🔧 Testing screenshots table access...');
  
  // First, test if we can access the table
  const { data, error } = await supabase
    .from('screenshots')
    .select('count', { count: 'exact', head: true });
    
  if (error) {
    console.error('❌ Cannot access screenshots table:', error.message);
    return;
  }
  
  console.log('✅ Can access screenshots table, count:', data);
  
  // Try to insert a test record
  const testData = {
    user_id: '00000000-0000-0000-0000-000000000001',
    task_id: '00000000-0000-0000-0000-000000000001', 
    image_url: 'https://test.com/test.png',
    captured_at: new Date().toISOString()
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from('screenshots')
    .insert(testData)
    .select();
    
  if (insertError) {
    console.error('❌ Insert failed:', insertError.message);
    console.log('');
    console.log('🔧 SOLUTION: You need to disable RLS manually in Supabase dashboard:');
    console.log('   1. Go to https://supabase.com/dashboard/project/fkpiqcxkmrtaetvfgcli');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Run: ALTER TABLE public.screenshots DISABLE ROW LEVEL SECURITY;');
    console.log('');
  } else {
    console.log('✅ Insert successful! RLS is not blocking:', insertData);
    
    // Clean up test record
    await supabase
      .from('screenshots') 
      .delete()
      .eq('id', insertData[0].id);
  }
}

fixRLS().catch(console.error); 