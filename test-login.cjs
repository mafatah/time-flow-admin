const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing login credentials...');

const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MTQ4NjAsImV4cCI6MjA0ODI5MDg2MH0.Vk0X2FZnz4JGBNQwpVnpO_zW4Y4nfEEOhtjvGMPLUxs'
);

async function testLogin() {
  try {
    console.log('📧 Testing email: m_afatah@me.com');
    
    // Test common passwords
    const passwords = ['password', 'admin', 'test123', '123456', 'ebdaa', 'timeflow'];
    
    for (const password of passwords) {
      try {
        console.log(`🔐 Trying password: ${password}`);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'm_afatah@me.com',
          password: password
        });
        
        if (!error && data.user) {
          console.log(`✅ LOGIN SUCCESS with password: ${password}`);
          console.log(`👤 User: ${data.user.email}`);
          console.log(`🆔 User ID: ${data.user.id}`);
          return;
        }
      } catch (e) {
        // Continue to next password
      }
    }
    
    console.log('❌ None of the common passwords worked');
    console.log('💡 Try entering the password manually in the app');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLogin(); 