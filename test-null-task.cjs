const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4'
);

async function testNullTask() {
  console.log('🧪 Testing screenshot insert with null task_id...');
  
  const testData = {
    user_id: '00000000-0000-0000-0000-000000000002',
    task_id: null,  // Test if nullable
    image_url: 'https://test.com/test-null-task.png',
    captured_at: new Date().toISOString()
  };

  const { data: insertData, error: insertError } = await supabase
    .from('screenshots')
    .insert(testData)
    .select();
    
  if (insertError) {
    console.error('❌ Screenshot insert with null task_id failed:', insertError.message);
    
    console.log('');
    console.log('🧪 Testing without task_id field...');
    
    const testData2 = {
      user_id: '00000000-0000-0000-0000-000000000002',
      image_url: 'https://test.com/test-no-task-field.png',
      captured_at: new Date().toISOString()
    };

    const { data: insertData2, error: insertError2 } = await supabase
      .from('screenshots')
      .insert(testData2)
      .select();
      
    if (insertError2) {
      console.error('❌ Screenshot insert without task_id failed:', insertError2.message);
      console.log('');
      console.log('🚨 FINAL SOLUTION NEEDED:');
      console.log('   Either:');
      console.log('   1. Remove foreign key: ALTER TABLE public.screenshots DROP CONSTRAINT fk_screenshots_tasks;');
      console.log('   2. Make task_id nullable: ALTER TABLE public.screenshots ALTER COLUMN task_id DROP NOT NULL;');
      console.log('   3. Create a default task that always exists');
    } else {
      console.log('✅ Screenshot insert without task_id successful!', insertData2);
      
      // Clean up test record
      await supabase
        .from('screenshots') 
        .delete()
        .eq('id', insertData2[0].id);
      console.log('🧹 Test record cleaned up');
    }
  } else {
    console.log('✅ Screenshot insert with null task_id successful!', insertData);
    
    // Clean up test record
    await supabase
      .from('screenshots') 
      .delete()
      .eq('id', insertData[0].id);
    console.log('🧹 Test record cleaned up');
  }
}

testNullTask().catch(console.error); 