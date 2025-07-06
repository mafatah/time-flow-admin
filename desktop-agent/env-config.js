// Environment configuration for desktop app
// This file is dynamically loaded and can use environment variables
module.exports = {
  // Use environment variables or null (don't use placeholder values that cause invalid URL errors)
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || null,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || null,
  SUPABASE_URL: process.env.VITE_SUPABASE_URL || null,
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || null
}; 