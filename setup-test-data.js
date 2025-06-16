import { createClient } from '@supabase/supabase-js';
import "dotenv/config";
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupTestData() {
  console.log('🚀 Setting up test data for activity monitoring...');

  try {
    // Create a test user
    const testUser = {
      email: 'test@timeflow.com',
      full_name: 'Test User',
      role: 'admin'
    };

    console.log('👤 Creating test user...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single();

    if (userError) {
      console.error('❌ Failed to create user:', userError);
      return;
    }

    console.log('✅ Test user created:', userData.id);

    // Create a test project
    const testProject = {
      name: 'Activity Monitoring Test Project',
      description: 'Project for testing always-on activity monitoring'
    };

    console.log('📁 Creating test project...');
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single();

    if (projectError) {
      console.error('❌ Failed to create project:', projectError);
      return;
    }

    console.log('✅ Test project created:', projectData.id);

    // Create a test task
    const testTask = {
      project_id: projectData.id,
      name: 'Activity Monitoring Task',
      user_id: userData.id
    };

    console.log('📋 Creating test task...');
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert(testTask)
      .select()
      .single();

    if (taskError) {
      console.error('❌ Failed to create task:', taskError);
      return;
    }

    console.log('✅ Test task created:', taskData.id);

    console.log('\n🎉 Test data setup complete!');
    console.log('\n📋 Test Data Summary:');
    console.log(`User ID: ${userData.id}`);
    console.log(`User Email: ${userData.email}`);
    console.log(`Project ID: ${projectData.id}`);
    console.log(`Project Name: ${projectData.name}`);
    console.log(`Task ID: ${taskData.id}`);
    console.log(`Task Name: ${taskData.name}`);

    console.log('\n🔧 Next steps:');
    console.log('1. Start the desktop app: npm start');
    console.log('2. Log in with email: test@timeflow.com');
    console.log('3. Navigate to Time Tracker');
    console.log('4. Select the test task and start tracking');
    console.log('5. Screenshots should start capturing every 20 seconds');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupTestData(); 