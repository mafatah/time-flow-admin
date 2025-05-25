const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(supabaseUrl, supabaseKey);

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