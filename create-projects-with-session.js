import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createProjectsWithAuth() {
  console.log('🚀 Creating projects with authentication...');
  
  // First, try to sign in as admin
  console.log('🔐 Signing in as admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@timeflow.com',
    password: 'admin123456'
  });
  
  if (authError) {
    console.error('❌ Failed to sign in as admin:', authError.message);
    return;
  }
  
  console.log('✅ Signed in as admin successfully');
  
  const testProjects = [
    {
      name: 'Website Development',
      description: 'Frontend and backend development tasks'
    },
    {
      name: 'Mobile App',
      description: 'iOS and Android mobile application'
    },
    {
      name: 'Marketing Campaign',
      description: 'Social media and advertising campaigns'
    },
    {
      name: 'Data Analysis',
      description: 'Business intelligence and reporting'
    }
  ];
  
  try {
    console.log('📝 Creating projects...');
    
    for (const project of testProjects) {
      console.log(`Creating: ${project.name}`);
      
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();
        
      if (error) {
        console.error(`❌ Failed to create ${project.name}:`, error.message);
      } else {
        console.log(`✅ Created ${project.name} (ID: ${data.id})`);
      }
    }
    
    // Check final count
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, name, description');
      
    console.log(`\n📊 Total projects in database: ${allProjects?.length || 0}`);
    
    if (allProjects && allProjects.length > 0) {
      console.log('\n📋 Available projects:');
      allProjects.forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name}`);
        if (project.description) {
          console.log(`     ${project.description}`);
        }
      });
    }
    
    console.log('\n✅ Projects created successfully!');
    console.log('🔄 Now refresh the employee time tracker page to see the projects.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createProjectsWithAuth(); 