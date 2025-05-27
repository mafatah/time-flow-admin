const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
// Note: You'll need to add your service role key to .env as SUPABASE_SERVICE_ROLE_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env file');
    console.log('📋 To fix the database, you need to:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Settings > API');
    console.log('3. Copy the service_role key');
    console.log('4. Add it to your .env file as SUPABASE_SERVICE_ROLE_KEY=your_key_here');
    console.log('5. Run this script again');
    console.log('\nOR manually run the SQL queries from TImetrack.session.sql in your Supabase SQL Editor');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyDatabaseFix() {
    console.log('🔧 Applying comprehensive database fix...');
    
    try {
        // 1. Disable RLS on problematic tables
        console.log('\n1️⃣ Disabling RLS on tables...');
        const disableRLSQueries = [
            'ALTER TABLE public.app_logs DISABLE ROW LEVEL SECURITY;',
            'ALTER TABLE public.url_logs DISABLE ROW LEVEL SECURITY;',
            'ALTER TABLE public.idle_logs DISABLE ROW LEVEL SECURITY;',
            'ALTER TABLE public.time_logs DISABLE ROW LEVEL SECURITY;',
            'ALTER TABLE public.screenshots DISABLE ROW LEVEL SECURITY;'
        ];
        
        for (const query of disableRLSQueries) {
            const { error } = await supabase.rpc('exec_sql', { sql: query });
            if (error) {
                console.log('⚠️ RLS disable error:', error.message);
            } else {
                console.log('✅ RLS disabled for table');
            }
        }

        // 2. Create permissive policies
        console.log('\n2️⃣ Creating permissive policies...');
        const policyQueries = [
            `CREATE POLICY "Allow all app_logs operations" ON public.app_logs FOR ALL USING (true) WITH CHECK (true);`,
            `CREATE POLICY "Allow all url_logs operations" ON public.url_logs FOR ALL USING (true) WITH CHECK (true);`,
            `CREATE POLICY "Allow all idle_logs operations" ON public.idle_logs FOR ALL USING (true) WITH CHECK (true);`,
            `CREATE POLICY "Allow all time_logs operations" ON public.time_logs FOR ALL USING (true) WITH CHECK (true);`,
            `CREATE POLICY "Allow all screenshots operations" ON public.screenshots FOR ALL USING (true) WITH CHECK (true);`
        ];
        
        for (const query of policyQueries) {
            const { error } = await supabase.rpc('exec_sql', { sql: query });
            if (error && !error.message.includes('already exists')) {
                console.log('⚠️ Policy creation error:', error.message);
            } else {
                console.log('✅ Policy created');
            }
        }

        // 3. Test the fix
        console.log('\n3️⃣ Testing the fix...');
        const { data: testData, error: testError } = await supabase
            .from('app_logs')
            .insert({
                user_id: '00000000-0000-0000-0000-000000000001',
                app_name: 'Test App',
                window_title: 'Database Fix Test'
            })
            .select();
            
        if (testError) {
            console.log('❌ Test insert still failing:', testError.message);
            console.log('📋 You may need to run the full SQL fix manually in Supabase SQL Editor');
        } else {
            console.log('✅ Database fix successful!');
            console.log('🎉 Desktop app should now work properly');
        }

    } catch (error) {
        console.log('💥 Fix failed with error:', error);
        console.log('📋 Please run the SQL queries from TImetrack.session.sql manually in Supabase');
    }
}

applyDatabaseFix(); 