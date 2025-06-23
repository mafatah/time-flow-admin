import { createClient } from '@supabase/supabase-js';

// Production Supabase configuration
const SUPABASE_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';

// You need to provide your service role key here
// Get it from: https://supabase.com/dashboard/project/fkpiqcxkmrtaetvfgcli/settings/api
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (() => {
  console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('   Get it from: https://supabase.com/dashboard/project/fkpiqcxkmrtaetvfgcli/settings/api');
  process.exit(1);
})();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetAdminPassword() {
  try {
    console.log('🔧 Resetting admin password...');
    
    // Reset password for your main admin account
    const { data, error } = await supabase.auth.admin.updateUserById(
      '0c3d3092-913e-436f-a352-3378e558c34f', // Your user ID
      { 
        password: 'admin123',
        email_confirm: true // Ensure email is confirmed
      }
    );

    if (error) {
      console.error('❌ Failed to reset password:', error.message);
      return;
    }

    console.log('✅ Password reset successful!');
    console.log('📧 Email: m_afatah@me.com');
    console.log('🔑 New Password: admin123');
    console.log('🌐 You can now login at: http://localhost:8081/');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetAdminPassword(); 