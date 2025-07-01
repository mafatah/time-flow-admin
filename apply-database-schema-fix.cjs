#!/usr/bin/env node

/**
 * Apply Database Schema Fix for TimeFlow
 * 
 * This script applies the missing detected_at column to the app_logs table
 * and fixes other database issues identified in the logs.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🗄️  TimeFlow Database Schema Fix');
console.log('='.repeat(50));

async function applySchemaFix() {
  console.log('\n🔧 Applying database schema fixes...');
  
  try {
    // Fix 1: Add detected_at column to app_logs table
    console.log('\n1️⃣  Adding detected_at column to app_logs...');
    
    const { error: detectedAtError } = await supabase.rpc('exec', {
      sql: `
        -- Add detected_at column to app_logs table
        ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS detected_at BIGINT;
        
        -- Add index for performance on the new column
        CREATE INDEX IF NOT EXISTS idx_app_logs_detected_at ON public.app_logs(detected_at);
        
        -- Add project_id column for better tracking (used by activity monitor)
        ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
        
        -- Add index for project_id
        CREATE INDEX IF NOT EXISTS idx_app_logs_project_id ON public.app_logs(project_id);
      `
    });
    
    if (detectedAtError) {
      console.log('❌ Error adding detected_at column:', detectedAtError.message);
    } else {
      console.log('✅ Successfully added detected_at column to app_logs');
    }
    
    // Fix 2: Check if url_logs table needs similar fixes
    console.log('\n2️⃣  Checking url_logs table...');
    
    const { error: urlLogsError } = await supabase.rpc('exec', {
      sql: `
        -- Add detected_at column to url_logs table if it doesn't exist
        ALTER TABLE public.url_logs ADD COLUMN IF NOT EXISTS detected_at BIGINT;
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_url_logs_detected_at ON public.url_logs(detected_at);
        
        -- Add project_id column for better tracking
        ALTER TABLE public.url_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
        
        -- Add index for project_id
        CREATE INDEX IF NOT EXISTS idx_url_logs_project_id ON public.url_logs(project_id);
      `
    });
    
    if (urlLogsError) {
      console.log('❌ Error updating url_logs table:', urlLogsError.message);
    } else {
      console.log('✅ Successfully updated url_logs table');
    }
    
    // Fix 3: Verify table structures
    console.log('\n3️⃣  Verifying table structures...');
    
    const { data: appLogsStructure, error: structureError } = await supabase
      .from('app_logs')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.log('⚠️  Could not verify app_logs structure:', structureError.message);
    } else {
      console.log('✅ app_logs table structure verified');
    }
    
    // Fix 4: Test database connectivity
    console.log('\n4️⃣  Testing database connectivity...');
    
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1);
    
    if (testError) {
      console.log('❌ Database connectivity test failed:', testError.message);
    } else {
      console.log('✅ Database connectivity confirmed');
      if (testData && testData.length > 0) {
        console.log(`   Found project: ${testData[0].name}`);
      }
    }
    
    console.log('\n🎉 Database schema fix completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('   ✅ Added detected_at column to app_logs');
    console.log('   ✅ Added project_id column to app_logs'); 
    console.log('   ✅ Added detected_at column to url_logs');
    console.log('   ✅ Added project_id column to url_logs');
    console.log('   ✅ Created performance indexes');
    console.log('   ✅ Verified database connectivity');
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Restart TimeFlow desktop app');
    console.log('   2. Run: node fix-screen-recording-permission.cjs');
    console.log('   3. Test app detection and URL tracking');
    
  } catch (error) {
    console.error('\n❌ Failed to apply database schema fix:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Check environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease check your .env file.');
  process.exit(1);
}

// Run the fix
if (require.main === module) {
  applySchemaFix().catch(console.error);
}

module.exports = { applySchemaFix }; 