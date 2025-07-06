const { createClient } = require('@supabase/supabase-js');
const config = require('./env-config.cjs');

console.log('🔧 Creating working test account...');
const supabase = createClient(config.supabase_url, config.supabase_key);

async function createWorkingAccount() {
  try {
    // Try creating account with simple email
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@timeflow.app',
      password: 'timeflow2024',
      options: {
        data: {
          full_name: 'Admin User',
          role: 'admin'
        }
      }
    });
    
    if (error) {
      console.log('❌ Account creation failed:', error.message);
      
      if (error.message.includes('already registered')) {
        console.log('✅ Account already exists, testing login...');
        
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: 'admin@timeflow.app',
          password: 'timeflow2024'
        });
        
        if (!loginError) {
          console.log('🎉 WORKING ACCOUNT FOUND!');
          console.log('✅ Email: admin@timeflow.app');
          console.log('✅ Password: timeflow2024');
          console.log('✅ Status: Ready to use immediately');
        } else {
          console.log('❌ Login failed:', loginError.message);
        }
      }
    } else {
      console.log('✅ Account created successfully');
      if (data.session) {
        console.log('🎉 ACCOUNT READY TO USE!');
        console.log('✅ Email: admin@timeflow.app');
        console.log('✅ Password: timeflow2024');
        console.log('✅ Status: Immediately accessible');
      } else {
        console.log('📧 Account needs email confirmation');
      }
    }
    
    console.log('');
    console.log('🎯 SUMMARY:');
    console.log('Current Status: m_afatah@me.com still needs email confirmation');
    console.log('Solution: Disable email confirmation in Supabase dashboard');
    console.log('Temporary: Try admin@timeflow.app / timeflow2024');
    
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

createWorkingAccount(); 