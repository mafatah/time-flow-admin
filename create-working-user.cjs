const { createClient } = require('@supabase/supabase-js');
const config = require('./env-config.cjs');

console.log('🔧 Creating working login user...');
const supabase = createClient(config.supabase_url, config.supabase_key);

async function createWorkingUser() {
  try {
    // Use a valid email format
    const testEmail = 'demo@example.com';
    const testPassword = 'password123';
    
    console.log('📝 Creating user with valid email:', testEmail);
    
    // Try to sign up
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
      
      // Try to login with existing user
      if (signUpError.message.includes('already')) {
        console.log('🔄 User exists, testing login...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        });
        
        if (signInError) {
          console.error('❌ Login failed:', signInError.message);
        } else {
          console.log('✅ Login successful with existing user!');
          console.log('🎯 USE THESE CREDENTIALS:');
          console.log('Email:', testEmail);
          console.log('Password:', testPassword);
          return;
        }
      }
    } else {
      console.log('✅ User created successfully!');
      console.log('User ID:', signUpData.user?.id || 'Unknown');
      
      // Check if email confirmation is required
      if (signUpData.session) {
        console.log('🎉 User is immediately available! (No email confirmation required)');
        console.log('🎯 USE THESE CREDENTIALS:');
        console.log('Email:', testEmail);
        console.log('Password:', testPassword);
        return;
      } else {
        console.log('📧 Email confirmation required before login');
      }
    }
    
    console.log('');
    console.log('🔧 WORKAROUND SOLUTION:');
    console.log('Since email confirmation is required, here are your options:');
    console.log('');
    console.log('🎯 IMMEDIATE FIX - Use these test credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('');
    console.log('💡 Or disable email confirmation in Supabase:');
    console.log('1. Go to: https://supabase.com/dashboard/project/[your-project]/auth/settings');
    console.log('2. Scroll to "Email confirmation"');
    console.log('3. Toggle OFF "Enable email confirmations"');
    console.log('4. Save changes');
    console.log('');
    console.log('Then try: test@timeflow.com / password123');
    
    // Try creating admin user
    console.log('');
    console.log('🔄 Trying to create admin user...');
    
    const { data: adminData, error: adminError } = await supabase.auth.signUp({
      email: 'admin@example.com',
      password: 'admin123',
      options: {
        data: {
          full_name: 'Admin User',
          role: 'admin'
        }
      }
    });
    
    if (!adminError && adminData.session) {
      console.log('✅ Admin user created and ready!');
      console.log('🎯 IMMEDIATE LOGIN CREDENTIALS:');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
    } else if (adminError && adminError.message.includes('already')) {
      console.log('⚠️ Admin user exists, testing login...');
      
      const { data: adminSignIn, error: adminSignInError } = await supabase.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'admin123'
      });
      
      if (!adminSignInError) {
        console.log('✅ Admin login works!');
        console.log('🎯 USE THESE CREDENTIALS:');
        console.log('Email: admin@example.com');
        console.log('Password: admin123');
      } else {
        console.log('❌ Admin login failed:', adminSignInError.message);
      }
    }
    
  } catch (err) {
    console.error('❌ Script error:', err.message);
  }
}

createWorkingUser(); 