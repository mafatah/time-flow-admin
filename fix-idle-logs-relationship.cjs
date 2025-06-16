require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');


// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(
  'process.env.VITE_SUPABASE_URL',
  'process.env.VITE_SUPABASE_ANON_KEY'
);

async function fixIdleLogsRelationship() {
  try {
    console.log('🔧 Fixing idle_logs foreign key relationship...');
    
    // First check if idle_logs table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'idle_logs');
    
    if (tableError) {
      console.error('❌ Error checking tables:', tableError);
      return;
    }
    
    if (!tables || tables.length === 0) {
      console.log('⚠️ idle_logs table does not exist, creating it...');
      
      // Create the idle_logs table with proper foreign key
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.idle_logs (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
            idle_start timestamp with time zone NOT NULL,
            idle_end timestamp with time zone,
            duration_minutes integer,
            created_at timestamp with time zone DEFAULT now()
          );
          
          -- Enable RLS
          ALTER TABLE public.idle_logs ENABLE ROW LEVEL SECURITY;
          
          -- Create RLS policies
          CREATE POLICY "Users can view own idle logs" ON public.idle_logs
            FOR SELECT USING (auth.uid() = user_id);
            
          CREATE POLICY "Users can insert own idle logs" ON public.idle_logs
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
          CREATE POLICY "Admins can view all idle logs" ON public.idle_logs
            FOR ALL USING (
              EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() AND role = 'admin'
              )
            );
        `
      });
      
      if (createError) {
        console.error('❌ Error creating idle_logs table:', createError);
      } else {
        console.log('✅ Created idle_logs table with proper foreign key');
      }
    } else {
      console.log('✅ idle_logs table exists');
      
      // Check if foreign key constraint exists
      const { data: constraints, error: constraintError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_name', 'idle_logs')
        .eq('constraint_type', 'FOREIGN KEY');
      
      if (constraintError) {
        console.error('❌ Error checking constraints:', constraintError);
        return;
      }
      
      const hasForeignKey = constraints && constraints.some(c => 
        c.constraint_name.includes('user_id') || c.constraint_name.includes('users')
      );
      
      if (!hasForeignKey) {
        console.log('⚠️ Adding missing foreign key constraint...');
        
        const { error: fkError } = await supabase.rpc('exec_sql', {
          sql: `
            ALTER TABLE public.idle_logs 
            ADD CONSTRAINT idle_logs_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
          `
        });
        
        if (fkError) {
          console.error('❌ Error adding foreign key:', fkError);
        } else {
          console.log('✅ Added foreign key constraint');
        }
      } else {
        console.log('✅ Foreign key constraint already exists');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

fixIdleLogsRelationship().then(() => {
  console.log('🏁 Database relationship fix completed');
  process.exit(0);
}); 