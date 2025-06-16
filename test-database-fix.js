import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Use environment variables only - no hardcoded fallbacks
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseFix() {
    console.log('🧪 Testing database fix...');
    
    try {
        // Test 1: Check if we can read from app_logs
        console.log('\n1️⃣ Testing app_logs read access...');
        const { data: appLogsData, error: appLogsError } = await supabase
            .from('app_logs')
            .select('*')
            .limit(1);
            
        if (appLogsError) {
            console.log('❌ App logs read error:', appLogsError);
        } else {
            console.log('✅ App logs read successful, count:', appLogsData?.length || 0);
        }

        // Test 2: Try to insert into app_logs (this was failing before)
        console.log('\n2️⃣ Testing app_logs insert...');
        const { data: insertData, error: insertError } = await supabase
            .from('app_logs')
            .insert({
                user_id: '00000000-0000-0000-0000-000000000001',
                app_name: 'Test App',
                window_title: 'Database Fix Test',
                timestamp: new Date().toISOString()
            })
            .select();
            
        if (insertError) {
            console.log('❌ App logs insert error:', insertError);
            console.log('🔍 Error details:', {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details
            });
        } else {
            console.log('✅ App logs insert successful!');
            console.log('📝 Inserted data:', insertData);
        }

        // Test 3: Check url_logs
        console.log('\n3️⃣ Testing url_logs insert...');
        const { data: urlData, error: urlError } = await supabase
            .from('url_logs')
            .insert({
                user_id: '00000000-0000-0000-0000-000000000001',
                url: 'https://test.com',
                title: 'Test Page',
                timestamp: new Date().toISOString()
            })
            .select();
            
        if (urlError) {
            console.log('❌ URL logs insert error:', urlError);
        } else {
            console.log('✅ URL logs insert successful!');
        }

        // Test 4: Check RLS status
        console.log('\n4️⃣ Checking RLS status...');
        const { data: rlsData, error: rlsError } = await supabase
            .rpc('check_rls_status');
            
        if (rlsError) {
            console.log('⚠️ Could not check RLS status:', rlsError.message);
        } else {
            console.log('📊 RLS status:', rlsData);
        }

        console.log('\n🎯 SUMMARY:');
        console.log('- App logs insert:', insertError ? '❌ FAILED' : '✅ SUCCESS');
        console.log('- URL logs insert:', urlError ? '❌ FAILED' : '✅ SUCCESS');
        
        if (!insertError && !urlError) {
            console.log('\n🎉 DATABASE FIX SUCCESSFUL! Desktop app should work now.');
        } else {
            console.log('\n⚠️ Database issues still exist. Run the SQL fix queries.');
        }

    } catch (error) {
        console.log('💥 Test failed with error:', error);
    }
}

testDatabaseFix(); 