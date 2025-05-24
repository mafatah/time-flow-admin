const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4'
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