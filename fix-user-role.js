import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fkpiqcxkmrtaetvfgcli.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4";

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUserRole() {
  console.log('🔍 Checking current user and role...');
  
  try {
    // Get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session?.user) {
      console.log('❌ No active session found. Please log in first.');
      return;
    }
    
    const userId = sessionData.session.user.id;
    const userEmail = sessionData.session.user.email;
    
    console.log(`📧 Current user: ${userEmail} (ID: ${userId})`);
    
    // Check user in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.log('❌ User not found in users table:', userError.message);
      
      // Try to create user record
      console.log('🔧 Creating user record...');
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userEmail,
          role: 'admin'
        })
        .select()
        .single();
        
      if (createError) {
        console.error('❌ Failed to create user:', createError.message);
        return;
      }
      
      console.log('✅ User created with admin role:', newUser);
      return;
    }
    
    console.log(`👤 Current role: ${userData.role}`);
    
    if (userData.role !== 'admin' && userData.role !== 'manager') {
      console.log('🔧 Updating user role to admin...');
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId)
        .select()
        .single();
        
      if (updateError) {
        console.error('❌ Failed to update role:', updateError.message);
        return;
      }
      
      console.log('✅ User role updated to admin:', updatedUser);
    } else {
      console.log('✅ User already has admin/manager role');
    }
    
    // Test project creation
    console.log('🧪 Testing project creation...');
    const testProject = {
      name: 'Test Project ' + Date.now(),
      description: 'Test project for role verification'
    };
    
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single();
      
    if (projectError) {
      console.error('❌ Project creation still failed:', projectError.message);
      
      if (projectError.message.includes('row-level security')) {
        console.log('');
        console.log('🚨 RLS POLICY ISSUE DETECTED');
        console.log('   The RLS policy is still blocking project creation.');
        console.log('   You may need to temporarily disable RLS or update the policy.');
        console.log('');
        console.log('   Quick fix SQL (run in Supabase SQL Editor):');
        console.log('   ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;');
        console.log('');
      }
    } else {
      console.log('✅ Project creation successful!', projectData);
      
      // Clean up test project
      await supabase
        .from('projects')
        .delete()
        .eq('id', projectData.id);
      console.log('🧹 Test project cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixUserRole(); 