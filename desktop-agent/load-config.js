const fs = require('fs');
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
    
    envContent.split('
').forEach(line => {
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
  console.log(`   Using Supabase URL: ${config.supabase_url}`);
  console.log(`   Using credentials from: ${envConfig.SUPABASE_URL ? '.env file' : embeddedConfig.SUPABASE_URL ? 'embedded config' : 'config.json'}`);
  console.log(`   Service role key available: ${!!config.supabase_service_key}`);
  console.log(`   Service role key length: ${config.supabase_service_key ? config.supabase_service_key.length : 0}`);
  
  return config;
}

module.exports = { loadConfig }; 
