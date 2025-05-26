-- Direct RLS fix for Time Flow Admin desktop app
-- Run this against the remote database to allow desktop app to save data

-- Disable RLS on tables that the desktop app needs to write to
ALTER TABLE public.app_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.url_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.idle_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots DISABLE ROW LEVEL SECURITY;

-- Add missing columns to screenshots table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'screenshots' AND column_name = 'keystrokes') THEN
        ALTER TABLE public.screenshots ADD COLUMN keystrokes INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'screenshots' AND column_name = 'mouse_clicks') THEN
        ALTER TABLE public.screenshots ADD COLUMN mouse_clicks INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create simple policies that allow all operations
DROP POLICY IF EXISTS "Allow all app_logs operations" ON public.app_logs;
CREATE POLICY "Allow all app_logs operations" ON public.app_logs
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all url_logs operations" ON public.url_logs;
CREATE POLICY "Allow all url_logs operations" ON public.url_logs  
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all idle_logs operations" ON public.idle_logs;
CREATE POLICY "Allow all idle_logs operations" ON public.idle_logs
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all time_logs operations" ON public.time_logs;
CREATE POLICY "Allow all time_logs operations" ON public.time_logs
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all screenshots operations" ON public.screenshots;
CREATE POLICY "Allow all screenshots operations" ON public.screenshots
FOR ALL USING (true) WITH CHECK (true);

-- Add comments
COMMENT ON POLICY "Allow all app_logs operations" ON public.app_logs IS 'Temporary policy to allow desktop app to function';
COMMENT ON POLICY "Allow all url_logs operations" ON public.url_logs IS 'Temporary policy to allow desktop app to function';
COMMENT ON POLICY "Allow all idle_logs operations" ON public.idle_logs IS 'Temporary policy to allow desktop app to function';
COMMENT ON POLICY "Allow all time_logs operations" ON public.time_logs IS 'Temporary policy to allow desktop app to function';
COMMENT ON POLICY "Allow all screenshots operations" ON public.screenshots IS 'Temporary policy to allow desktop app to function'; 