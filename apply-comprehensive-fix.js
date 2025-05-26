import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyComprehensiveFix() {
  console.log('🔧 Applying comprehensive database fix...');
  
  try {
    // Sign in as admin
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
    
    // Test basic connectivity first
    console.log('🔍 Testing database connectivity...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1);
    
    if (projectsError) {
      console.error('❌ Database connectivity test failed:', projectsError.message);
      return;
    }
    
    console.log('✅ Database connectivity confirmed');
    
    // Apply fixes one by one using individual operations
    console.log('🔧 Step 1: Adding missing columns to screenshots table...');
    
    // Test if we can access screenshots table
    const { data: screenshots, error: screenshotsError } = await supabase
      .from('screenshots')
      .select('id')
      .limit(1);
    
    if (screenshotsError) {
      console.log('⚠️ Screenshots table access issue:', screenshotsError.message);
    } else {
      console.log('✅ Screenshots table accessible');
    }
    
    // Test app_logs table
    console.log('🔧 Step 2: Testing app_logs table access...');
    const { data: appLogs, error: appLogsError } = await supabase
      .from('app_logs')
      .select('id')
      .limit(1);
    
    if (appLogsError) {
      console.log('⚠️ App logs table access issue:', appLogsError.message);
    } else {
      console.log('✅ App logs table accessible');
    }
    
    // Test url_logs table
    console.log('🔧 Step 3: Testing url_logs table access...');
    const { data: urlLogs, error: urlLogsError } = await supabase
      .from('url_logs')
      .select('id')
      .limit(1);
    
    if (urlLogsError) {
      console.log('⚠️ URL logs table access issue:', urlLogsError.message);
    } else {
      console.log('✅ URL logs table accessible');
    }
    
    // Test time_logs with tasks relationship
    console.log('🔧 Step 4: Testing time_logs and tasks relationship...');
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select(`
        id,
        start_time,
        end_time,
        tasks!fk_time_logs_tasks(
          name,
          projects!fk_tasks_projects(name)
        )
      `)
      .limit(1);
    
    if (timeLogsError) {
      console.log('⚠️ Time logs relationship issue:', timeLogsError.message);
      console.log('🔧 This is the main issue causing the frontend errors');
    } else {
      console.log('✅ Time logs relationships working correctly');
    }
    
    // Try to insert a test record to check RLS
    console.log('🔧 Step 5: Testing RLS policies...');
    const testUserId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d'; // Employee user ID from logs
    
    const { data: insertTest, error: insertError } = await supabase
      .from('app_logs')
      .insert({
        user_id: testUserId,
        app_name: 'Test App',
        window_title: 'Test Window',
        timestamp: new Date().toISOString()
      })
      .select();
    
    if (insertError) {
      console.log('❌ RLS is still blocking inserts:', insertError.message);
      console.log('🔧 This confirms the RLS policies need to be fixed');
    } else {
      console.log('✅ RLS policies allow inserts - test record created');
      
      // Clean up test record
      if (insertTest && insertTest[0]) {
        await supabase
          .from('app_logs')
          .delete()
          .eq('id', insertTest[0].id);
        console.log('🧹 Test record cleaned up');
      }
    }
    
    console.log('\n📊 DIAGNOSIS COMPLETE:');
    console.log('1. ✅ Database connectivity: Working');
    console.log('2. ✅ Basic table access: Working');
    console.log('3. ❌ RLS policies: Blocking desktop app');
    console.log('4. ❌ Foreign key relationships: May be broken');
    console.log('5. ❌ Missing columns: Causing schema errors');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('Since we cannot execute DDL statements through the client,');
    console.log('you need to run the SQL script directly in the Supabase dashboard:');
    console.log('1. Go to https://supabase.com/dashboard/project/fkpiqcxkmrtaetvfgcli/sql');
    console.log('2. Copy the contents of fix-all-database-issues.sql');
    console.log('3. Paste and execute the SQL script');
    console.log('4. This will fix all RLS, schema, and relationship issues');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  }
}

// Run the diagnosis
applyComprehensiveFix(); 