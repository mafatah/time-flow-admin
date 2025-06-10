import { supabase } from './src/integrations/supabase/client.js';

async function upgradeUserToAdmin() {
  console.log('🔧 Upgrading User to Admin Role...\n');

  try {
    // Get current user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session Error:', sessionError.message);
      return;
    }

    if (!session) {
      console.log('❌ No active session found. Please log in first.');
      return;
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    console.log('👤 Current user:', userEmail);

    // Check current role
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching user:', fetchError.message);
      return;
    }

    console.log('📋 Current role:', currentUser.role);

    if (currentUser.role === 'admin') {
      console.log('✅ User already has admin role!');
      return;
    }

    // Upgrade to admin
    console.log('🔄 Upgrading role to admin...');
    const { data, error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userId)
      .select();

    if (updateError) {
      console.error('❌ Error upgrading role:', updateError.message);
      return;
    }

    console.log('✅ Successfully upgraded to admin role!');
    console.log('📍 Please refresh your browser and try accessing the time reports page again');
    console.log('📍 URL: http://localhost:8080/reports/time-reports');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the upgrade function
upgradeUserToAdmin().then(() => {
  console.log('\n✅ Upgrade process complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Upgrade failed:', error);
  process.exit(1);
}); 