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

async function testScreenshotConstraints() {
  console.log('🧪 Testing screenshot classification constraints...');
  
  const testClassifications = ['productive', 'neutral', 'distracting', 'core', 'non_core', 'unproductive', 'idle_test', null];
  
  for (const classification of testClassifications) {
    try {
      const { error } = await supabase
        .from('screenshots')
        .insert({
          user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
          project_id: '00000000-0000-0000-0000-000000000001',
          image_url: 'https://test.com/test.png',
          classification: classification,
          activity_percent: 50,
          focus_percent: 50
        });
      
      if (error) {
        console.log(`❌ Classification '${classification}' failed: ${error.message}`);
      } else {
        console.log(`✅ Classification '${classification}' works`);
        // Clean up
        await supabase
          .from('screenshots')
          .delete()
          .eq('image_url', 'https://test.com/test.png')
          .eq('classification', classification);
      }
    } catch (err) {
      console.log(`❌ Classification '${classification}' error: ${err.message}`);
    }
  }
}

testScreenshotConstraints(); 