-- Comprehensive fix for Time Flow Admin database issues
-- This script fixes RLS policies, missing columns, and foreign key relationships

-- 1. DISABLE RLS ON ALL TABLES THAT DESKTOP APP NEEDS
ALTER TABLE public.app_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.url_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.idle_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots DISABLE ROW LEVEL SECURITY;

-- 2. ADD MISSING COLUMNS TO SCREENSHOTS TABLE
DO $$ 
BEGIN
    -- Add keystrokes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'screenshots' AND column_name = 'keystrokes') THEN
        ALTER TABLE public.screenshots ADD COLUMN keystrokes INTEGER DEFAULT 0;
    END IF;
    
    -- Add mouse_clicks column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'screenshots' AND column_name = 'mouse_clicks') THEN
        ALTER TABLE public.screenshots ADD COLUMN mouse_clicks INTEGER DEFAULT 0;
    END IF;
    
    -- Add mouse_movements column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'screenshots' AND column_name = 'mouse_movements') THEN
        ALTER TABLE public.screenshots ADD COLUMN mouse_movements INTEGER DEFAULT 0;
    END IF;
    
    -- Add activity_percent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'screenshots' AND column_name = 'activity_percent') THEN
        ALTER TABLE public.screenshots ADD COLUMN activity_percent INTEGER DEFAULT 0;
    END IF;
    
    -- Add focus_percent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'screenshots' AND column_name = 'focus_percent') THEN
        ALTER TABLE public.screenshots ADD COLUMN focus_percent INTEGER DEFAULT 0;
    END IF;
    
    -- Add is_blurred column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'screenshots' AND column_name = 'is_blurred') THEN
        ALTER TABLE public.screenshots ADD COLUMN is_blurred BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. FIX FOREIGN KEY RELATIONSHIPS
-- Drop existing foreign key constraints that might be causing issues
DO $$
BEGIN
    -- Drop and recreate time_logs.task_id foreign key
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_time_logs_tasks' AND table_name = 'time_logs') THEN
        ALTER TABLE public.time_logs DROP CONSTRAINT fk_time_logs_tasks;
    END IF;
    
    -- Add the foreign key constraint with proper naming
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_time_logs_tasks' AND table_name = 'time_logs') THEN
        ALTER TABLE public.time_logs 
        ADD CONSTRAINT fk_time_logs_tasks 
        FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;
    END IF;
    
    -- Drop and recreate tasks.project_id foreign key
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'fk_tasks_projects' AND table_name = 'tasks') THEN
        ALTER TABLE public.tasks DROP CONSTRAINT fk_tasks_projects;
    END IF;
    
    -- Add the foreign key constraint with proper naming
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_tasks_projects' AND table_name = 'tasks') THEN
        ALTER TABLE public.tasks 
        ADD CONSTRAINT fk_tasks_projects 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. CREATE PERMISSIVE POLICIES TO ALLOW ALL OPERATIONS
-- Drop existing policies first
DROP POLICY IF EXISTS "Allow all app_logs operations" ON public.app_logs;
DROP POLICY IF EXISTS "Allow all url_logs operations" ON public.url_logs;
DROP POLICY IF EXISTS "Allow all idle_logs operations" ON public.idle_logs;
DROP POLICY IF EXISTS "Allow all time_logs operations" ON public.time_logs;
DROP POLICY IF EXISTS "Allow all screenshots operations" ON public.screenshots;

-- Create new permissive policies
CREATE POLICY "Allow all app_logs operations" ON public.app_logs
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all url_logs operations" ON public.url_logs  
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all idle_logs operations" ON public.idle_logs
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all time_logs operations" ON public.time_logs
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all screenshots operations" ON public.screenshots
FOR ALL USING (true) WITH CHECK (true);

-- 5. ENSURE DEFAULT PROJECT AND TASK EXIST
INSERT INTO public.projects (id, name, description, color) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Project', 'Default project for time tracking', '#3B82F6')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color;

INSERT INTO public.tasks (id, project_id, name, description)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Default Task', 'Default task for time tracking')
ON CONFLICT (id) DO UPDATE SET 
    project_id = EXCLUDED.project_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 6. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- Add comments
COMMENT ON POLICY "Allow all app_logs operations" ON public.app_logs IS 'Temporary policy to allow desktop app to function - should be refined with proper auth later';
COMMENT ON POLICY "Allow all url_logs operations" ON public.url_logs IS 'Temporary policy to allow desktop app to function - should be refined with proper auth later';
COMMENT ON POLICY "Allow all idle_logs operations" ON public.idle_logs IS 'Temporary policy to allow desktop app to function - should be refined with proper auth later';
COMMENT ON POLICY "Allow all time_logs operations" ON public.time_logs IS 'Temporary policy to allow desktop app to function - should be refined with proper auth later';
COMMENT ON POLICY "Allow all screenshots operations" ON public.screenshots IS 'Temporary policy to allow desktop app to function - should be refined with proper auth later'; 