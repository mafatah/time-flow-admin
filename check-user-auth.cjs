const { createClient } = require('@supabase/supabase-js');

// Use the correct credentials from the desktop agent
const client = createClient(
  'https://clypxuffvpqgmczbsblj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNseXB4dWZmdnBxZ21jemJzYmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjc2NjcsImV4cCI6MjA2NTkwMzY2N30._h0BlKG10Ri4yf2W-BH7yGf_WCNArqRkXCtSuYTkVQ8'
);

async function checkUserAuth() {
  try {
    console.log('🔍 Testing authentication for m_Afatah@me.com...');
    
    // First, try to sign in to see the exact error
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: 'm_Afatah@me.com',
      password: 'bombssS8@@'
    });
    
    if (authError) {
      console.log('❌ Authentication error:', authError.message);
      console.log('   Error code:', authError.code || 'unknown');
      console.log('   Error status:', authError.status || 'unknown');
      
      // Check if user exists in the users table
      console.log('\n🔍 Checking if user exists in users table...');
      const { data: userData, error: userError } = await client
        .from('users')
        .select('*')
        .eq('email', 'm_Afatah@me.com')
        .single();
      
      if (userError) {
        console.log('❌ Error querying users table:', userError.message);
        if (userError.code === 'PGRST116') {
          console.log('   → User does NOT exist in users table');
          console.log('   → This user needs to be created first');
        }
      } else {
        console.log('✅ User found in users table:');
        console.log('   ID:', userData.id);
        console.log('   Email:', userData.email);
        console.log('   Role:', userData.role);
        console.log('   Created at:', userData.created_at);
        console.log('   Is active:', userData.is_active);
      }
      
    } else {
      console.log('✅ Authentication successful!');
      console.log('   User ID:', authData.user.id);
      console.log('   Email:', authData.user.email);
      console.log('   Email confirmed:', authData.user.email_confirmed_at ? 'Yes' : 'No');
      console.log('   Created at:', authData.user.created_at);
      console.log('   Last sign in:', authData.user.last_sign_in_at);
    }
    
  } catch (error) {
    console.error('🚨 Unexpected error:', error);
  }
}

checkUserAuth(); 