const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4'
);

async function createDefaultTask() {
  console.log('🔧 Creating default task for screenshots...');
  
  // Create a default task with minimal required fields
  const defaultTask = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Screenshot Monitoring',
    user_id: '00000000-0000-0000-0000-000000000002',
    created_at: new Date().toISOString()
  };

  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .upsert(defaultTask, { onConflict: 'id' })
    .select();
    
  if (taskError) {
    console.error('❌ Failed to create default task:', taskError.message);
    console.log('   Available columns in tasks table may be different');
    
    // Try with just the essential fields
    console.log('🔧 Trying with minimal fields...');
    
    const minimalTask = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Screenshot Monitoring',
      user_id: '00000000-0000-0000-0000-000000000002'
    };

    const { data: taskData2, error: taskError2 } = await supabase
      .from('tasks')
      .upsert(minimalTask, { onConflict: 'id' })
      .select();
      
    if (taskError2) {
      console.error('❌ Failed to create minimal task:', taskError2.message);
      return;
    } else {
      console.log('✅ Default task created successfully:', taskData2);
    }
  } else {
    console.log('✅ Default task created successfully:', taskData);
  }
  
  // Now test screenshot insert with the default task
  console.log('');
  console.log('🧪 Testing screenshot insert with default task...');
  
  const testData = {
    user_id: '00000000-0000-0000-0000-000000000002',
    task_id: '00000000-0000-0000-0000-000000000001',
    image_url: 'https://test.com/test-with-default-task.png',
    captured_at: new Date().toISOString()
  };

  const { data: insertData, error: insertError } = await supabase
    .from('screenshots')
    .insert(testData)
    .select();
    
  if (insertError) {
    console.error('❌ Screenshot insert still failed:', insertError.message);
  } else {
    console.log('✅ Screenshot insert successful with default task!', insertData);
    
    // Clean up test record
    await supabase
      .from('screenshots') 
      .delete()
      .eq('id', insertData[0].id);
    console.log('🧹 Test record cleaned up');
    
    console.log('');
    console.log('🎉 SOLUTION FOUND:');
    console.log('   Default task created: 00000000-0000-0000-0000-000000000001');
    console.log('   Screenshot uploads now working!');
  }
}

createDefaultTask().catch(console.error); 