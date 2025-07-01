-- TimeFlow Database Schema Fix
-- Copy this entire content and paste it into Supabase SQL Editor, then click "Run"

-- Fix 1: Add missing detected_at column to app_logs table
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS detected_at BIGINT;

-- Fix 2: Add index for performance on detected_at column
CREATE INDEX IF NOT EXISTS idx_app_logs_detected_at ON public.app_logs(detected_at);

-- Fix 3: Add project_id column for better tracking (used by activity monitor)
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Fix 4: Add index for project_id
CREATE INDEX IF NOT EXISTS idx_app_logs_project_id ON public.app_logs(project_id);

-- Fix 5: Add detected_at column to url_logs table (for consistency)
ALTER TABLE public.url_logs ADD COLUMN IF NOT EXISTS detected_at BIGINT;

-- Fix 6: Add index for url_logs detected_at
CREATE INDEX IF NOT EXISTS idx_url_logs_detected_at ON public.url_logs(detected_at);

-- Fix 7: Add project_id to url_logs table
ALTER TABLE public.url_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Fix 8: Add index for url_logs project_id
CREATE INDEX IF NOT EXISTS idx_url_logs_project_id ON public.url_logs(project_id);

-- Fix 9: Add helpful comments
COMMENT ON COLUMN public.app_logs.detected_at IS 'Timestamp in milliseconds when the app was detected (for local tracking)';
COMMENT ON COLUMN public.app_logs.project_id IS 'Project associated with this app log entry';
COMMENT ON COLUMN public.url_logs.detected_at IS 'Timestamp in milliseconds when the URL was detected (for local tracking)';
COMMENT ON COLUMN public.url_logs.project_id IS 'Project associated with this URL log entry';

-- Verification query (run this after the above to verify success)
SELECT 
    'app_logs' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'app_logs' 
AND column_name IN ('detected_at', 'project_id')
UNION ALL
SELECT 
    'url_logs' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'url_logs' 
AND column_name IN ('detected_at', 'project_id')
ORDER BY table_name, column_name; 