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

async function createTestEmployee() {
  console.log('👤 Creating test employee user...');
  
  try {
    // Create the employee user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: 'employee@timeflow.com',
        full_name: 'Test Employee',
        role: 'employee'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating user:', error);
      return;
    }

    console.log('✅ Test employee created successfully:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.full_name}`);
    console.log(`   Role: ${user.role}`);
    console.log('');

    // Also create a default task for the employee
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        name: 'General Work',
        description: 'Default task for time tracking',
        user_id: user.id
      })
      .select()
      .single();

    if (taskError) {
      console.error('⚠️ Warning: Could not create default task:', taskError);
    } else {
      console.log('✅ Default task created:');
      console.log(`   Task ID: ${task.id}`);
      console.log(`   Task Name: ${task.name}`);
      console.log('');
    }

    console.log('📝 Update desktop-agent/config.json with:');
    console.log(`   "user_id": "${user.id}"`);
    console.log('');
    console.log('🎯 You can now use this user for the desktop agent!');

  } catch (error) {
    console.error('❌ Failed to create test employee:', error);
  }
}

createTestEmployee(); 