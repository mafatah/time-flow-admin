const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const envVars = {};
envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
            envVars[key.trim()] = value.trim();
        }
    }
});

console.log('🔧 Loaded environment variables:', {
    hasUrl: !!envVars.VITE_SUPABASE_URL,
    hasKey: !!envVars.VITE_SUPABASE_ANON_KEY,
    urlPreview: envVars.VITE_SUPABASE_URL ? envVars.VITE_SUPABASE_URL.substring(0, 30) + '...' : 'None'
});

// Generate env-config.js with embedded credentials
const configContent = `// Auto-generated configuration file
// This file embeds Supabase credentials into the desktop app
// Generated: ${new Date().toISOString()}

module.exports = {
    supabase_url: '${envVars.VITE_SUPABASE_URL}',
    supabase_key: '${envVars.VITE_SUPABASE_ANON_KEY}',
    app_url: '${envVars.VITE_APP_URL || ''}',
    environment: '${envVars.VITE_ENVIRONMENT || 'development'}',
    debug_mode: ${envVars.VITE_DEBUG_MODE === 'true'}
};
`;

// Write to env-config.js
fs.writeFileSync(path.join(__dirname, 'env-config.js'), configContent);

console.log('✅ Generated env-config.js with embedded Supabase credentials');
console.log('📄 File created at:', path.join(__dirname, 'env-config.js')); 