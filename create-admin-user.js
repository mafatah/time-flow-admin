import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Use environment variables with existing project as fallback
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

// Admin credentials from environment
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@timeflow.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SecureAdmin123!';
const EMPLOYEE_EMAIL = process.env.EMPLOYEE_EMAIL || 'employee@timeflow.com';
const EMPLOYEE_PASSWORD = process.env.EMPLOYEE_PASSWORD || 'SecureEmployee123!';

// Enhanced validation
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase configuration. Using fallback credentials.');
} else {
  console.log('✅ Supabase configuration loaded successfully');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createAdminUser() {
  console.log('🚀 Creating admin user...');

  try {
    // Create admin user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: {
        data: {
          full_name: 'Admin User',
          role: 'admin'
        }
      }
    });

    if (authError) {
      console.error('❌ Failed to create auth user:', authError);
      return;
    }

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Password: [SECURE - Check Environment Variables]');
    console.log('👤 Role: admin');
    
    // Create employee user
    const { data: empAuthData, error: empAuthError } = await supabase.auth.signUp({
      email: EMPLOYEE_EMAIL,
      password: EMPLOYEE_PASSWORD,
      options: {
        data: {
          full_name: 'Employee User',
          role: 'employee'
        }
      }
    });

    if (empAuthError) {
      console.error('❌ Failed to create employee user:', empAuthError);
    } else {
      console.log('✅ Employee user created successfully!');
      console.log('📧 Email:', EMPLOYEE_EMAIL);
      console.log('🔑 Password: [SECURE - Check Environment Variables]');
      console.log('👤 Role: employee');
    }

    console.log('\n🎉 User creation complete!');
    console.log('\n📋 Login Credentials:');
    console.log('Admin Dashboard (http://localhost:8080):');
    console.log('  Email:', ADMIN_EMAIL);
    console.log('  Password: [Set in environment variables]');
    console.log('\nDesktop App:');
    console.log('  Email:', EMPLOYEE_EMAIL);
    console.log('  Password: [Set in environment variables]');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

createAdminUser(); 