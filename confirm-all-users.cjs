const { createClient } = require('@supabase/supabase-js');
const config = require('./env-config.cjs');

console.log('🔧 Attempting to confirm all users in database...');
const supabase = createClient(config.supabase_url, config.supabase_key);

async function confirmAllUsers() {
  try {
    console.log('📋 Checking database for user management options...');
    
    // Try to get all users from a users table (if exists)
    console.log('🔍 Looking for users table...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('email')
      .limit(10);
    
    if (usersError) {
      console.log('⚠️ No users table found:', usersError.message);
      console.log('This is normal - auth users are stored in auth.users');
    } else {
      console.log('✅ Found users table with', usersData.length, 'users');
      console.log('Users found:', usersData.map(u => u.email));
    }
    
    // Try to access auth.users directly (probably will fail)
    console.log('');
    console.log('🔍 Attempting to access auth.users table...');
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('email, email_confirmed_at')
      .limit(10);
    
    if (authError) {
      console.log('❌ Cannot access auth.users table:', authError.message);
      console.log('This is expected with anonymous access');
    } else {
      console.log('✅ Auth users found:', authUsers.length);
      authUsers.forEach(user => {
        console.log(`- ${user.email}: ${user.email_confirmed_at ? 'Confirmed' : 'Not confirmed'}`);
      });
    }
    
    // List known users from our previous tests
    console.log('');
    console.log('📋 Testing known user accounts...');
    const knownUsers = [
      { email: 'm_afatah@me.com', password: 'password123' },
      { email: 'test@timeflow.com', password: 'password123' },
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'demo@example.com', password: 'demo123' },
      { email: 'backup@example.com', password: 'backup123456' }
    ];
    
    const unconfirmedUsers = [];
    const confirmedUsers = [];
    
    for (const user of knownUsers) {
      console.log(`Testing ${user.email}...`);
      
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      
      if (loginError) {
        if (loginError.message.includes('Email not confirmed')) {
          console.log(`❌ ${user.email}: Email not confirmed`);
          unconfirmedUsers.push(user.email);
        } else if (loginError.message.includes('Invalid login credentials')) {
          console.log(`⚠️ ${user.email}: User doesn't exist or wrong password`);
        } else {
          console.log(`❌ ${user.email}: ${loginError.message}`);
        }
      } else {
        console.log(`✅ ${user.email}: Login successful (confirmed)`);
        confirmedUsers.push(user.email);
        
        // Sign out immediately
        await supabase.auth.signOut();
      }
    }
    
    console.log('');
    console.log('📊 SUMMARY:');
    console.log('✅ Confirmed users:', confirmedUsers.length);
    confirmedUsers.forEach(email => console.log(`  - ${email}`));
    console.log('❌ Unconfirmed users:', unconfirmedUsers.length);
    unconfirmedUsers.forEach(email => console.log(`  - ${email}`));
    
    // Resend confirmation emails for unconfirmed users
    if (unconfirmedUsers.length > 0) {
      console.log('');
      console.log('📧 Resending confirmation emails for unconfirmed users...');
      
      for (const email of unconfirmedUsers) {
        try {
          const { data: resendData, error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: email
          });
          
          if (resendError) {
            console.log(`❌ Failed to resend for ${email}:`, resendError.message);
          } else {
            console.log(`✅ Confirmation email resent for ${email}`);
          }
        } catch (err) {
          console.log(`❌ Error resending for ${email}:`, err.message);
        }
      }
    }
    
    console.log('');
    console.log('🛠️ RECOMMENDED ACTIONS:');
    console.log('');
    console.log('1. 🔧 DISABLE EMAIL CONFIRMATION (PERMANENT FIX):');
    console.log('   - Go to: https://supabase.com/dashboard/project/clypxuffvpqgmczbsblj/auth/settings');
    console.log('   - Find "Email confirmation" section');
    console.log('   - Toggle OFF "Enable email confirmations"');
    console.log('   - Save changes');
    console.log('   - This will allow all users to login without email confirmation');
    console.log('');
    console.log('2. 📧 CHECK EMAILS:');
    unconfirmedUsers.forEach(email => {
      console.log(`   - ${email}: Check inbox for confirmation email`);
    });
    console.log('');
    console.log('3. 🔄 USE PASSWORD RESET:');
    console.log('   - Users can use "Forgot Password" to reset and bypass confirmation');
    console.log('');
    console.log('4. 🎯 WORKING ACCOUNTS:');
    if (confirmedUsers.length > 0) {
      console.log('   - These accounts work immediately:');
      confirmedUsers.forEach(email => console.log(`   - ${email}`));
    } else {
      console.log('   - No confirmed accounts found');
      console.log('   - Disable email confirmation for immediate access');
    }
    
  } catch (err) {
    console.error('❌ Confirmation process error:', err.message);
  }
}

confirmAllUsers(); 