import { createClient } from '@supabase/supabase-js';
import "dotenv/config";
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  console.log('🏗️ Creating test project and data...');
  
  try {
    const userId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
    
    // Create a test project with proper UUID
    console.log('📋 Creating test project...');
    const projectId = randomUUID();
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        id: projectId,
        name: 'Test Project',
        description: 'A test project for time tracking'
      })
      .select();
    
    if (projectError) {
      console.log('❌ Error creating project:', projectError.message);
      return;
    } else {
      console.log('✅ Test project created:', project[0]);
    }
    
    // Create a test time log entry
    console.log('🕐 Creating test time log...');
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
    
    const { data: timeLog, error: timeLogError } = await supabase
      .from('time_logs')
      .insert({
        user_id: userId,
        project_id: projectId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_idle: false
      })
      .select();
    
    if (timeLogError) {
      console.log('❌ Error creating time log:', timeLogError.message);
    } else {
      console.log('✅ Test time log created:', timeLog[0]);
    }
    
    // Create test app logs
    console.log('📱 Creating test app logs...');
    const appLogs = [
      { app_name: 'VS Code', window_title: 'time-flow-admin - Visual Studio Code' },
      { app_name: 'Chrome', window_title: 'GitHub - Google Chrome' },
      { app_name: 'Terminal', window_title: 'Terminal' },
      { app_name: 'Slack', window_title: 'Slack - Team Chat' }
    ];
    
    for (const appLog of appLogs) {
      const { data, error } = await supabase
        .from('app_logs')
        .insert({
          user_id: userId,
          project_id: projectId,
          app_name: appLog.app_name,
          window_title: appLog.window_title
        })
        .select();
      
      if (error) {
        console.log(`❌ Error creating app log for ${appLog.app_name}:`, error.message);
      } else {
        console.log(`✅ App log created for ${appLog.app_name}`);
      }
    }
    
    // Create test screenshots
    console.log('📸 Creating test screenshot records...');
    const { data: screenshot, error: screenshotError } = await supabase
      .from('screenshots')
      .insert({
        user_id: userId,
        project_id: projectId,
        image_url: 'test-screenshot.png',
        captured_at: new Date().toISOString(),
        activity_percent: 75.5,
        focus_percent: 85.2,
        classification: 'productive'
      })
      .select();
    
    if (screenshotError) {
      console.log('❌ Error creating screenshot:', screenshotError.message);
    } else {
      console.log('✅ Test screenshot record created:', screenshot[0]);
    }
    
    console.log('🎉 Test data creation completed!');
    console.log(`📋 Project ID: ${projectId}`);
    console.log(`👤 User ID: ${userId}`);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

createTestData(); 