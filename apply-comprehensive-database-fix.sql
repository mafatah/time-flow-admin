-- Comprehensive Database Schema Fix for TimeFlow
-- Fixes missing detected_at columns in both app_logs and url_logs

-- Fix app_logs table (apply existing migration)
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS detected_at BIGINT;
CREATE INDEX IF NOT EXISTS idx_app_logs_detected_at ON public.app_logs(detected_at);
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_app_logs_project_id ON public.app_logs(project_id);

-- Fix url_logs table (add missing detected_at column)
ALTER TABLE public.url_logs ADD COLUMN IF NOT EXISTS detected_at BIGINT;
CREATE INDEX IF NOT EXISTS idx_url_logs_detected_at ON public.url_logs(detected_at);
ALTER TABLE public.url_logs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_url_logs_project_id ON public.url_logs(project_id);

-- Add comments for documentation
COMMENT ON COLUMN public.app_logs.detected_at IS 'Timestamp in milliseconds when the app was detected (for local tracking)';
COMMENT ON COLUMN public.app_logs.project_id IS 'Project associated with this app log entry';
COMMENT ON COLUMN public.url_logs.detected_at IS 'Timestamp in milliseconds when the URL was detected (for local tracking)';
COMMENT ON COLUMN public.url_logs.project_id IS 'Project associated with this URL log entry';

-- Refresh schema cache to ensure changes are recognized
NOTIFY pgrst, 'reload schema';
