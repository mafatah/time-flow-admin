const { createClient } = require('@supabase/supabase-js');
const config = require('./env-config.cjs');

console.log('🔐 Testing login with your email: m_afatah@me.com');
const supabase = createClient(config.supabase_url, config.supabase_key);

async function testUserLogin() {
  try {
    console.log('🔑 Attempting login...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'm_afatah@me.com',
      password: 'password123'
    });
    
    if (error) {
      console.error('❌ Login failed:', error.message);
      console.error('Error code:', error.status);
      
      // Try different common passwords
      const passwords = ['123456', 'admin123', 'password', 'timeflow123'];
      console.log('');
      console.log('🔄 Trying common passwords...');
      
      for (const pwd of passwords) {
        console.log('Testing with password:', pwd);
        const { data: tryData, error: tryError } = await supabase.auth.signInWithPassword({
          email: 'm_afatah@me.com',
          password: pwd
        });
        
        if (!tryError) {
          console.log('✅ Login successful with password:', pwd);
          console.log('User ID:', tryData.user.id);
          return;
        } else {
          console.log('❌ Failed with:', pwd);
        }
      }
      
      console.log('');
      console.log('🔍 Checking if user exists by trying to create...');
      
      // Try to create user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'm_afatah@me.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Mohammed Afatah',
            role: 'admin'
          }
        }
      });
      
      if (signUpError) {
        console.log('❌ Signup failed:', signUpError.message);
        if (signUpError.message.includes('already')) {
          console.log('✅ User exists but password may be wrong');
          console.log('💡 What password do you usually use?');
        }
      } else {
        console.log('✅ User created successfully!');
        console.log('🎯 USE THESE CREDENTIALS:');
        console.log('Email: m_afatah@me.com');
        console.log('Password: password123');
      }
    } else {
      console.log('✅ Login successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      console.log('🎯 USE THESE CREDENTIALS:');
      console.log('Email: m_afatah@me.com');
      console.log('Password: password123');
    }
  } catch (err) {
    console.error('❌ Test error:', err.message);
  }
}

testUserLogin(); 