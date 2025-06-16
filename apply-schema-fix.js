import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSchema() {
  console.log('🔧 Fixing database schema...');
  
  try {
    // Fix app_logs table
    console.log('📝 Adding missing columns to app_logs...');
    const { error: appLogsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE app_logs 
        ADD COLUMN IF NOT EXISTS keystrokes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS mouse_clicks INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS mouse_movements INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS activity_percent DECIMAL(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS focus_percent DECIMAL(5,2) DEFAULT 0;
      `
    });
    
    if (appLogsError) {
      console.log('⚠️  App logs columns might already exist:', appLogsError.message);
    } else {
      console.log('✅ App logs columns added successfully');
    }
    
    // Fix screenshots table
    console.log('📝 Adding missing columns to screenshots...');
    const { error: screenshotsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE screenshots 
        ADD COLUMN IF NOT EXISTS activity_percent DECIMAL(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS focus_percent DECIMAL(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS mouse_clicks INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS keystrokes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS mouse_movements INTEGER DEFAULT 0;
      `
    });
    
    if (screenshotsError) {
      console.log('⚠️  Screenshots columns might already exist:', screenshotsError.message);
    } else {
      console.log('✅ Screenshots columns added successfully');
    }
    
    console.log('✅ Schema fixes completed!');
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
  }
}

fixSchema(); 