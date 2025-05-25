import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fkpiqcxkmrtaetvfgcli.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4";

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyPolicyFix() {
  console.log('🔧 Applying RLS policy fix for projects table...');
  
  try {
    // Sign in as admin
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
    
    // Try to execute the policy fix SQL
    // Note: This might not work via the client, but let's try
    console.log('\n🔧 Attempting to apply RLS policy fix...');
    
    const policySQL = `
      -- Create new policy that allows all authenticated users to read projects
      DROP POLICY IF EXISTS "Allow authenticated users to read projects" ON projects;
      CREATE POLICY "Allow authenticated users to read projects" 
      ON projects 
      FOR SELECT 
      TO authenticated 
      USING (true);
    `;
    
    // This might not work via the JS client, but let's try
    const { data, error } = await supabase.rpc('exec_sql', { sql: policySQL });
    
    if (error) {
      console.log('⚠️ Cannot execute SQL via client (expected)');
      console.log('📋 Manual fix required in Supabase Dashboard:');
      console.log('\n1. Go to: https://supabase.com/dashboard/project/fkpiqcxkmrtaetvfgcli');
      console.log('2. Navigate to: Database > Policies');
      console.log('3. Find the "projects" table');
      console.log('4. Add a new policy with these settings:');
      console.log('   - Name: "Allow authenticated users to read projects"');
      console.log('   - Operation: SELECT');
      console.log('   - Target roles: authenticated');
      console.log('   - Policy definition: true');
      console.log('\nOr execute this SQL in the SQL Editor:');
      console.log('```sql');
      console.log('CREATE POLICY "Allow authenticated users to read projects"');
      console.log('ON projects FOR SELECT TO authenticated USING (true);');
      console.log('```');
    } else {
      console.log('✅ Policy applied successfully');
    }
    
    // Test the fix by trying employee access
    console.log('\n🧪 Testing employee access...');
    
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
    console.log(`  - count: ${empProjects?.length || 0}`);
    console.log('  - error:', empError);
    
    if (empProjects && empProjects.length > 0) {
      console.log('🎉 SUCCESS! Employee can now see projects!');
      console.log('\n📋 Available projects for employee:');
      empProjects.slice(0, 5).forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name}`);
      });
      if (empProjects.length > 5) {
        console.log(`  ... and ${empProjects.length - 5} more`);
      }
    } else {
      console.log('❌ Employee still cannot see projects');
      console.log('🔧 Manual policy fix required (see instructions above)');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyPolicyFix(); 