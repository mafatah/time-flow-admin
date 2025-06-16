import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProjectsRLS() {
  console.log('🔧 Fixing projects RLS policies...');
  
  try {
    // Sign in as admin to have permissions to modify RLS
    console.log('🔐 Signing in as admin...');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@timeflow.com',
      password: 'admin123456'
    });
    
    if (authError) {
      console.error('❌ Failed to sign in as admin:', authError.message);
      return;
    }
    
    console.log('✅ Signed in as admin');
    
    // The RLS policies need to be updated in the Supabase dashboard or via SQL
    // Let's try to create a policy that allows all authenticated users to read projects
    
    console.log('\n📋 Current projects (admin view):');
    const { data: adminProjects, error: adminError } = await supabase
      .from('projects')
      .select('id, name, description')
      .order('name');
    
    if (adminError) {
      console.error('❌ Admin can\'t see projects either:', adminError.message);
    } else {
      console.log(`✅ Admin can see ${adminProjects?.length || 0} projects`);
      if (adminProjects && adminProjects.length > 0) {
        adminProjects.forEach((project, index) => {
          console.log(`  ${index + 1}. ${project.name}`);
        });
      }
    }
    
    // Test with employee
    console.log('\n🔄 Testing employee access after admin login...');
    const { error: empAuthError } = await supabase.auth.signInWithPassword({
      email: 'employee@timeflow.com',
      password: 'employee123456'
    });
    
    if (empAuthError) {
      console.error('❌ Failed to sign in as employee:', empAuthError.message);
      return;
    }
    
    const { data: empProjects, error: empError } = await supabase
      .from('projects')
      .select('id, name, description')
      .order('name');
    
    console.log('Employee projects result:');
    console.log('  - data:', empProjects);
    console.log('  - error:', empError);
    console.log(`  - count: ${empProjects?.length || 0}`);
    
    if (empProjects && empProjects.length > 0) {
      console.log('✅ Employee can now see projects!');
    } else {
      console.log('❌ Employee still can\'t see projects');
      console.log('\n🔧 RLS Policy Fix Needed:');
      console.log('You need to update the RLS policy in Supabase dashboard:');
      console.log('1. Go to Supabase Dashboard > Authentication > Policies');
      console.log('2. Find the "projects" table');
      console.log('3. Add a policy: "Allow all authenticated users to read projects"');
      console.log('4. Policy SQL: CREATE POLICY "Allow read access" ON projects FOR SELECT TO authenticated USING (true);');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixProjectsRLS(); 