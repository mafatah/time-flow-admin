const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

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
            if (appLogsData && appLogsData.length > 0) {
                console.log('📋 Sample app_logs columns:', Object.keys(appLogsData[0]));
            }
        }

        // Test 2: Check url_logs structure
        console.log('\n2️⃣ Testing url_logs read access...');
        const { data: urlLogsData, error: urlLogsError } = await supabase
            .from('url_logs')
            .select('*')
            .limit(1);
            
        if (urlLogsError) {
            console.log('❌ URL logs read error:', urlLogsError);
        } else {
            console.log('✅ URL logs read successful, count:', urlLogsData?.length || 0);
            if (urlLogsData && urlLogsData.length > 0) {
                console.log('📋 Sample url_logs columns:', Object.keys(urlLogsData[0]));
            }
        }

        // Test 3: Try to insert into app_logs with correct schema
        console.log('\n3️⃣ Testing app_logs insert with correct schema...');
        
        // Try different possible column combinations
        const appLogVariations = [
            // Variation 1: Common time tracking columns
            {
                user_id: '00000000-0000-0000-0000-000000000001',
                app_name: 'Test App',
                window_title: 'Database Fix Test',
                started_at: new Date().toISOString(),
                duration_seconds: 10
            },
            // Variation 2: Simple columns
            {
                user_id: '00000000-0000-0000-0000-000000000001',
                app_name: 'Test App',
                window_title: 'Database Fix Test'
            },
            // Variation 3: With created_at
            {
                user_id: '00000000-0000-0000-0000-000000000001',
                app_name: 'Test App',
                window_title: 'Database Fix Test',
                created_at: new Date().toISOString()
            }
        ];

        let insertSuccess = false;
        for (let i = 0; i < appLogVariations.length; i++) {
            console.log(`   Trying variation ${i + 1}...`);
            const { data: insertData, error: insertError } = await supabase
                .from('app_logs')
                .insert(appLogVariations[i])
                .select();
                
            if (!insertError) {
                console.log('✅ App logs insert successful with variation', i + 1);
                console.log('📝 Inserted data:', insertData);
                insertSuccess = true;
                break;
            } else {
                console.log(`❌ Variation ${i + 1} failed:`, insertError.message);
            }
        }

        // Test 4: Try to insert into url_logs with correct schema
        console.log('\n4️⃣ Testing url_logs insert with correct schema...');
        
        const urlLogVariations = [
            // Variation 1: Common URL tracking columns
            {
                user_id: '00000000-0000-0000-0000-000000000001',
                url: 'https://test.com',
                title: 'Test Page',
                visited_at: new Date().toISOString()
            },
            // Variation 2: Simple columns
            {
                user_id: '00000000-0000-0000-0000-000000000001',
                url: 'https://test.com',
                title: 'Test Page'
            },
            // Variation 3: With created_at
            {
                user_id: '00000000-0000-0000-0000-000000000001',
                url: 'https://test.com',
                title: 'Test Page',
                created_at: new Date().toISOString()
            }
        ];

        let urlInsertSuccess = false;
        for (let i = 0; i < urlLogVariations.length; i++) {
            console.log(`   Trying variation ${i + 1}...`);
            const { data: urlData, error: urlError } = await supabase
                .from('url_logs')
                .insert(urlLogVariations[i])
                .select();
                
            if (!urlError) {
                console.log('✅ URL logs insert successful with variation', i + 1);
                console.log('📝 Inserted data:', urlData);
                urlInsertSuccess = true;
                break;
            } else {
                console.log(`❌ Variation ${i + 1} failed:`, urlError.message);
            }
        }

        console.log('\n🎯 SUMMARY:');
        console.log('- App logs insert:', insertSuccess ? '✅ SUCCESS' : '❌ FAILED');
        console.log('- URL logs insert:', urlInsertSuccess ? '✅ SUCCESS' : '❌ FAILED');
        
        if (insertSuccess && urlInsertSuccess) {
            console.log('\n🎉 DATABASE FIX SUCCESSFUL! Desktop app should work now.');
            console.log('💡 The RLS errors should be resolved.');
        } else {
            console.log('\n⚠️ Database schema issues exist. The desktop app may need schema updates.');
            console.log('📋 Run the SQL fix queries from TImetrack.session.sql to fix schema and RLS.');
        }

    } catch (error) {
        console.log('💥 Test failed with error:', error);
    }
}

testDatabaseFix(); 