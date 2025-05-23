
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';
import type { Database } from '../src/types/database';

// Create a Supabase client for the Electron main process
// Note: We don't use localStorage here as we're in Node.js
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
