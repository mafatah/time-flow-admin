import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from './config';
import type { Database } from '../src/types/database';

// Create a Supabase client for the Electron main process using service role key
// This bypasses RLS policies since Electron is a trusted desktop application
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);
