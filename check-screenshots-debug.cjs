const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  'https://fkpiqcxkmrtaetvfgcli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4'
);

async function checkScreenshots() {
  console.log('🔍 Checking screenshots table...');
  
  try {
    // First, let's see what columns exist by trying a simple select
    console.log('📊 Checking table structure...');
    const { data: sample, error: sampleError } = await supabase
      .from('screenshots')
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.error('❌ Error fetching sample:', sampleError);
      return;
    }
    
    if (sample && sample.length > 0) {
      console.log('✅ Table columns:', Object.keys(sample[0]));
    }
    
    // Now get recent screenshots with correct column name
    const { data: screenshots, error } = await supabase
      .from('screenshots')
      .select('*')
      .order('captured_at', { ascending: false })
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
      console.log(`   Captured: ${screenshot.captured_at}`);
      console.log(`   File Size: ${screenshot.file_size || 'NULL'} bytes`);
    });
    
    // Check if there are any issues with empty image_urls
    const emptyUrls = screenshots.filter(s => !s.image_url);
    console.log(`\n⚠️  Screenshots with missing image URLs: ${emptyUrls.length}`);
    
    if (emptyUrls.length > 0) {
      console.log('🔍 Issues found:');
      emptyUrls.forEach((s, i) => {
        console.log(`   ${i+1}. ID ${s.id} - captured ${s.captured_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkScreenshots(); 