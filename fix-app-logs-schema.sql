-- Fix app_logs table schema
ALTER TABLE app_logs 
ADD COLUMN IF NOT EXISTS keystrokes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mouse_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mouse_movements INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS activity_percent DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS focus_percent DECIMAL(5,2) DEFAULT 0;

-- Fix duration_seconds column - drop and recreate as regular column
ALTER TABLE app_logs DROP COLUMN IF EXISTS duration_seconds;
ALTER TABLE app_logs ADD COLUMN duration_seconds INTEGER DEFAULT 0;

-- Fix url_logs table duration_seconds column
ALTER TABLE url_logs DROP COLUMN IF EXISTS duration_seconds;
ALTER TABLE url_logs ADD COLUMN duration_seconds INTEGER DEFAULT 0;

-- Add missing columns to screenshots table
ALTER TABLE screenshots 
ADD COLUMN IF NOT EXISTS activity_percent DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS focus_percent DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS mouse_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS keystrokes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mouse_movements INTEGER DEFAULT 0; 