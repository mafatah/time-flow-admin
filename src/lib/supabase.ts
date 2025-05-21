
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// These should be automatically injected by the Lovable Supabase integration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase credentials are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials are missing. Please connect to Supabase by clicking the green Supabase button in the top right corner.");
}

// Create a dummy client when in development without credentials
// This prevents the app from crashing completely during development
const createDummyClient = () => {
  return {
    from: () => ({
      select: () => ({ data: null, error: new Error('No Supabase connection') }),
      insert: () => ({ data: null, error: new Error('No Supabase connection') }),
      update: () => ({ data: null, error: new Error('No Supabase connection') }),
      delete: () => ({ data: null, error: new Error('No Supabase connection') }),
      eq: () => ({ data: null, error: new Error('No Supabase connection') }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('No Supabase connection') }),
      signOut: () => Promise.resolve({ error: null }),
    },
  } as any;
};

// Create actual client if credentials exist, otherwise use dummy client
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : createDummyClient();

export type SupabaseClient = typeof supabase;
