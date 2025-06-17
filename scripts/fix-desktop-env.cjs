#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 Setting up secure desktop agent environment...');

// Get credentials from environment variables (SECURE METHOD)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Missing required environment variables!');
  console.error('Please set the following in your .env file:');
  console.error('- VITE_SUPABASE_URL=your_supabase_url');
  console.error('- VITE_SUPABASE_ANON_KEY=your_anon_key');
  console.error('');
  console.error('You can find these values in your Supabase dashboard > Settings > API');
  process.exit(1);
}

const desktopAgentDir = path.join(__dirname, '..', 'desktop-agent');

// Create desktop-agent/.env file with credentials from main .env
const envPath = path.join(desktopAgentDir, '.env');
const envContent = `# Desktop Agent Environment Variables (Generated Securely)
# These are copied from your main .env file for desktop agent use
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseAnonKey}
`;

fs.writeFileSync(envPath, envContent);
console.log('✅ Created secure desktop-agent/.env file');

// 2. Create a JavaScript config file that gets bundled with the app
const envConfigPath = path.join(desktopAgentDir, 'env-config.js');
const envConfigContent = `// Embedded environment configuration for packaged app
module.exports = {
  VITE_SUPABASE_URL: '${supabaseUrl}',
  VITE_SUPABASE_ANON_KEY: '${supabaseAnonKey}',
  SUPABASE_URL: '${supabaseUrl}',
  SUPABASE_ANON_KEY: '${supabaseAnonKey}'
};
`;

fs.writeFileSync(envConfigPath, envConfigContent);
console.log('✅ Created desktop-agent/env-config.js file');

// 3. Update config.json to include Supabase credentials as fallback
const configPath = path.join(desktopAgentDir, 'config.json');
let config = {};

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

config.supabase_url = supabaseUrl;
config.supabase_key = supabaseAnonKey;

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('✅ Updated desktop-agent/config.json with Supabase credentials');

// 4. Update load-config.js to use embedded config as fallback
const loadConfigPath = path.join(desktopAgentDir, 'load-config.js');
const loadConfigContent = `const fs = require('fs');
const path = require('path');

// Try to load embedded config for packaged apps
let embeddedConfig = {};
try {
  embeddedConfig = require('./env-config');
} catch (error) {
  // Embedded config not available in development
}

require('dotenv').config({ path: path.join(__dirname, '.env') });

function loadConfig() {
  console.log('🔧 Loading desktop agent configuration...');
  
  // Load from .env file if it exists
  const envPath = path.join(__dirname, '.env');
  let envConfig = {};
  
  if (fs.existsSync(envPath)) {
    console.log('📄 Found .env file, loading credentials...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          envConfig[key.trim()] = value;
        }
      }
    });
  }
  
  // Load from config.json for other settings
  const configPath = path.join(__dirname, 'config.json');
  let jsonConfig = {};
  
  if (fs.existsSync(configPath)) {
    jsonConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  
  // Merge configurations with priority: process.env > .env > embedded > config.json
  const config = {
    ...jsonConfig,
    supabase_url: process.env.VITE_SUPABASE_URL || 
                  process.env.SUPABASE_URL || 
                  envConfig.SUPABASE_URL || 
                  embeddedConfig.SUPABASE_URL || 
                  jsonConfig.supabase_url || '',
    supabase_key: process.env.VITE_SUPABASE_ANON_KEY || 
                  process.env.SUPABASE_ANON_KEY || 
                  envConfig.SUPABASE_ANON_KEY || 
                  embeddedConfig.SUPABASE_ANON_KEY || 
                  jsonConfig.supabase_key || '',
    supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY || 
                          envConfig.SUPABASE_SERVICE_ROLE_KEY || 
                          ''
  };
  
  // Validate required credentials
  if (!config.supabase_url || !config.supabase_key) {
    console.error('❌ Missing Supabase credentials!');
    console.error('   Please ensure either:');
    console.error('   1. .env file contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    console.error('   2. OR environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
    console.error('   3. OR config.json contains supabase_url and supabase_key');
    console.error('   4. OR embedded config is available (for packaged apps)');
    throw new Error('Missing required Supabase environment variables');
  }
  
  console.log('✅ Configuration loaded successfully');
  console.log(\`   Using Supabase URL: \${config.supabase_url}\`);
  console.log(\`   Using credentials from: \${envConfig.SUPABASE_URL ? '.env file' : embeddedConfig.SUPABASE_URL ? 'embedded config' : 'config.json'}\`);
  console.log(\`   Service role key available: \${!!config.supabase_service_key}\`);
  console.log(\`   Service role key length: \${config.supabase_service_key ? config.supabase_service_key.length : 0}\`);
  
  return config;
}

module.exports = { loadConfig }; 
`;

fs.writeFileSync(loadConfigPath, loadConfigContent);
console.log('✅ Updated desktop-agent/load-config.js with embedded config support');

console.log('');
console.log('🎉 Secure desktop agent setup completed!');
console.log('');
console.log('🔒 SECURITY IMPROVEMENTS:');
console.log('1. ✅ Desktop agent .env file created from main environment');
console.log('2. ✅ No hardcoded credentials in script');
console.log('3. ✅ Proper validation and error handling');
console.log('');
console.log('🔧 The existing load-config.js will continue to work with:');
console.log('   Priority: process.env > .env > embedded > config.json'); 