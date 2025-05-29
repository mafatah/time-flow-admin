
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use the actual Supabase URL and anon key for this project
const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabaseClient: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Add connection test with proper error handling
const testConnection = async () => {
  try {
    const { error } = await supabaseClient.from('users').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Supabase connection test failed:', error.message);
    } else {
      console.log('Supabase connection successful');
    }
  } catch (error: any) {
    console.error('Supabase connection error:', error);
  }
};

testConnection();

export const supabase = supabaseClient;
