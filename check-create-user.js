const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkAndCreateUser() {
  console.log('🔍 Checking database connection...');
  
  try {
    // Test connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return;
    }
    console.log('✅ Database connection successful');
    
    // Check if m_Afatah@me.com exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'm_Afatah@me.com')
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', checkError.message);
      return;
    }
    
    if (existingUser) {
      console.log('✅ User m_Afatah@me.com already exists in database');
      console.log('User details:', { 
        id: existingUser.id, 
        email: existingUser.email, 
        role: existingUser.role,
        full_name: existingUser.full_name 
      });
    } else {
      console.log('ℹ️ User m_Afatah@me.com does not exist, creating...');
      
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'm_Afatah@me.com',
        password: 'afatah123456', // Default password - you can change this
        options: {
          data: {
            full_name: 'Mohammed Afatah',
            role: 'employee'
          }
        }
      });
      
      if (authError) {
        console.error('❌ Failed to create auth user:', authError.message);
        
        // If user already exists in auth but not in users table, that's different
        if (authError.message.includes('already registered')) {
          console.log('🔍 User exists in auth, checking users table...');
          // The user might exist in auth.users but not in public.users
        }
      } else {
        console.log('✅ Auth user created successfully!');
        console.log('📧 Email: m_Afatah@me.com');
        console.log('🔑 Password: afatah123456');
        console.log('👤 Role: employee');
        console.log('');
        console.log('🎉 You can now login with:');
        console.log('  Email: m_Afatah@me.com');
        console.log('  Password: afatah123456');
      }
    }
    
    // Also test the employee@timeflow.com login
    console.log('');
    console.log('🧪 Testing employee@timeflow.com login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'employee@timeflow.com',
      password: 'employee123456'
    });
    
    if (loginError) {
      console.error('❌ Employee login test failed:', loginError.message);
    } else {
      console.log('✅ Employee login test successful!');
      // Sign out immediately
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

checkAndCreateUser(); 