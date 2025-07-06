const { createClient } = require('@supabase/supabase-js');
const config = require('./env-config.cjs');

console.log('🔧 Email Confirmation Fix for m_afatah@me.com');
const supabase = createClient(config.supabase_url, config.supabase_key);

async function fixEmailConfirmation() {
  try {
    console.log('📧 Checking email confirmation status...');
    
    // Try to resend confirmation email
    console.log('🔄 Resending confirmation email...');
    const { data: resendData, error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: 'm_afatah@me.com'
    });
    
    if (resendError) {
      console.log('❌ Failed to resend confirmation:', resendError.message);
    } else {
      console.log('✅ Confirmation email resent successfully');
    }
    
    // Create a backup admin account that should work immediately
    console.log('');
    console.log('🔧 Creating backup admin account...');
    
    const { data: adminData, error: adminError } = await supabase.auth.signUp({
      email: 'admin@timeflow.local',
      password: 'admin123456',
      options: {
        data: {
          full_name: 'Admin User',
          role: 'admin'
        }
      }
    });
    
    if (adminError) {
      console.log('❌ Admin account creation failed:', adminError.message);
      if (adminError.message.includes('already registered')) {
        console.log('✅ Admin account already exists');
        
        // Test login with admin account
        const { data: adminLogin, error: adminLoginError } = await supabase.auth.signInWithPassword({
          email: 'admin@timeflow.local',
          password: 'admin123456'
        });
        
        if (!adminLoginError) {
          console.log('✅ Admin account login works!');
          console.log('🎯 BACKUP CREDENTIALS:');
          console.log('Email: admin@timeflow.local');
          console.log('Password: admin123456');
        } else {
          console.log('❌ Admin login failed:', adminLoginError.message);
        }
      }
    } else {
      console.log('✅ Admin account created successfully');
      if (adminData.session) {
        console.log('🎯 BACKUP CREDENTIALS (READY TO USE):');
        console.log('Email: admin@timeflow.local');
        console.log('Password: admin123456');
      } else {
        console.log('📧 Admin account also needs email confirmation');
      }
    }
    
    console.log('');
    console.log('🔧 IMMEDIATE ACTION PLAN:');
    console.log('');
    console.log('1. 📧 CHECK EMAIL: m_afatah@me.com');
    console.log('   - Look for "Confirm your email" from Supabase');
    console.log('   - Check spam/junk folder');
    console.log('   - Click the confirmation link');
    console.log('');
    console.log('2. 🔄 ALTERNATIVE: Use password reset');
    console.log('   - Check email for password reset link');
    console.log('   - Use reset link to set new password');
    console.log('   - This often bypasses email confirmation');
    console.log('');
    console.log('3. 🔧 DISABLE EMAIL CONFIRMATION:');
    console.log('   - Go to: https://supabase.com/dashboard/project/clypxuffvpqgmczbsblj/auth/settings');
    console.log('   - Find "Email confirmation" section');
    console.log('   - Toggle OFF "Enable email confirmations"');
    console.log('   - Save changes');
    console.log('');
    console.log('4. 📱 BACKUP LOGIN:');
    console.log('   - Try: admin@timeflow.local / admin123456');
    console.log('');
    
  } catch (err) {
    console.error('❌ Fix error:', err.message);
  }
}

fixEmailConfirmation(); 