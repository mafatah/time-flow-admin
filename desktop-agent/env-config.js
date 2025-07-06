// Environment configuration for desktop app
// This file is dynamically loaded and can use environment variables
module.exports = {
  // Try to use environment variables first, fallback to placeholder values
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'PLACEHOLDER_SUPABASE_URL',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'PLACEHOLDER_SUPABASE_ANON_KEY',
  SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'PLACEHOLDER_SUPABASE_URL',
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'PLACEHOLDER_SUPABASE_ANON_KEY'
}; 