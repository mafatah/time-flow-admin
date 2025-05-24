const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4'
);

async function fixForeignKey() {
  console.log('🔧 Attempting to fix foreign key constraint issue...');
  
  // First, try to insert required task records
  const requiredTasks = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Activity Monitoring',
      description: 'Virtual task for activity monitoring screenshots',
      user_id: '00000000-0000-0000-0000-000000000002', // Test user ID
      status: 'active'
    }
  ];

  for (const task of requiredTasks) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .upsert(task, { onConflict: 'id' })
        .select();

      if (error) {
        console.error(`❌ Failed to create task ${task.id}:`, error.message);
      } else {
        console.log(`✅ Task created/updated: ${task.name}`);
      }
    } catch (err) {
      console.error(`❌ Error with task ${task.id}:`, err.message);
    }
  }

  // Now test screenshot insert
  console.log('');
  console.log('🧪 Testing screenshot insert after task creation...');
  
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
    console.log('');
    console.log('🔧 ALTERNATIVE SOLUTION: Remove foreign key constraint in Supabase dashboard:');
    console.log('   SQL: ALTER TABLE public.screenshots DROP CONSTRAINT IF EXISTS fk_screenshots_tasks;');
    console.log('');
  } else {
    console.log('✅ Screenshot insert successful! Foreign key issue resolved:', insertData);
    
    // Clean up test record
    await supabase
      .from('screenshots') 
      .delete()
      .eq('id', insertData[0].id);
  }
}

fixForeignKey().catch(console.error); 