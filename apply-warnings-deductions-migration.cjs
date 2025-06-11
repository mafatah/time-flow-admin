#!/usr/bin/env node

/**
 * Apply Warnings & Deductions Migration
 * 
 * This script helps apply the database migration for the warnings and deductions feature.
 * Run this after the database tables have been created in Supabase.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  console.log('Required variables:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTablesExist() {
  console.log('🔍 Checking if warnings & deductions tables exist...');
  
  try {
    // Try to query each table to see if it exists
    const tables = ['employee_deductions', 'employee_warnings', 'employee_working_standards'];
    const results = {};
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        results[table] = !error;
        if (error) {
          console.log(`   ⚠️  Table ${table} does not exist`);
        } else {
          console.log(`   ✅ Table ${table} exists`);
        }
      } catch (e) {
        results[table] = false;
        console.log(`   ❌ Table ${table} does not exist`);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error checking tables:', error.message);
    return {};
  }
}

async function testFeatureFunctionality() {
  console.log('\n📊 Testing warnings & deductions functionality...');
  
  try {
    // Test employee summary function
    try {
      const { data, error } = await supabase.rpc('get_employee_finance_summary');
      if (error) throw error;
      console.log('   ✅ Employee finance summary function works');
      console.log(`   📈 Found ${data?.length || 0} employee records`);
    } catch (e) {
      console.log('   ⚠️  Employee finance summary function not available:', e.message);
    }
    
    // Test inserting a sample working standard
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'employee')
        .limit(1);
        
      if (users && users.length > 0) {
        const userId = users[0].id;
        
        // Try to insert a working standard
        const { error } = await supabase
          .from('employee_working_standards')
          .upsert({
            user_id: userId,
            employment_type: 'hourly',
            required_hours_monthly: 160,
            required_days_monthly: 22
          });
          
        if (error) throw error;
        console.log('   ✅ Successfully created/updated working standards');
      }
    } catch (e) {
      console.log('   ⚠️  Could not test working standards:', e.message);
    }
    
  } catch (error) {
    console.error('Error testing functionality:', error.message);
  }
}

async function createDefaultWorkingStandards() {
  console.log('\n⚙️  Creating default working standards for employees...');
  
  try {
    const { data: employees } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('role', 'employee')
      .eq('is_active', true);
      
    if (!employees || employees.length === 0) {
      console.log('   ℹ️  No active employees found');
      return;
    }
    
    console.log(`   📝 Setting up standards for ${employees.length} employees...`);
    
    for (const employee of employees) {
      try {
        const { error } = await supabase
          .from('employee_working_standards')
          .upsert({
            user_id: employee.id,
            employment_type: 'hourly',
            required_hours_monthly: 160,
            required_days_monthly: 22,
            minimum_hours_daily: 8,
            overtime_threshold: 160,
            warning_threshold_percentage: 90
          });
          
        if (error) throw error;
        console.log(`   ✅ ${employee.full_name || employee.email}`);
      } catch (e) {
        console.log(`   ❌ ${employee.full_name || employee.email}: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error creating working standards:', error.message);
  }
}

async function generateSampleWarnings() {
  console.log('\n⚠️  Generating sample warnings for testing...');
  
  try {
    const { data: employees } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('role', 'employee')
      .eq('is_active', true)
      .limit(3); // Just first 3 employees for testing
      
    if (!employees || employees.length === 0) {
      console.log('   ℹ️  No active employees found');
      return;
    }
    
    const currentMonth = new Date().toISOString().substr(0, 7) + '-01';
    
    for (const employee of employees) {
      try {
        const { error } = await supabase
          .from('employee_warnings')
          .insert({
            user_id: employee.id,
            month_year: currentMonth,
            warning_type: 'below_hours',
            severity: 'medium',
            message: `Sample warning: Employee working below expected hours`,
            required_value: 160,
            actual_value: 120,
            gap_percentage: 25,
            is_reviewed: false
          });
          
        if (error) throw error;
        console.log(`   ✅ Created sample warning for ${employee.full_name || employee.email}`);
      } catch (e) {
        console.log(`   ⚠️  ${employee.full_name || employee.email}: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error generating sample warnings:', error.message);
  }
}

async function main() {
  console.log('🚀 Warnings & Deductions Migration Helper\n');
  
  // Check if tables exist
  const tableStatus = await checkTablesExist();
  
  const allTablesExist = Object.values(tableStatus).every(exists => exists);
  
  if (!allTablesExist) {
    console.log('\n❌ Some required tables are missing.');
    console.log('\n📋 To create the tables, apply this migration in your Supabase dashboard:');
    console.log('File: supabase/migrations/20250128000000_add_warnings_deductions.sql');
    console.log('\nOr run: supabase db push');
    console.log('\nThen run this script again to set up default data.');
    return;
  }
  
  console.log('\n✅ All required tables exist!');
  
  // Test functionality
  await testFeatureFunctionality();
  
  // Create default working standards
  await createDefaultWorkingStandards();
  
  // Generate sample warnings
  await generateSampleWarnings();
  
  console.log('\n🎉 Warnings & Deductions feature is ready!');
  console.log('\n📱 You can now:');
  console.log('   • View employee compliance in Finance > Warnings & Deductions');
  console.log('   • Add manual deductions for employees');
  console.log('   • Review and manage warnings');
  console.log('   • Monitor working hours vs requirements');
}

// Run the script
main().catch(console.error); 