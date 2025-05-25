import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fkpiqcxkmrtaetvfgcli.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProjectsLoad() {
  console.log('🧪 Testing projects load...');
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🔑 Supabase Key (first 20 chars):', supabaseKey.substring(0, 20) + '...');
  
  try {
    console.log('📡 Making request to projects table...');
    
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, description')
      .order('name');

    console.log('📡 Raw response:');
    console.log('  - data:', projectsData);
    console.log('  - error:', projectsError);
    
    if (projectsError) {
      console.error('❌ Error:', projectsError);
      return;
    }
    
    console.log('✅ Success!');
    console.log(`📊 Found ${projectsData?.length || 0} projects`);
    
    if (projectsData && projectsData.length > 0) {
      console.log('📋 Projects:');
      projectsData.forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name} (${project.id})`);
        if (project.description) {
          console.log(`     ${project.description}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testProjectsLoad(); 