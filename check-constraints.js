const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkConstraints() {
  console.log('🔍 Checking database constraints...');
  
  try {
    // Check url_logs table structure
    console.log('\n📊 URL Logs Table Structure:');
    const { data: urlLogs, error: urlError } = await supabase
      .from('url_logs')
      .select('*')
      .limit(1);
    
    if (urlError) {
      console.log('❌ URL logs error:', urlError);
    } else {
      console.log('✅ URL logs table accessible');
      if (urlLogs && urlLogs.length > 0) {
        console.log('📋 Sample record:', Object.keys(urlLogs[0]));
      }
    }
    
    // Check unusual_activity table structure
    console.log('\n📊 Unusual Activity Table Structure:');
    const { data: unusual, error: unusualError } = await supabase
      .from('unusual_activity')
      .select('*')
      .limit(1);
    
    if (unusualError) {
      console.log('❌ Unusual activity error:', unusualError);
    } else {
      console.log('✅ Unusual activity table accessible');
      if (unusual && unusual.length > 0) {
        console.log('📋 Sample record:', Object.keys(unusual[0]));
      }
    }
    
    // Test URL logs insert with different categories
    console.log('\n🧪 Testing URL logs categories:');
    const testCategories = ['development', 'entertainment', 'social', 'research', 'other'];
    
    for (const category of testCategories) {
      try {
        const { error } = await supabase
          .from('url_logs')
          .insert({
            user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
            site_url: `https://test-${category}.com`,
            category: category
          });
        
        if (error) {
          console.log(`❌ Category '${category}' failed:`, error.message);
        } else {
          console.log(`✅ Category '${category}' works`);
          
          // Clean up test record
          await supabase
            .from('url_logs')
            .delete()
            .eq('site_url', `https://test-${category}.com`);
        }
      } catch (err) {
        console.log(`❌ Category '${category}' error:`, err.message);
      }
    }
    
    // Test unusual activity confidence values
    console.log('\n🧪 Testing unusual activity confidence values:');
    const testConfidences = [0.5, 50, 85.5, 99.99, 100];
    
    for (const confidence of testConfidences) {
      try {
        const { error } = await supabase
          .from('unusual_activity')
          .insert({
            user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
            rule_triggered: 'test_rule',
            confidence: confidence,
            notes: `Test confidence ${confidence}`
          });
        
        if (error) {
          console.log(`❌ Confidence ${confidence} failed:`, error.message);
        } else {
          console.log(`✅ Confidence ${confidence} works`);
          
          // Clean up test record
          await supabase
            .from('unusual_activity')
            .delete()
            .eq('notes', `Test confidence ${confidence}`);
        }
      } catch (err) {
        console.log(`❌ Confidence ${confidence} error:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to check constraints:', error);
  }
}

checkConstraints(); 