import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createAdminUser() {
  console.log('🚀 Creating admin user...');

  try {
    // Create admin user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@timeflow.com',
      password: 'admin123456',
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
    console.log('📧 Email: admin@timeflow.com');
    console.log('🔑 Password: admin123456');
    console.log('👤 Role: admin');
    
    // Create employee user
    const { data: empAuthData, error: empAuthError } = await supabase.auth.signUp({
      email: 'employee@timeflow.com',
      password: 'employee123456',
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
      console.log('📧 Email: employee@timeflow.com');
      console.log('🔑 Password: employee123456');
      console.log('👤 Role: employee');
    }

    console.log('\n🎉 User creation complete!');
    console.log('\n📋 Login Credentials:');
    console.log('Admin Dashboard (http://localhost:8080):');
    console.log('  Email: admin@timeflow.com');
    console.log('  Password: admin123456');
    console.log('\nDesktop App:');
    console.log('  Email: employee@timeflow.com');
    console.log('  Password: employee123456');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

createAdminUser(); 