import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProjectsWithAuth() {
  console.log('🧪 Testing projects load with authentication...');
  
  try {
    // Test 1: Anonymous access
    console.log('\n📡 Test 1: Anonymous access');
    const { data: anonData, error: anonError } = await supabase
      .from('projects')
      .select('id, name, description')
      .order('name');
    
    console.log('Anonymous result:');
    console.log('  - data:', anonData);
    console.log('  - error:', anonError);
    console.log(`  - count: ${anonData?.length || 0}`);
    
    // Test 2: Sign in as employee
    console.log('\n🔐 Test 2: Signing in as employee...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'employee@timeflow.com',
      password: 'employee123456'
    });
    
    if (authError) {
      console.error('❌ Failed to sign in as employee:', authError.message);
      
      // Try admin instead
      console.log('\n🔐 Test 2b: Trying admin login...');
      const { data: adminAuthData, error: adminAuthError } = await supabase.auth.signInWithPassword({
        email: 'admin@timeflow.com',
        password: 'admin123456'
      });
      
      if (adminAuthError) {
        console.error('❌ Failed to sign in as admin:', adminAuthError.message);
        return;
      }
      
      console.log('✅ Signed in as admin successfully');
    } else {
      console.log('✅ Signed in as employee successfully');
    }
    
    // Test 3: Authenticated access
    console.log('\n📡 Test 3: Authenticated access');
    const { data: authProjectsData, error: authProjectsError } = await supabase
      .from('projects')
      .select('id, name, description')
      .order('name');
    
    console.log('Authenticated result:');
    console.log('  - data:', authProjectsData);
    console.log('  - error:', authProjectsError);
    console.log(`  - count: ${authProjectsData?.length || 0}`);
    
    if (authProjectsData && authProjectsData.length > 0) {
      console.log('\n📋 Projects found:');
      authProjectsData.forEach((project, index) => {
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

testProjectsWithAuth(); 