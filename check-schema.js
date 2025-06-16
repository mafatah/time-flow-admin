import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.VITE_SUPABASE_ANON_KEY
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