#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔧 Generating embedded environment configuration...');

// Check if this is a build process (electron-builder sets this)
const isBuildProcess = process.env.npm_lifecycle_event === 'build' || 
                      process.env.npm_lifecycle_script?.includes('electron-builder') ||
                      process.argv.includes('--build');

console.log(`📦 Build process: ${isBuildProcess ? 'YES' : 'NO'}`);

// Get credentials from environment variables
const credentials = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
};

// During build process, credentials must be available
if (isBuildProcess) {
  console.log('🏗️ Build process detected - validating credentials...');
  
  if (!credentials.VITE_SUPABASE_URL || !credentials.VITE_SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables for build:');
    console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
    console.error('   VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
    console.error('');
    console.error('💡 For builds, set these environment variables:');
    console.error('   export VITE_SUPABASE_URL="your_url"');
    console.error('   export VITE_SUPABASE_ANON_KEY="your_key"');
    console.error('   OR create a .env file in desktop-agent/');
    process.exit(1);
  }
  
  console.log('✅ Build credentials validated');
} else {
  console.log('🔧 Development mode - will use fallback loading');
}

// Generate the embedded config
const configContent = `// Auto-generated embedded configuration
// Generated: ${new Date().toISOString()}
// Build process: ${isBuildProcess}

module.exports = {
  VITE_SUPABASE_URL: '${credentials.VITE_SUPABASE_URL}',
  VITE_SUPABASE_ANON_KEY: '${credentials.VITE_SUPABASE_ANON_KEY}',
  SUPABASE_URL: '${credentials.SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${credentials.SUPABASE_ANON_KEY}',
  SUPABASE_SERVICE_ROLE_KEY: '${credentials.SUPABASE_SERVICE_ROLE_KEY}',
  _generated: true,
  _build_process: ${isBuildProcess}
};
`;

// Write the generated config
const outputPath = path.join(__dirname, 'env-config.js');
fs.writeFileSync(outputPath, configContent);

console.log('✅ Environment configuration generated successfully');
console.log(`   Using Supabase URL: ${credentials.VITE_SUPABASE_URL}`);
console.log(`   Anon key length: ${credentials.VITE_SUPABASE_ANON_KEY.length} characters`);
console.log(`   Service key available: ${!!credentials.SUPABASE_SERVICE_ROLE_KEY}`);
console.log(`   Output file: ${outputPath}`); 