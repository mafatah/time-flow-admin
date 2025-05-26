const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUnusualActivity() {
  console.log('🧪 Creating test unusual activity data...');
  
  const employeeUserId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
  const now = new Date();
  
  // Create some unusual activity records for testing
  const unusualActivities = [
    {
      user_id: employeeUserId,
      rule_triggered: 'low_activity',
      confidence: 0.85,
      detected_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      duration_hm: '45m',
      notes: 'User idle for 45 minutes during work hours - activity level below 20%'
    },
    {
      user_id: employeeUserId,
      rule_triggered: 'activity_drop',
      confidence: 0.72,
      detected_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      duration_hm: '2h',
      notes: 'Significant activity drop detected: from 85% to 25% over 2 hour period'
    },
    {
      user_id: employeeUserId,
      rule_triggered: 'long_session',
      confidence: 0.90,
      detected_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      duration_hm: '6h',
      notes: 'Continuous session detected for 6 hours without break - potential burnout risk'
    }
  ];
  
  try {
    const { data, error } = await supabase
      .from('unusual_activity')
      .insert(unusualActivities)
      .select();
    
    if (error) {
      console.error('❌ Error creating unusual activity:', error);
      return;
    }
    
    console.log('✅ Created unusual activity records:', data.length);
    console.log('📊 Unusual activity details:');
    data.forEach((activity, index) => {
      const confidence = Math.round(activity.confidence * 100);
      console.log(`   ${index + 1}. ${activity.rule_triggered} (${confidence}% confidence) - ${activity.notes}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to create unusual activity:', error);
  }
}

async function checkUnusualActivity() {
  console.log('\n🔍 Checking existing unusual activity...');
  
  const employeeUserId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
  
  try {
    const { data, error } = await supabase
      .from('unusual_activity')
      .select('*')
      .eq('user_id', employeeUserId)
      .order('detected_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching unusual activity:', error);
      return;
    }
    
    console.log(`📋 Found ${data.length} unusual activity records for employee:`);
    data.forEach((activity, index) => {
      const confidence = Math.round(activity.confidence * 100);
      const detectedTime = new Date(activity.detected_at).toLocaleString();
      console.log(`   ${index + 1}. ${activity.rule_triggered} (${confidence}% confidence) at ${detectedTime}`);
      console.log(`      Duration: ${activity.duration_hm || 'N/A'} - ${activity.notes}`);
    });
    
    if (data.length === 0) {
      console.log('⚠️ No unusual activity found. Creating test data...');
      await createTestUnusualActivity();
    }
    
  } catch (error) {
    console.error('❌ Failed to check unusual activity:', error);
  }
}

async function checkTables() {
  console.log('\n🔍 Checking available tables...');
  
  try {
    // Try to query a few different tables to see what exists
    const tables = ['time_logs', 'screenshots', 'app_logs', 'unusual_activity', 'notifications'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Table '${table}' exists`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}' does not exist or is not accessible`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to check tables:', error);
  }
}

async function main() {
  console.log('🚀 Testing unusual activity tracking...');
  await checkTables();
  await checkUnusualActivity();
  console.log('\n✅ Unusual activity test completed!');
}

main().catch(console.error); 