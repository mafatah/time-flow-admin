const { createClient } = require('@supabase/supabase-js');
const config = require('./env-config.cjs');

console.log('🔧 Testing login and creating demo user...');
const supabase = createClient(config.supabase_url, config.supabase_key);

async function testAndFixLogin() {
  try {
    // Test with simple credentials
    const testEmail = 'demo@demo.com';
    const testPassword = 'demo123';
    
    console.log('📝 Testing with demo user:', testEmail);
    
    // Try to sign up first
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Demo User',
          role: 'employee'
        }
      }
    });
    
    if (signUpError) {
      console.log('⚠️ Signup error:', signUpError.message);
      
      // If user exists, try to sign in
      if (signUpError.message.includes('already')) {
        console.log('🔄 User exists, testing login...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        });
        
        if (signInError) {
          console.error('❌ Login failed:', signInError.message);
          
          if (signInError.message.includes('Email not confirmed')) {
            console.log('');
            console.log('🔧 EMAIL CONFIRMATION REQUIRED');
            console.log('This Supabase project requires email confirmation.');
            console.log('');
            console.log('🎯 SOLUTIONS:');
            console.log('1. Go to Supabase Dashboard > Authentication > Settings');
            console.log('2. Disable "Enable email confirmations"');
            console.log('3. Or check your email and confirm the account');
            console.log('');
            console.log('📧 Test credentials (once confirmed):');
            console.log('Email:', testEmail);
            console.log('Password:', testPassword);
          }
        } else {
          console.log('✅ Login successful!');
          console.log('User ID:', signInData.user.id);
          console.log('Email:', signInData.user.email);
          console.log('');
          console.log('🎯 USE THESE CREDENTIALS IN THE APP:');
          console.log('Email:', testEmail);
          console.log('Password:', testPassword);
        }
      }
    } else {
      console.log('✅ User created successfully!');
      console.log('User ID:', signUpData.user ? signUpData.user.id : 'Unknown');
      console.log('Email confirmed:', signUpData.user && signUpData.user.email_confirmed_at ? 'Yes' : 'No');
      
      if (signUpData.user && !signUpData.user.email_confirmed_at) {
        console.log('');
        console.log('⚠️ Email confirmation required before login');
        console.log('📧 Credentials for later use:');
        console.log('Email:', testEmail);
        console.log('Password:', testPassword);
      } else {
        console.log('');
        console.log('🎯 LOGIN CREDENTIALS READY:');
        console.log('Email:', testEmail);
        console.log('Password:', testPassword);
      }
    }
    
    // Also test the original user
    console.log('');
    console.log('🔄 Testing original user...');
    const { data: originalData, error: originalError } = await supabase.auth.signInWithPassword({
      email: 'test@timeflow.com',
      password: 'password123'
    });
    
    if (originalError) {
      console.log('❌ Original user login failed:', originalError.message);
    } else {
      console.log('✅ Original user login works!');
      console.log('Use: test@timeflow.com / password123');
    }
    
  } catch (err) {
    console.error('❌ Script error:', err.message);
  }
}

testAndFixLogin(); 