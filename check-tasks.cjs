const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4'
);

async function checkTasks() {
  console.log('🔍 Checking existing tasks...');
  
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, name, user_id')
    .limit(10);
    
  if (error) {
    console.error('❌ Failed to fetch tasks:', error.message);
    return;
  }
  
  console.log('📋 Available tasks:');
  if (tasks && tasks.length > 0) {
    tasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.id} - ${task.name} (user: ${task.user_id})`);
    });
    
    // Test with first valid task
    console.log('');
    console.log('🧪 Testing screenshot insert with valid task ID...');
    
    const testData = {
      user_id: tasks[0].user_id,
      task_id: tasks[0].id,
      image_url: 'https://test.com/test-valid-task.png',
      captured_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('screenshots')
      .insert(testData)
      .select();
      
    if (insertError) {
      console.error('❌ Screenshot insert failed:', insertError.message);
    } else {
      console.log('✅ Screenshot insert successful with valid task!', insertData);
      
      // Clean up test record
      await supabase
        .from('screenshots') 
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Test record cleaned up');
    }
  } else {
    console.log('   No tasks found in database');
    console.log('');
    console.log('🚨 SOLUTION: Need to create a task first or remove foreign key constraint');
  }
}

checkTasks().catch(console.error); 