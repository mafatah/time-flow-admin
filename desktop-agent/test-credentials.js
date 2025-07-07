#!/usr/bin/env node

// Test script to verify credential setup
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Desktop Agent Credential Setup');
console.log('==========================================');

// Test 1: Check if .env.template exists
console.log('\n1. Checking .env.template...');
const templatePath = path.join(__dirname, '.env.template');
if (fs.existsSync(templatePath)) {
  console.log('✅ .env.template exists');
} else {
  console.log('❌ .env.template is missing');
}

// Test 2: Check if .env exists
console.log('\n2. Checking .env file...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  
  // Check if it has credentials
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('your_supabase_url_here')) {
    console.log('⚠️  .env file uses template values - please update with real credentials');
  } else {
    console.log('✅ .env file appears to have real credentials');
  }
} else {
  console.log('⚠️  .env file not found - run ./setup-local-env.sh to create it');
}

// Test 3: Test config loading
console.log('\n3. Testing configuration loading...');
try {
  const { loadConfig } = require('./load-config');
  const config = loadConfig();
  
  if (config.supabase_url && config.supabase_key) {
    console.log('✅ Configuration loaded successfully');
    console.log(`   Supabase URL: ${config.supabase_url}`);
    console.log(`   Anon key length: ${config.supabase_key.length} chars`);
    console.log(`   Service key available: ${!!config.supabase_service_key}`);
  } else {
    console.log('❌ Configuration missing required fields');
  }
} catch (error) {
  console.log('❌ Configuration loading failed:', error.message);
}

// Test 4: Test build config generation
console.log('\n4. Testing build configuration generation...');
try {
  // Set a flag to indicate this is a test
  process.argv.push('--build');
  require('./generate-env-config');
  
  // Check if env-config.js was generated
  const generatedConfigPath = path.join(__dirname, 'env-config.js');
  if (fs.existsSync(generatedConfigPath)) {
    console.log('✅ Build configuration generated successfully');
    
    // Check the generated content
    const generatedConfig = require('./env-config');
    if (generatedConfig._generated) {
      console.log('✅ Generated config has proper metadata');
    }
  } else {
    console.log('❌ Build configuration generation failed');
  }
} catch (error) {
  console.log('❌ Build configuration generation failed:', error.message);
}

console.log('\n🎯 Test Summary:');
console.log('================');
console.log('✅ = Working correctly');
console.log('⚠️  = Needs attention');
console.log('❌ = Error that needs fixing');
console.log('');
console.log('💡 To fix issues:');
console.log('   1. Run: ./setup-local-env.sh');
console.log('   2. Edit .env with your real Supabase credentials');
console.log('   3. Test with: npm start'); 