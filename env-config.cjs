// Auto-generated configuration file
// This file loads Supabase credentials from environment variables only
// Generated: ${new Date().toISOString()}

module.exports = {
    supabase_url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    supabase_key: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    app_url: process.env.VITE_APP_URL || '',
    environment: process.env.VITE_ENVIRONMENT || 'development',
    debug_mode: process.env.VITE_DEBUG_MODE === 'true'
};
