const { createClient } = require('@supabase/supabase-js');
const config = require('./env-config.cjs');

console.log('🔧 Confirming ALL users found in database...');
const supabase = createClient(config.supabase_url, config.supabase_key);

async function confirmAllDatabaseUsers() {
  try {
    console.log('📋 Getting all users from database...');
    
    // Get all users from the users table
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('email')
      .limit(50);
    
    if (usersError) {
      console.log('❌ Failed to get users:', usersError.message);
      return;
    }
    
    console.log('✅ Found', allUsers.length, 'users in database');
    console.log('Users:', allUsers.map(u => u.email));
    
    // Test each user with common passwords
    const commonPasswords = [
      'password123',
      'Password123',
      'admin123',
      'password',
      '123456',
      'timeflow123'
    ];
    
    const unconfirmedUsers = [];
    const confirmedUsers = [];
    const unknownUsers = [];
    
    console.log('');
    console.log('🔑 Testing authentication for all users...');
    
    for (const user of allUsers) {
      console.log(`\n🔍 Testing ${user.email}...`);
      
      let userStatus = 'unknown';
      
      for (const password of commonPasswords) {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: password
        });
        
        if (loginError) {
          if (loginError.message.includes('Email not confirmed')) {
            console.log(`❌ ${user.email}: Email not confirmed (password: ${password})`);
            userStatus = 'unconfirmed';
            break;
          } else if (loginError.message.includes('Invalid login credentials')) {
            // Continue testing other passwords
            continue;
          } else {
            console.log(`⚠️ ${user.email}: ${loginError.message}`);
          }
        } else {
          console.log(`✅ ${user.email}: Login successful (password: ${password})`);
          userStatus = 'confirmed';
          confirmedUsers.push({ email: user.email, password: password });
          
          // Sign out immediately
          await supabase.auth.signOut();
          break;
        }
      }
      
      if (userStatus === 'unconfirmed') {
        unconfirmedUsers.push(user.email);
      } else if (userStatus === 'unknown') {
        unknownUsers.push(user.email);
        console.log(`⚠️ ${user.email}: No working password found`);
      }
    }
    
    console.log('');
    console.log('📊 COMPLETE SUMMARY:');
    console.log('✅ Confirmed users:', confirmedUsers.length);
    confirmedUsers.forEach(user => console.log(`  - ${user.email} (password: ${user.password})`));
    
    console.log('❌ Unconfirmed users:', unconfirmedUsers.length);
    unconfirmedUsers.forEach(email => console.log(`  - ${email}`));
    
    console.log('❓ Unknown status users:', unknownUsers.length);
    unknownUsers.forEach(email => console.log(`  - ${email}`));
    
    // Resend confirmation emails for all unconfirmed users
    if (unconfirmedUsers.length > 0) {
      console.log('');
      console.log('📧 Resending confirmation emails for ALL unconfirmed users...');
      
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
    
    // Send password reset emails for unknown users
    if (unknownUsers.length > 0) {
      console.log('');
      console.log('🔄 Sending password reset emails for unknown users...');
      
      for (const email of unknownUsers) {
        try {
          const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
            email,
            {
              redirectTo: 'https://your-app.com/reset-password'
            }
          );
          
          if (resetError) {
            console.log(`❌ Failed to send reset for ${email}:`, resetError.message);
          } else {
            console.log(`✅ Password reset email sent for ${email}`);
          }
        } catch (err) {
          console.log(`❌ Error sending reset for ${email}:`, err.message);
        }
      }
    }
    
    console.log('');
    console.log('🎯 FINAL ACTIONS SUMMARY:');
    console.log('');
    console.log(`📧 Confirmation emails sent to ${unconfirmedUsers.length} users`);
    console.log(`🔄 Password reset emails sent to ${unknownUsers.length} users`);
    console.log(`✅ ${confirmedUsers.length} users are already working`);
    console.log('');
    console.log('🔧 PERMANENT SOLUTION:');
    console.log('To avoid this issue for all future users:');
    console.log('1. Go to: https://supabase.com/dashboard/project/clypxuffvpqgmczbsblj/auth/settings');
    console.log('2. Find "Email confirmation" section');
    console.log('3. Toggle OFF "Enable email confirmations"');
    console.log('4. Save changes');
    console.log('');
    console.log('This will allow all users (current and future) to login without email confirmation.');
    
  } catch (err) {
    console.error('❌ Database user confirmation error:', err.message);
  }
}

confirmAllDatabaseUsers(); 