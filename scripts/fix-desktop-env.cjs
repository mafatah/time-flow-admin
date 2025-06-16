#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 Fixing desktop agent environment variables...');

// Supabase credentials from main project
const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const desktopAgentDir = path.join(__dirname, '..', 'desktop-agent');

// 1. Create desktop-agent/.env file
const envPath = path.join(desktopAgentDir, '.env');
const envContent = `VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseAnonKey}
`;

fs.writeFileSync(envPath, envContent);
console.log('✅ Created desktop-agent/.env file');

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
console.log('🎉 Desktop agent environment fix completed!');
console.log('');
console.log('The following changes were made:');
console.log('1. ✅ Created desktop-agent/.env file with Supabase credentials');
console.log('2. ✅ Created desktop-agent/env-config.js for packaged apps');
console.log('3. ✅ Updated desktop-agent/config.json with fallback credentials');
console.log('4. ✅ Enhanced desktop-agent/load-config.js with multiple fallbacks');
console.log('');
console.log('Now the desktop agent will work in all scenarios:');
console.log('- ✅ Development (uses .env file)');
console.log('- ✅ Packaged app (uses embedded env-config.js)');
console.log('- ✅ Fallback (uses config.json)');
console.log('');
console.log('🧪 Test the fix by running:');
console.log('   cd desktop-agent && node test-deployment-scenario.js'); 