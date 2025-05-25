import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fkpiqcxkmrtaetvfgcli.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmployeeFlow() {
  console.log('🧪 Testing complete employee authentication flow...');
  
  try {
    // Step 1: Sign in as employee
    console.log('\n🔐 Step 1: Signing in as employee...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'employee@timeflow.com',
      password: 'employee123456'
    });
    
    if (authError) {
      console.error('❌ Failed to sign in:', authError.message);
      return;
    }
    
    console.log('✅ Signed in successfully');
    console.log('👤 User:', authData.user.email);
    console.log('🆔 User ID:', authData.user.id);
    
    // Step 2: Get user details from users table
    console.log('\n📋 Step 2: Fetching user details...');
    const { data: userDetails, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, avatar_url')
      .eq('id', authData.user.id)
      .single();
    
    if (userError) {
      console.error('❌ Failed to fetch user details:', userError.message);
      console.error('❌ This might mean the user doesn\'t exist in the users table');
    } else {
      console.log('✅ User details fetched:');
      console.log('  - ID:', userDetails.id);
      console.log('  - Email:', userDetails.email);
      console.log('  - Name:', userDetails.full_name);
      console.log('  - Role:', userDetails.role);
    }
    
    // Step 3: Try to fetch projects
    console.log('\n📡 Step 3: Fetching projects...');
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, description')
      .order('name');
    
    console.log('Projects result:');
    console.log('  - data:', projectsData);
    console.log('  - error:', projectsError);
    console.log(`  - count: ${projectsData?.length || 0}`);
    
    if (projectsData && projectsData.length > 0) {
      console.log('\n📋 Available projects:');
      projectsData.forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name} (${project.id})`);
        if (project.description) {
          console.log(`     ${project.description}`);
        }
      });
    } else {
      console.log('\n⚠️ No projects found - this might be an RLS policy issue');
    }
    
    // Step 4: Test creating a task
    if (projectsData && projectsData.length > 0 && userDetails) {
      console.log('\n🔧 Step 4: Testing task creation...');
      const firstProject = projectsData[0];
      
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert({
          name: `Test task for ${firstProject.name}`,
          project_id: firstProject.id,
          user_id: userDetails.id
        })
        .select('id, name')
        .single();
      
      if (taskError) {
        console.error('❌ Failed to create task:', taskError.message);
      } else {
        console.log('✅ Task created successfully:', taskData);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testEmployeeFlow(); 