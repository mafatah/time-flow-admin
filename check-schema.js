import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4'
);

console.log('🔍 Checking Database Schema...\n');

// Check existing tables and their columns
const tables = ['users', 'screenshots', 'url_logs', 'activity_logs', 'idle_logs'];

for (const table of tables) {
  try {
    console.log(`📊 Table: ${table}`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`   ✅ Columns: ${Object.keys(data[0]).join(', ')}`);
    } else {
      console.log('   ✅ Table exists but no data');
      // Try to get column info by selecting with wrong column
      try {
        await supabase.from(table).select('nonexistent_column').limit(1);
      } catch (err) {
        console.log('   📝 Empty table, cannot determine columns');
      }
    }
    console.log('');
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}\n`);
  }
} 