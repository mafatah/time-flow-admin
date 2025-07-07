const fs = require('fs');
const path = require('path');

console.log('🔧 Generating secure environment configuration...');

// Check if environment variables are available
const hasEnvVars = process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY;

if (!hasEnvVars) {
  console.log('⚠️  No environment variables found. Please set up your .env file first.');
  console.log('   Required variables:');
  console.log('   - VITE_SUPABASE_URL');
  console.log('   - VITE_SUPABASE_ANON_KEY');
  console.log('');
  console.log('📋 Create a .env file in the desktop-agent directory with your Supabase credentials.');
  process.exit(1);
}

// Generate env-config.js with environment variable references only
const configContent = `// Auto-generated configuration file
// This file loads Supabase credentials from environment variables only
// Generated: ${new Date().toISOString()}

module.exports = {
    supabase_url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    supabase_key: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    app_url: process.env.VITE_APP_URL || '',
    environment: process.env.VITE_ENVIRONMENT || 'development',
    debug_mode: process.env.VITE_DEBUG_MODE === 'true'
};
`;

// Write to env-config.js
fs.writeFileSync(path.join(__dirname, 'env-config.js'), configContent);

console.log('✅ Configuration file generated successfully');
console.log('🔒 No credentials embedded - using environment variables only');
console.log('📁 File location: env-config.js'); 