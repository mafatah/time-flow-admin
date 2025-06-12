#!/usr/bin/env node

/**
 * SUPABASE MIGRATION SCRIPT
 * 
 * This script helps migrate from the compromised Supabase project
 * to a new secure project with fresh API keys.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

console.log('🚀 SUPABASE MIGRATION TOOL');
console.log('==========================\n');

// STEP 1: Export data from compromised project
async function exportCurrentData() {
  console.log('📦 STEP 1: Exporting data from compromised project...');
  
  // Using the compromised keys for export (one last time)
  const oldSupabase = createClient(
    'https://fkpiqcxkmrtaetvfgcli.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2'
  );

  const exportData = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  // List of tables to export
  const tables = [
    'users',
    'projects', 
    'time_logs',
    'screenshots',
    'idle_logs',
    'activities',
    'suspicious_activities',
    'user_profiles'
  ];

  for (const table of tables) {
    try {
      console.log(`   📋 Exporting ${table}...`);
      const { data, error } = await oldSupabase
        .from(table)
        .select('*');

      if (error) {
        console.log(`   ⚠️  Warning: Could not export ${table}: ${error.message}`);
        exportData.tables[table] = { error: error.message, data: [] };
      } else {
        exportData.tables[table] = { data: data || [], count: data?.length || 0 };
        console.log(`   ✅ Exported ${data?.length || 0} records from ${table}`);
      }
    } catch (err) {
      console.log(`   ❌ Error exporting ${table}: ${err.message}`);
      exportData.tables[table] = { error: err.message, data: [] };
    }
  }

  // Save export to file
  const exportFile = `database-export-${Date.now()}.json`;
  fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
  console.log(`✅ Export saved to: ${exportFile}\n`);
  
  return exportFile;
}

// STEP 2: Update code with new credentials
async function updateCodeWithNewCredentials(newUrl, newKey) {
  console.log('🔧 STEP 2: Updating code with new credentials...');

  const filesToUpdate = [
    'src/integrations/supabase/client.ts',
    'electron/main.ts',
    'electron/config.ts'
  ];

  for (const file of filesToUpdate) {
    if (fs.existsSync(file)) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        
        // Replace old URL and key
        content = content.replace(
          /https:\/\/fkpiqcxkmrtaetvfgcli\.supabase\.co/g,
          newUrl
        );
        content = content.replace(
          /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0\._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2/g,
          newKey
        );

        fs.writeFileSync(file, content);
        console.log(`   ✅ Updated ${file}`);
      } catch (err) {
        console.log(`   ❌ Error updating ${file}: ${err.message}`);
      }
    } else {
      console.log(`   ⚠️  File not found: ${file}`);
    }
  }

  console.log('✅ Code updated with new credentials\n');
}

// STEP 3: Import data to new project
async function importToNewProject(exportFile, newUrl, newKey) {
  console.log('📥 STEP 3: Importing data to new project...');

  const newSupabase = createClient(newUrl, newKey);
  const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));

  for (const [tableName, tableData] of Object.entries(exportData.tables)) {
    if (tableData.error || !tableData.data || tableData.data.length === 0) {
      console.log(`   ⏭️  Skipping ${tableName} (no data or error)`);
      continue;
    }

    try {
      console.log(`   📤 Importing ${tableData.data.length} records to ${tableName}...`);
      
      // Import in chunks to avoid timeout
      const chunkSize = 100;
      for (let i = 0; i < tableData.data.length; i += chunkSize) {
        const chunk = tableData.data.slice(i, i + chunkSize);
        const { error } = await newSupabase
          .from(tableName)
          .insert(chunk);

        if (error) {
          console.log(`   ⚠️  Warning importing chunk ${i}-${i + chunk.length} to ${tableName}: ${error.message}`);
        }
      }
      
      console.log(`   ✅ Imported ${tableName}`);
    } catch (err) {
      console.log(`   ❌ Error importing to ${tableName}: ${err.message}`);
    }
  }

  console.log('✅ Data import completed\n');
}

// Main migration function
async function runMigration() {
  try {
    console.log('🚨 IMPORTANT: Before running this script:');
    console.log('1. Create a new Supabase project in your dashboard');
    console.log('2. Copy the new project URL and anon key');
    console.log('3. Set up the same database schema in the new project\n');

    const exportFile = await exportCurrentData();

    console.log('📋 Migration ready!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Create new Supabase project');
    console.log('2. Run the database migration with new credentials');
    console.log('3. Test the application');
    console.log('4. Delete the compromised project');
    console.log('');
    console.log(`Data exported to: ${exportFile}`);
    console.log('Use this file to import to your new project.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { exportCurrentData, updateCodeWithNewCredentials, importToNewProject }; 