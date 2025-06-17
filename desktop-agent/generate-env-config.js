#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
require('dotenv').config();

console.log('🔧 Generating embedded environment configuration...');

// Read template
const templatePath = path.join(__dirname, 'env-config.template.js');
const outputPath = path.join(__dirname, 'env-config.js');

if (!fs.existsSync(templatePath)) {
  console.error('❌ Template file not found:', templatePath);
  process.exit(1);
}

let template = fs.readFileSync(templatePath, 'utf8');

// Get credentials from environment variables
const credentials = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
};

// Validate required credentials
if (!credentials.VITE_SUPABASE_URL || !credentials.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
  console.error('');
  console.error('💡 Please set these environment variables or create a .env file in the desktop-agent directory');
  process.exit(1);
}

// Replace placeholders in template
Object.keys(credentials).forEach(key => {
  const placeholder = `{{${key}}}`;
  template = template.replace(new RegExp(placeholder, 'g'), credentials[key]);
});

// Write the generated config
fs.writeFileSync(outputPath, template);

console.log('✅ Environment configuration generated successfully');
console.log(`   Using Supabase URL: ${credentials.VITE_SUPABASE_URL}`);
console.log(`   Anon key length: ${credentials.VITE_SUPABASE_ANON_KEY.length} characters`);
console.log(`   Output file: ${outputPath}`); 