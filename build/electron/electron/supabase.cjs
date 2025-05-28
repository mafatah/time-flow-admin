import { createClient } from '@supabase/supabase-js';
// Use process.env for Electron instead of import.meta.env
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIxNzM2MDEsImV4cCI6MjA0Nzc0OTYwMX0.VmSZ_J7oOTfIrshfyB3Q1nR7qZ6TyS8qZvGPmcpFfcY';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
