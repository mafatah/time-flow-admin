import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjects() {
  console.log('🔍 Checking projects in database...');
  
  try {
    // Check if any projects exist
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, description, created_at')
      .order('created_at', { ascending: false });
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError.message);
      return;
    }
    
    console.log(`📊 Found ${projects?.length || 0} projects:`);
    
    if (projects && projects.length > 0) {
      projects.forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})`);
        if (project.description) {
          console.log(`     Description: ${project.description}`);
        }
        console.log(`     Created: ${new Date(project.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('❌ No projects found in database!');
      console.log('');
      console.log('🔧 SOLUTION: You need to:');
      console.log('   1. Log in as admin (admin@timeflow.com / admin123)');
      console.log('   2. Go to Projects page');
      console.log('   3. Create some test projects');
      console.log('');
      
      // Create a test project
      console.log('🚀 Creating a test project...');
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          name: 'Test Project',
          description: 'A test project for employee time tracking'
        })
        .select()
        .single();
        
      if (createError) {
        console.error('❌ Failed to create test project:', createError.message);
        if (createError.message.includes('row-level security')) {
          console.log('');
          console.log('🚨 RLS BLOCKING PROJECT CREATION');
          console.log('   You need to log in as admin first and run:');
          console.log('   node fix-user-role.js');
          console.log('');
        }
      } else {
        console.log('✅ Test project created successfully:', newProject);
      }
    }
    
    // Test tasks table access
    console.log('🔍 Checking tasks table...');
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, project_id, user_id')
      .limit(5);
      
    if (tasksError) {
      console.error('❌ Error accessing tasks:', tasksError.message);
    } else {
      console.log(`📋 Found ${tasks?.length || 0} tasks in database`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkProjects(); 