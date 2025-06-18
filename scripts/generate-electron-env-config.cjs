#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
require('dotenv').config();

console.log('🔧 Generating electron environment configuration...');

// Ensure build directory exists
const buildDir = path.join(__dirname, '..', 'build', 'electron', 'electron');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const outputPath = path.join(buildDir, 'env-config.js');

// Get credentials from environment variables
const credentials = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
};

// Validate required credentials
if (!credentials.VITE_SUPABASE_URL || !credentials.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
  console.error('');
  console.error('💡 Please set these environment variables or create a .env file');
  console.error('   You can find these values in your Supabase dashboard > Settings > API');
  process.exit(1);
}

// Generate the env-config.js content
const envConfigContent = `// Embedded environment configuration for packaged electron app
// Generated automatically during build - DO NOT EDIT MANUALLY
module.exports = {
  VITE_SUPABASE_URL: '${credentials.VITE_SUPABASE_URL}',
  VITE_SUPABASE_ANON_KEY: '${credentials.VITE_SUPABASE_ANON_KEY}',
  SUPABASE_URL: '${credentials.SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${credentials.SUPABASE_ANON_KEY}',
  SUPABASE_SERVICE_ROLE_KEY: '${credentials.SUPABASE_SERVICE_ROLE_KEY}'
};
`;

// Write the generated config
fs.writeFileSync(outputPath, envConfigContent);

console.log('✅ Electron environment configuration generated successfully');
console.log(`   Using Supabase URL: ${credentials.VITE_SUPABASE_URL}`);
console.log(`   Anon key length: ${credentials.VITE_SUPABASE_ANON_KEY.length} characters`);
console.log(`   Service key available: ${!!credentials.SUPABASE_SERVICE_ROLE_KEY}`);
console.log(`   Output file: ${outputPath}`); 