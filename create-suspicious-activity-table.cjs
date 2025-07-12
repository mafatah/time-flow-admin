const { loadConfig } = require('./desktop-agent/load-config');
const config = loadConfig();
const { createClient } = require('@supabase/supabase-js');
const client = createClient(config.supabase_url, config.supabase_key);

async function createSuspiciousActivityTable() {
  console.log('🔧 CREATING SUSPICIOUS ACTIVITY TABLE');
  console.log('====================================');
  
  try {
    // First check if table exists
    const { data: tableCheck, error: checkError } = await client
      .from('suspicious_activity')
      .select('*')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Table already exists and is accessible');
      return;
    }
    
    console.log('⚠️  Table does not exist, need to create it manually');
    console.log('❌ Error:', checkError.message);
    
    // Create a test record to check current social media activity
    console.log('\n🔍 CHECKING CURRENT SOCIAL MEDIA ACTIVITY');
    console.log('==========================================');
    
    const now = new Date();
    const last30Minutes = new Date(now.getTime() - 30 * 60 * 1000);
    
    const { data: urlLogs } = await client
      .from('url_logs')
      .select('*')
      .gte('timestamp', last30Minutes.toISOString())
      .order('timestamp', { ascending: false });
    
    console.log('📊 Recent URL Activity (last 30 minutes):', urlLogs?.length || 0);
    
    // Check for social media patterns
    const SOCIAL_MEDIA_PATTERNS = [
      'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com'
    ];
    
    const socialMediaActivity = urlLogs?.filter(log => {
      const url = (log.site_url || log.url || log.domain || '').toLowerCase();
      return SOCIAL_MEDIA_PATTERNS.some(pattern => url.includes(pattern));
    }) || [];
    
    console.log('📱 Social Media Activity:', socialMediaActivity.length);
    
    if (socialMediaActivity.length > 0) {
      console.log('🔍 Social Media Sites Detected:');
      socialMediaActivity.slice(0, 5).forEach(log => {
        console.log(`  - ${log.site_url || log.url || log.domain} at ${new Date(log.timestamp).toLocaleTimeString()}`);
      });
      
      // This would be detected
      if (socialMediaActivity.length > 2) {
        console.log('\n🚨 WOULD TRIGGER DETECTION:');
        console.log('  Activity Type: social_media_usage');
        console.log('  Risk Score:', Math.min(socialMediaActivity.length * 3, 30));
        console.log('  Details:', `${socialMediaActivity.length} social media visits detected`);
        console.log('  Category: social_media');
        console.log('  User ID:', socialMediaActivity[0]?.user_id || 'unknown');
      }
    } else {
      console.log('📱 No social media activity detected in last 30 minutes');
    }
    
    console.log('\n📋 TO CREATE THE TABLE MANUALLY:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run this SQL command:');
    console.log('');
    console.log('CREATE TABLE IF NOT EXISTS public.suspicious_activity (');
    console.log('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
    console.log('  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,');
    console.log('  activity_type TEXT NOT NULL,');
    console.log('  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),');
    console.log('  details TEXT,');
    console.log('  category TEXT,');
    console.log('  timestamp TIMESTAMPTZ DEFAULT NOW(),');
    console.log('  reviewed BOOLEAN DEFAULT FALSE,');
    console.log('  created_at TIMESTAMPTZ DEFAULT NOW(),');
    console.log('  updated_at TIMESTAMPTZ DEFAULT NOW()');
    console.log(');');
    console.log('');
    console.log('-- Create indexes');
    console.log('CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user_id ON public.suspicious_activity(user_id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_suspicious_activity_timestamp ON public.suspicious_activity(timestamp);');
    console.log('CREATE INDEX IF NOT EXISTS idx_suspicious_activity_category ON public.suspicious_activity(category);');
    console.log('CREATE INDEX IF NOT EXISTS idx_suspicious_activity_activity_type ON public.suspicious_activity(activity_type);');
    console.log('');
    console.log('-- Enable RLS');
    console.log('ALTER TABLE public.suspicious_activity ENABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('-- Add RLS policies');
    console.log('CREATE POLICY "Users can view their own suspicious activity" ON public.suspicious_activity');
    console.log('  FOR SELECT USING (auth.uid() = user_id);');
    console.log('');
    console.log('CREATE POLICY "Admins can view all suspicious activity" ON public.suspicious_activity');
    console.log('  FOR ALL USING (');
    console.log('    EXISTS (');
    console.log('      SELECT 1 FROM public.users ');
    console.log('      WHERE id = auth.uid() ');
    console.log('      AND role IN (\'admin\', \'super_admin\')');
    console.log('    )');
    console.log('  );');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSuspiciousActivityTable(); 