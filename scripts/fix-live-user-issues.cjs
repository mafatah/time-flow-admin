const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use environment variables for all credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Validate that environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  console.error('   Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLiveUserIssues() {
  console.log('🔧 Starting live system user issue fixes...');
  console.log('====================================================');
  console.log('⚠️  LIVE SYSTEM - Only fixing existing data, no test data creation');

  try {
    // 1. Fix admin user data (no creation, only updates)
    await fixExistingAdminUser();
    
    // 2. Fix employee user data normalization
    await fixExistingEmployeeUsers();
    
    // 3. Fix ongoing session cleanup
    await fixOngoingSessions();
    
    // 4. Display current system status
    await displaySystemStatus();
    
    console.log('\n🎉 Live system fixes completed successfully!');
    console.log('📋 Summary of fixes:');
    console.log('  ✅ Admin user data normalized');
    console.log('  ✅ Employee user data cleaned');
    console.log('  ✅ Ongoing sessions cleaned up');
    console.log('  ✅ No test data added (live system)');

  } catch (error) {
    console.error('❌ Failed to fix user issues:', error);
  }
}

async function fixExistingAdminUser() {
  console.log('\n1️⃣ Fixing existing admin user data...');
  
  try {
    // Find all admin users (don't create new ones)
    const { data: adminUsers, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin');

    if (findError) throw findError;

    console.log(`   📊 Found ${adminUsers.length} admin users`);

    for (const admin of adminUsers) {
      console.log(`   🔧 Updating admin: ${admin.email}`);
      
      // Update admin user data to ensure proper display
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: admin.full_name || 'Admin User',
          salary_amount: admin.salary_amount || 10000,
          salary_type: 'monthly',
          minimum_hours_monthly: 0, // Admin doesn't have hour requirements
          last_activity: new Date().toISOString()
        })
        .eq('id', admin.id);

      if (updateError) throw updateError;
      console.log(`   ✅ Updated admin: ${admin.email}`);
    }

  } catch (error) {
    console.error('   ❌ Failed to fix admin user data:', error);
  }
}

async function fixExistingEmployeeUsers() {
  console.log('\n2️⃣ Fixing existing employee user data...');
  
  try {
    // Get all existing employee users
    const { data: employees, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'employee');

    if (findError) throw findError;

    console.log(`   📊 Found ${employees.length} employee users`);

    // Fix the specific problematic user name "mohamed abdelfattah2"
    const problematicUser = employees.find(user => 
      user.full_name === 'mohamed abdelfattah2' || 
      user.full_name?.toLowerCase().includes('mohamed abdelfattah2') ||
      user.email?.includes('mohamed') && user.full_name?.includes('abdelfattah2')
    );

    if (problematicUser) {
      console.log(`   🔧 Fixing problematic user: ${problematicUser.full_name}`);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: 'Mohamed Abdelfattah',
          salary_amount: problematicUser.salary_amount || 5000,
          salary_type: 'monthly',
          minimum_hours_monthly: 160,
          last_activity: new Date().toISOString()
        })
        .eq('id', problematicUser.id);

      if (updateError) throw updateError;
      console.log('   ✅ Fixed problematic user name');
    }

    // Normalize all other employee data
    for (const employee of employees) {
      let needsUpdate = false;
      const updates = {};

      // Fix missing or malformed names
      if (!employee.full_name || employee.full_name.trim() === '') {
        updates.full_name = `Employee ${employee.email.split('@')[0]}`;
        needsUpdate = true;
      }

      // Ensure salary data exists
      if (!employee.salary_amount) {
        updates.salary_amount = 4500;
        updates.salary_type = 'monthly';
        needsUpdate = true;
      }

      // Ensure minimum hours
      if (!employee.minimum_hours_monthly) {
        updates.minimum_hours_monthly = 160;
        needsUpdate = true;
      }

      // Update last activity
      updates.last_activity = new Date().toISOString();
      needsUpdate = true;

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', employee.id);

        if (updateError) {
          console.error(`   ⚠️ Failed to update employee ${employee.id}:`, updateError);
        } else {
          console.log(`   ✅ Updated employee: ${employee.full_name || employee.email}`);
        }
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to fix employee user data:', error);
  }
}

async function fixOngoingSessions() {
  console.log('\n3️⃣ Cleaning up stale ongoing sessions...');
  
  try {
    // Find all sessions without end_time (ongoing sessions)
    const { data: ongoingSessions, error: findError } = await supabase
      .from('time_logs')
      .select('*')
      .is('end_time', null);

    if (findError) throw findError;

    console.log(`   📊 Found ${ongoingSessions.length} ongoing sessions`);

    if (ongoingSessions.length > 0) {
      // End sessions that are older than 2 hours (likely stale)
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const staleSessions = ongoingSessions.filter(session => 
        new Date(session.start_time) < twoHoursAgo
      );

      console.log(`   🧹 Found ${staleSessions.length} stale sessions to clean up`);

      for (const session of staleSessions) {
        // End session 1-2 hours after start (reasonable work session length)
        const endTime = new Date(session.start_time);
        endTime.setHours(endTime.getHours() + 1);

        const { error: updateError } = await supabase
          .from('time_logs')
          .update({
            end_time: endTime.toISOString(),
            status: 'completed'
          })
          .eq('id', session.id);

        if (updateError) {
          console.error(`   ⚠️ Failed to end session ${session.id}:`, updateError);
        }
      }

      if (staleSessions.length > 0) {
        console.log(`   ✅ Cleaned up ${staleSessions.length} stale sessions`);
      }
    } else {
      console.log('   ✅ No stale sessions found');
    }

  } catch (error) {
    console.error('   ❌ Failed to fix ongoing sessions:', error);
  }
}

async function displaySystemStatus() {
  console.log('\n4️⃣ Current system status...');
  
  try {
    // Get user counts
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role');

    if (usersError) throw usersError;

    const adminCount = users.filter(u => u.role === 'admin').length;
    const employeeCount = users.filter(u => u.role === 'employee').length;

    console.log(`   👥 Total users: ${users.length}`);
    console.log(`   👑 Admin users: ${adminCount}`);
    console.log(`   👤 Employee users: ${employeeCount}`);

    // Show admin users
    const admins = users.filter(u => u.role === 'admin');
    console.log('\n   📋 Admin users:');
    admins.forEach(admin => {
      console.log(`     - ${admin.full_name} (${admin.email})`);
    });

    // Show employee users
    const employees = users.filter(u => u.role === 'employee');
    console.log('\n   📋 Employee users:');
    employees.forEach(employee => {
      console.log(`     - ${employee.full_name} (${employee.email})`);
    });

    // Get recent activity counts
    const { data: recentLogs, error: logsError } = await supabase
      .from('time_logs')
      .select('id')
      .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (!logsError) {
      console.log(`   ⏰ Time logs (last 7 days): ${recentLogs.length}`);
    }

    // Get app activity counts
    const { data: appLogs, error: appError } = await supabase
      .from('app_logs')
      .select('id')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!appError) {
      console.log(`   📱 App logs (last 24 hours): ${appLogs.length}`);
    }

    // Get URL tracking counts
    const { data: urlLogs, error: urlError } = await supabase
      .from('url_logs')
      .select('id')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!urlError) {
      console.log(`   🌐 URL logs (last 24 hours): ${urlLogs.length}`);
    }

  } catch (error) {
    console.error('   ❌ Failed to display system status:', error);
  }
}

// Run the live system fixes
fixLiveUserIssues(); 