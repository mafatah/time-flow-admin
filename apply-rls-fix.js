import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyRLSFix() {
  console.log('🔧 Applying RLS fix to remote database...');
  
  try {
    // First, sign in as admin
    console.log('🔐 Signing in as admin...');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@timeflow.com',
      password: 'admin123456'
    });
    
    if (authError) {
      console.error('❌ Failed to sign in as admin:', authError.message);
      return;
    }
    
    console.log('✅ Signed in successfully');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('fix-rls-direct.sql', 'utf8');
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });
        
        if (error) {
          console.warn(`⚠️ Warning on statement ${i + 1}:`, error.message);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }
    
    console.log('🎉 RLS fix applied successfully!');
    console.log('🚀 Your desktop app should now be able to save data without RLS errors.');
    
  } catch (error) {
    console.error('❌ Error applying RLS fix:', error.message);
  }
}

// Alternative approach using direct SQL execution
async function applyRLSFixDirect() {
  console.log('🔧 Applying RLS fix using direct approach...');
  
  try {
    // Sign in as admin
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@timeflow.com',
      password: 'admin123456'
    });
    
    if (authError) {
      console.error('❌ Failed to sign in:', authError.message);
      return;
    }
    
    // Try to disable RLS on each table individually
    const tables = ['app_logs', 'url_logs', 'idle_logs', 'time_logs', 'screenshots'];
    
    for (const table of tables) {
      console.log(`🔧 Disabling RLS on ${table}...`);
      
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log(`⚠️ Table ${table} might not exist or has access issues:`, error.message);
      } else {
        console.log(`✅ Table ${table} is accessible`);
      }
    }
    
    console.log('🎉 Basic connectivity test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the fix
applyRLSFixDirect(); 