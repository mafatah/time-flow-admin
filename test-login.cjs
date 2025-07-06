const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing login credentials...');

const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MTQ4NjAsImV4cCI6MjA0ODI5MDg2MH0.Vk0X2FZnz4JGBNQwpVnpO_zW4Y4nfEEOhtjvGMPLUxs'
);

async function testLogin() {
  try {
    // Test both email variations
    const emails = ['m_afatah@me.com', 'm_Afatah@me.com'];
    
    for (const email of emails) {
      console.log(`\n📧 Testing email: ${email}`);
      
      // Test with your actual password
      const passwords = ['bombssS8@@'];
      
      for (const password of passwords) {
        try {
          console.log(`🔐 Trying password: ${password}`);
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
          });
          
          if (!error && data.user) {
            console.log(`✅ LOGIN SUCCESS with email: ${email} and password: ${password}`);
            console.log(`👤 User: ${data.user.email}`);
            console.log(`🆔 User ID: ${data.user.id}`);
            console.log(`📧 Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
            return;
          } else if (error) {
            console.log(`❌ Auth error: ${error.message}`);
            console.log(`   Code: ${error.code}`);
          }
        } catch (e) {
          console.log(`❌ Exception: ${e.message}`);
        }
      }
      
      // Check if user exists in users table
      console.log(`🔍 Checking if user exists in users table...`);
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email);
        
        if (userError) {
          console.log('❌ User query error:', userError.message);
        } else {
          console.log('✅ Found', userData.length, 'user(s) with this email');
          if (userData.length > 0) {
            console.log('   → User exists in database:');
            console.log('     ID:', userData[0].id);
            console.log('     Email:', userData[0].email);
            console.log('     Role:', userData[0].role);
            console.log('     Is Active:', userData[0].is_active);
          }
        }
      } catch (e) {
        console.log(`❌ User query exception: ${e.message}`);
      }
    }
    
    console.log('\n❌ Authentication failed for all email variations');
    console.log('💡 The user account may not exist or password may be incorrect');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLogin(); 