import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';

// Validate configuration before creating client
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase configuration in electron app');
}

// Use the configuration values with proper type assertion
const supabase = createClient(SUPABASE_URL as string, SUPABASE_PUBLISHABLE_KEY as string);

export { supabase };
