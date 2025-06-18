import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';

// Lazy-loaded Supabase client to ensure config is initialized first
let supabaseClient: SupabaseClient | null = null;

// Create Supabase client only when needed (after config is initialized)
function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = SUPABASE_URL();
    const key = SUPABASE_PUBLISHABLE_KEY();
    
    if (!url || !key) {
      throw new Error('Supabase configuration not initialized. Call initializeConfig() first.');
    }
    
    console.log('🔗 Creating Supabase client...');
    console.log(`   URL: ${url}`);
    console.log(`   Key length: ${key.length} characters`);
    
    supabaseClient = createClient(url, key);
    console.log('✅ Supabase client created successfully');
  }
  
  return supabaseClient;
}

// Reset client (for testing or config changes)
export function resetSupabaseClient() {
  supabaseClient = null;
  console.log('🔄 Supabase client reset');
}

// Export lazy-loaded client
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    
    // Bind functions to maintain context
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    return value;
  }
});
