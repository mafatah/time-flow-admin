# Suspicious Activity Detection Fix

## Issue Summary
The suspicious activity detection system is not working for user `m_Afatah@me.com` when testing Facebook and Instagram because:

1. **Missing Database Table**: The `suspicious_activity` table doesn't exist in the database
2. **High Detection Threshold**: The backend detection logic requires more than 2 social media visits to trigger alerts
3. **Time Window**: The detection looks at a 30-minute window, but activity might be outside this range

## Current Detection Status
- ✅ **URL Logging**: Working correctly (157 URL logs in last 2 hours)
- ✅ **Facebook Detection**: 1 Facebook visit detected (`https://web.facebook.com/`)
- ❌ **Alert Generation**: Not working (table doesn't exist)
- ❌ **Threshold**: Too high (requires >2 visits, but only 1 detected)

## Solution 1: Create the Database Table

### Run this SQL in your Supabase dashboard:

```sql
-- Create suspicious_activity table
CREATE TABLE IF NOT EXISTS public.suspicious_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  details TEXT,
  category TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user_id ON public.suspicious_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_timestamp ON public.suspicious_activity(timestamp);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_category ON public.suspicious_activity(category);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_activity_type ON public.suspicious_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_risk_score ON public.suspicious_activity(risk_score);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_reviewed ON public.suspicious_activity(reviewed);

-- Enable RLS
ALTER TABLE public.suspicious_activity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own suspicious activity" ON public.suspicious_activity
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all suspicious activity" ON public.suspicious_activity
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );
```

## Solution 2: Lower Detection Threshold (Temporary Fix)

The current backend logic in multiple files requires `socialMediaCount > 2` to trigger alerts. For testing purposes, this should be lowered to `socialMediaCount > 0`.

### Files to Update:
1. `backend/src/main.ts` - Line ~85
2. `backend/src/main-express.ts` - Line ~85
3. `backend/src/main-simple-working.ts` - Line ~85
4. `backend/src/main-minimal.ts` - Line ~85
5. `backend/src/workers/suspicious-activity-detector.processor.ts` - Line ~138
6. `backend/src/workers/analytics.worker.ts` - Line ~450

### Change Required:
```typescript
// Current logic (too strict for testing)
if (socialMediaCount > 2) {
  // Flag as suspicious
}

// Recommended for testing
if (socialMediaCount > 0) {
  // Flag as suspicious
}
```

## Solution 3: Test the Fix

After applying the database table creation and threshold changes, test with:

```bash
node test-suspicious-activity.cjs
```

This should show:
- ✅ Facebook activity detected
- ✅ Suspicious activity record created
- ✅ Dashboard shows flagged activity

## Current Backend Detection Schedule

The suspicious activity detection runs:
- **main-express.ts**: Every 15 minutes (`@Cron('*/15 * * * *')`)
- **main-minimal.ts**: Every 30 minutes (`@Cron('*/30 * * * *')`)
- **analytics.worker.ts**: Every 15 minutes (`@Cron('*/15 * * * *')`)

## Detection Patterns

The system currently detects these social media patterns:
- facebook.com ✅
- instagram.com ✅
- twitter.com / x.com ✅
- linkedin.com ✅
- tiktok.com ✅
- snapchat.com ✅
- reddit.com ✅
- youtube.com ✅
- whatsapp.com ✅
- telegram.org ✅
- discord.com ✅

## User Data Status

For user `m_Afatah@me.com` (ID: `0c3d3092-913e-436f-a352-3378e558c34f`):
- **Total URL logs (2 hours)**: 157
- **Facebook visits**: 1
- **Instagram visits**: 0
- **Other social media**: 0

## Next Steps

1. **Create the database table** using the SQL above
2. **Lower the detection threshold** for testing
3. **Test the detection** with the provided script
4. **Verify in dashboard** that suspicious activity shows up

## Expected Result

After the fix:
- Facebook visit should be flagged as suspicious activity
- Risk score: 15 (moderate risk)
- Category: social_media
- Details: "Social media usage detected: https://web.facebook.com/"
- User will see alert in suspicious activity dashboard