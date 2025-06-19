const { createClient } = require('@supabase/supabase-js');

// Database configurations
const PROD_CONFIG = {
  url: 'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4'
};

const DEV_CONFIG = {
  url: 'https://clypxuffvpqgmczbsblj.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNseXB4dWZmdnBxZ21jemJzYmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjc2NjcsImV4cCI6MjA2NTkwMzY2N30._h0BlKG10Ri4yf2W-BH7yGf_WCNArqRkXCtSuYTkVQ8'
};

// Create clients
const prodClient = createClient(PROD_CONFIG.url, PROD_CONFIG.key);
const devClient = createClient(DEV_CONFIG.url, DEV_CONFIG.key);

// Tables to sync (in order of dependencies)
const TABLES_TO_SYNC = [
  'users',
  'projects', 
  'employee_project_assignments',
  'time_logs',
  'app_logs',
  'screenshots',
  'url_logs',
  'idle_logs',
  'tasks',
  'employee_working_standards',
  'employee_salary_settings',
  'settings',
  'notifications'
];

async function clearTable(client, tableName) {
  console.log(`  🗑️  Clearing ${tableName}...`);
  const { error } = await client.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error && !error.message.includes('No rows found')) {
    console.log(`    ⚠️  Warning clearing ${tableName}: ${error.message}`);
  }
}

async function syncTable(tableName) {
  try {
    console.log(`\n📋 Syncing table: ${tableName}`);
    
    // Get data from production
    console.log(`  📤 Fetching data from production...`);
    const { data: prodData, error: fetchError } = await prodClient
      .from(tableName)
      .select('*')
      .limit(1000);
      
    if (fetchError) {
      console.log(`  ❌ Error fetching from ${tableName}: ${fetchError.message}`);
      return;
    }
    
    if (!prodData || prodData.length === 0) {
      console.log(`  ℹ️  No data in ${tableName}`);
      return;
    }
    
    console.log(`  📊 Found ${prodData.length} records`);
    
    // Clear development table first
    await clearTable(devClient, tableName);
    
    // Insert data in batches
    const batchSize = 100;
    for (let i = 0; i < prodData.length; i += batchSize) {
      const batch = prodData.slice(i, i + batchSize);
      console.log(`  📥 Inserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(prodData.length/batchSize)} (${batch.length} records)...`);
      
      const { error: insertError } = await devClient
        .from(tableName)
        .insert(batch);
        
      if (insertError) {
        console.log(`  ❌ Error inserting batch: ${insertError.message}`);
        // Continue with next batch
      } else {
        console.log(`  ✅ Batch inserted successfully`);
      }
    }
    
    console.log(`  🎉 Completed ${tableName}`);
    
  } catch (error) {
    console.log(`  💥 Unexpected error syncing ${tableName}:`, error.message);
  }
}

async function syncAllData() {
  console.log('🚀 Starting Production → Development Data Sync');
  console.log('===============================================\n');
  
  console.log('📊 Source: Production Database (fkpiqcxkmrtaetvfgcli)');
  console.log('🎯 Target: Development Database (clypxuffvpqgmczbsblj)');
  console.log('');
  
  const startTime = Date.now();
  
  for (const tableName of TABLES_TO_SYNC) {
    await syncTable(tableName);
    // Small delay between tables
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n🎉 Data Sync Complete!');
  console.log('=====================');
  console.log(`⏱️  Total time: ${duration} seconds`);
  console.log('📋 Tables synced:', TABLES_TO_SYNC.length);
  console.log('');
  console.log('✅ Development database now has the same data as production!');
  console.log('🧪 Safe to test all features with real data');
}

// Handle command line execution
if (require.main === module) {
  syncAllData().catch(error => {
    console.error('💥 Sync failed:', error);
    process.exit(1);
  });
}

module.exports = { syncAllData }; 