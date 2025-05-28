const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4'
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