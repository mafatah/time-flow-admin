const { createClient } = require('@supabase/supabase-js');
const config = require('./env-config.cjs');

// Configuration validation
if (!config.supabase_url || !config.supabase_key) {
  console.error('❌ Missing required configuration:');
  console.error('   - supabase_url');
  console.error('   - supabase_key');
  console.error('Please run: node generate-env-config.cjs');
  process.exit(1);
}

console.log('🔧 Using configuration:', {
  hasUrl: !!config.supabase_url,
  hasKey: !!config.supabase_key,
  urlPreview: config.supabase_url ? config.supabase_url.substring(0, 30) + '...' : 'None'
});

const supabase = createClient(config.supabase_url, config.supabase_key);

async function createTestAuthUser() {
  console.log('🔐 Creating test authentication user...');
  
  const testUser = {
    email: 'test@timeflow.com',
    password: 'password123',
    full_name: 'Test User',
    role: 'employee'
  };
  
  try {
    // First, try to sign up the user (this creates the auth record)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: testUser.full_name,
          role: testUser.role
        }
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      
      // If user already exists, try to sign in to test credentials
      if (authError.message.includes('already been registered')) {
        console.log('⚠️ User already exists, testing login...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password
        });
        
        if (signInError) {
          console.error('❌ Cannot sign in with existing user:', signInError);
          console.log('');
          console.log('🔧 Try these credentials instead:');
          console.log(`   Email: ${testUser.email}`);
          console.log('   Password: (unknown - may need to reset)');
          return;
        } else {
          console.log('✅ Existing user login successful!');
          console.log(`   User ID: ${signInData.user.id}`);
          console.log(`   Email: ${signInData.user.email}`);
        }
      }
      return;
    }

    console.log('✅ Test authentication user created successfully:');
    console.log(`   User ID: ${authData.user?.id}`);
    console.log(`   Email: ${authData.user?.email}`);
    console.log(`   Email Confirmed: ${authData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log('');

    // Now create/update the user record in the users table
    if (authData.user) {
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: testUser.full_name,
          role: testUser.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.error('⚠️ Warning: Could not create user record:', userError);
      } else {
        console.log('✅ User record created in users table:');
        console.log(`   ID: ${userRecord.id}`);
        console.log(`   Name: ${userRecord.full_name}`);
        console.log(`   Role: ${userRecord.role}`);
      }
    }

    console.log('');
    console.log('🎯 Test Login Credentials:');
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Password: ${testUser.password}`);
    console.log('');
    console.log('✅ You can now use these credentials to login to the desktop app!');

  } catch (error) {
    console.error('❌ Failed to create test auth user:', error);
  }
}

createTestAuthUser(); 