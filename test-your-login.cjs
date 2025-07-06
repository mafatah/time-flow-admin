const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing login with your credentials...');

const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MTQ4NjAsImV4cCI6MjA0ODI5MDg2MH0.Vk0X2FZnz4JGBNQwpVnpO_zW4Y4nfEEOhtjvGMPLUxs'
);

async function testLogin() {
  try {
    // Test both email variations
    const emailVariations = ['m_Afatah@me.com', 'm_afatah@me.com'];
    
    for (const email of emailVariations) {
      console.log(`\n📧 Testing email: ${email}`);
      console.log('🔐 Testing with password: bombssS8@@');
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'bombssS8@@'
      });
      
      if (authError) {
        console.log('❌ Auth error:', authError.message);
        console.log('   Error code:', authError.code);
        
        // Check if user exists in users table
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
      } else {
        console.log('✅ Authentication successful!');
        console.log('   User ID:', authData.user.id);
        console.log('   Email:', authData.user.email);
        console.log('   Email confirmed:', authData.user.email_confirmed_at ? 'Yes' : 'No');
        return; // Stop testing once we find a working combination
      }
    }
  } catch (error) {
    console.error('🚨 Error:', error);
  }
}

testLogin(); 