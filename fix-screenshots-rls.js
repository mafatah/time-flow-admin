const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function fixRLS() {
  console.log('🔧 Attempting to disable RLS on screenshots table...');
  
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
    console.log('🔧 You need to disable RLS manually in Supabase dashboard');
    console.log('   SQL: ALTER TABLE public.screenshots DISABLE ROW LEVEL SECURITY;');
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