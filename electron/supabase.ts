import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';

// Use the configuration values which include fallbacks for production
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export { supabase };
