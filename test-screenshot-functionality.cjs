require('dotenv').config();
#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'process.env.VITE_SUPABASE_URL';
const supabaseKey = 'process.env.VITE_SUPABASE_ANON_KEY';


// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testScreenshotFunctionality() {
    console.log('🧪 =================================');
    console.log('🧪 TIMEFLOW SCREENSHOT TEST SUITE');
    console.log('🧪 =================================\n');

    const userId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
    const today = new Date().toISOString().split('T')[0];

    try {
        // Test 1: Check recent app activity
        console.log('📱 TEST 1: Recent App Activity');
        const { data: appLogs, error: appError } = await supabase
            .from('app_logs')
            .select('app_name, window_title, started_at')
            .eq('user_id', userId)
            .gte('started_at', `${today}T00:00:00`)
            .order('started_at', { ascending: false })
            .limit(5);

        if (appError) {
            console.error('❌ App logs error:', appError);
        } else {
            console.log(`✅ Found ${appLogs.length} recent app activities:`);
            appLogs.forEach(log => {
                console.log(`   📱 ${log.app_name} - ${log.window_title} at ${log.started_at}`);
            });
        }

        // Test 2: Check recent URL activity
        console.log('\n🌐 TEST 2: Recent URL Activity');
        const { data: urlLogs, error: urlError } = await supabase
            .from('url_logs')
            .select('site_url, started_at')
            .eq('user_id', userId)
            .gte('started_at', `${today}T00:00:00`)
            .order('started_at', { ascending: false })
            .limit(3);

        if (urlError) {
            console.error('❌ URL logs error:', urlError);
        } else {
            console.log(`✅ Found ${urlLogs.length} recent URL activities:`);
            urlLogs.forEach(log => {
                console.log(`   🌐 ${log.site_url} at ${log.started_at}`);
            });
        }

        // Test 3: Check screenshot status
        console.log('\n📸 TEST 3: Screenshot Status');
        
        // Check total screenshots
        const { data: totalScreenshots, error: totalError } = await supabase
            .from('screenshots')
            .select('id', { count: 'exact' })
            .eq('user_id', userId);

        if (totalError) {
            console.error('❌ Total screenshots error:', totalError);
        } else {
            console.log(`📊 Total screenshots in database: ${totalScreenshots.length}`);
        }

        // Check today's screenshots
        const { data: todayScreenshots, error: todayError } = await supabase
            .from('screenshots')
            .select('captured_at, activity_percent, image_url')
            .eq('user_id', userId)
            .gte('captured_at', `${today}T00:00:00`)
            .order('captured_at', { ascending: false })
            .limit(5);

        if (todayError) {
            console.error('❌ Today screenshots error:', todayError);
        } else {
            console.log(`📸 Screenshots captured today: ${todayScreenshots.length}`);
            if (todayScreenshots.length > 0) {
                console.log('   Recent screenshots:');
                todayScreenshots.forEach(screenshot => {
                    console.log(`   📷 ${screenshot.captured_at} - Activity: ${screenshot.activity_percent}%`);
                });
            } else {
                console.log('   ❌ NO SCREENSHOTS CAPTURED TODAY - This is the main issue!');
            }
        }

        // Test 4: Check latest screenshots from any date
        console.log('\n📸 TEST 4: Latest Screenshots (Any Date)');
        const { data: latestScreenshots, error: latestError } = await supabase
            .from('screenshots')
            .select('captured_at, activity_percent')
            .eq('user_id', userId)
            .order('captured_at', { ascending: false })
            .limit(3);

        if (latestError) {
            console.error('❌ Latest screenshots error:', latestError);
        } else {
            console.log(`📸 Latest screenshots in database:`);
            latestScreenshots.forEach(screenshot => {
                console.log(`   📷 ${screenshot.captured_at} - Activity: ${screenshot.activity_percent}%`);
            });
        }

        // Test 5: Storage bucket test
        console.log('\n☁️ TEST 5: Supabase Storage Test');
        try {
            const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
            if (bucketError) {
                console.error('❌ Storage bucket error:', bucketError);
            } else {
                const screenshotBucket = buckets.find(b => b.name === 'screenshots');
                if (screenshotBucket) {
                    console.log('✅ Screenshots storage bucket exists');
                    
                    // Test file listing in user folder
                    const { data: userFiles, error: filesError } = await supabase.storage
                        .from('screenshots')
                        .list(userId, { limit: 5 });
                    
                    if (filesError) {
                        console.error('❌ User files error:', filesError);
                    } else {
                        console.log(`📁 Files in user folder: ${userFiles.length}`);
                        if (userFiles.length > 0) {
                            userFiles.forEach(file => {
                                console.log(`   📄 ${file.name} (${file.metadata?.size || 'unknown size'})`);
                            });
                        }
                    }
                } else {
                    console.error('❌ Screenshots storage bucket not found');
                }
            }
        } catch (storageError) {
            console.error('❌ Storage test failed:', storageError.message);
        }

        // Summary
        console.log('\n📋 SUMMARY:');
        console.log('==========');
        
        const hasRecentApps = appLogs && appLogs.length > 0;
        const hasRecentUrls = urlLogs && urlLogs.length > 0;
        const hasTodayScreenshots = todayScreenshots && todayScreenshots.length > 0;
        const hasHistoricalScreenshots = latestScreenshots && latestScreenshots.length > 0;

        console.log(`✅ App Activity Tracking: ${hasRecentApps ? 'WORKING' : 'NOT WORKING'}`);
        console.log(`✅ URL Activity Tracking: ${hasRecentUrls ? 'WORKING' : 'NOT WORKING'}`);
        console.log(`${hasTodayScreenshots ? '✅' : '❌'} Today's Screenshots: ${hasTodayScreenshots ? 'WORKING' : 'NOT WORKING'}`);
        console.log(`✅ Historical Screenshots: ${hasHistoricalScreenshots ? 'AVAILABLE' : 'NONE'}`);

        if (!hasTodayScreenshots) {
            console.log('\n🔧 RECOMMENDED ACTIONS:');
            console.log('1. Check Electron app logs for screenshot capture errors');
            console.log('2. Test manual screenshot button in desktop app');
            console.log('3. Verify macOS screen recording permissions');
            console.log('4. Check Supabase storage upload permissions');
        }

    } catch (error) {
        console.error('💥 Test suite failed:', error);
    }
}

// Run the test
testScreenshotFunctionality(); 