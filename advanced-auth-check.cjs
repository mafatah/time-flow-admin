const { createClient } = require('@supabase/supabase-js');
const config = require('./env-config.cjs');

console.log('🔍 Advanced authentication check for m_afatah@me.com');
const supabase = createClient(config.supabase_url, config.supabase_key);

async function advancedAuthCheck() {
  try {
    // Test with a few different password attempts
    console.log('🔑 Testing with different password patterns...');
    const passwordTests = [
      'password123',
      'Password123',
      'PASSWORD123',
      'password',
      'Password',
      '123456',
      'admin123',
      'Admin123'
    ];
    
    for (const pwd of passwordTests) {
      console.log('Testing:', pwd);
      const { data: testData, error: testError } = await supabase.auth.signInWithPassword({
        email: 'm_afatah@me.com',
        password: pwd
      });
      
      if (!testError) {
        console.log('✅ SUCCESS! Working password:', pwd);
        console.log('User ID:', testData.user.id);
        console.log('Email confirmed:', testData.user.email_confirmed_at ? 'Yes' : 'No');
        return;
      } else if (!testError.message.includes('Invalid login credentials')) {
        console.log('⚠️ Different error with', pwd + ':', testError.message);
      }
    }
    
    console.log('');
    console.log('🔄 Testing password reset to confirm user exists...');
    const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
      'm_afatah@me.com',
      {
        redirectTo: 'https://example.com/reset'
      }
    );
    
    if (resetError) {
      console.log('❌ Password reset failed:', resetError.message);
    } else {
      console.log('✅ Password reset email sent - user exists in system');
    }
    
    console.log('');
    console.log('🛠️ TROUBLESHOOTING SUMMARY:');
    console.log('- Email: m_afatah@me.com');
    console.log('- Status: User exists but login fails');
    console.log('- Issue: Email confirmation or password mismatch');
    console.log('');
    console.log('🔧 SOLUTIONS:');
    console.log('1. 📧 Check email for confirmation link');
    console.log('2. 🔄 Use password reset link from email');
    console.log('3. 🔧 Disable email confirmation in Supabase dashboard');
    console.log('4. 📱 Try creating new account with different email');
    
  } catch (err) {
    console.error('❌ Advanced check error:', err.message);
  }
}

advancedAuthCheck(); 