import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fkpiqcxkmrtaetvfgcli.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4";

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestProjects() {
  console.log('🚀 Creating test projects...');
  
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
    }
  ];
  
  try {
    // Try to disable RLS temporarily (this might not work with anon key)
    console.log('⚠️  Note: This might fail due to RLS policies...');
    
    for (const project of testProjects) {
      console.log(`Creating project: ${project.name}`);
      
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
      .select('id, name');
      
    console.log(`\n📊 Total projects in database: ${allProjects?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\n🔧 If this failed due to RLS:');
  console.log('   1. Log in as admin in the web app');
  console.log('   2. Run: node fix-user-role.js');
  console.log('   3. Create projects manually in the Projects page');
}

createTestProjects(); 