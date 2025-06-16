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