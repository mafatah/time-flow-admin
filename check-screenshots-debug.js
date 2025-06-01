const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4'
);

async function checkScreenshots() {
  console.log('🔍 Checking screenshots table...');
  
  try {
    // Get recent screenshots
    const { data: screenshots, error } = await supabase
      .from('screenshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('❌ Error fetching screenshots:', error);
      return;
    }
    
    console.log(`📊 Found ${screenshots.length} screenshots`);
    
    screenshots.forEach((screenshot, index) => {
      console.log(`\n📸 Screenshot ${index + 1}:`);
      console.log(`   ID: ${screenshot.id}`);
      console.log(`   User ID: ${screenshot.user_id}`);
      console.log(`   Image URL: ${screenshot.image_url || 'NULL'}`);
      console.log(`   File Path: ${screenshot.file_path || 'NULL'}`);
      console.log(`   Activity: ${screenshot.activity_percent}%`);
      console.log(`   Created: ${screenshot.created_at}`);
      console.log(`   File Size: ${screenshot.file_size || 'NULL'} bytes`);
    });
    
    // Check if image URLs are working
    if (screenshots.length > 0 && screenshots[0].image_url) {
      console.log('\n🌐 Testing image URL accessibility...');
      try {
        const response = await fetch(screenshots[0].image_url);
        console.log(`   Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      } catch (fetchError) {
        console.log(`   ❌ URL fetch failed: ${fetchError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkScreenshots(); 