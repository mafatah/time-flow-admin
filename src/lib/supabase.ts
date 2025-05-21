
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// These will be automatically injected by the Lovable Supabase integration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey
);

export type SupabaseClient = typeof supabase;
