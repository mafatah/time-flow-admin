import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';
import type { Database } from '../src/integrations/supabase/types';

// Create a Supabase client for the Electron main process
// Temporarily using anon key to test authentication issue
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
