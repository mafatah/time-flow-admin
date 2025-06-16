#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 Fixing desktop app environment variables...');

// Read current .env file
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found in project root');
    process.exit(1);
}

// Extract required environment variables
const requiredEnvVars = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
};

// Validate required variables
if (!requiredEnvVars.VITE_SUPABASE_URL || !requiredEnvVars.VITE_SUPABASE_ANON_KEY) {
    console.error('❌ Missing required Supabase environment variables');
    console.error('   VITE_SUPABASE_URL:', requiredEnvVars.VITE_SUPABASE_URL ? '✓' : '❌');
    console.error('   VITE_SUPABASE_ANON_KEY:', requiredEnvVars.VITE_SUPABASE_ANON_KEY ? '✓' : '❌');
    process.exit(1);
}

// Create embedded config file for desktop app
const desktopEnvPath = path.join(process.cwd(), 'desktop-agent', '.env');
const envContent = `# Generated environment file for desktop app
VITE_SUPABASE_URL=${requiredEnvVars.VITE_SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${requiredEnvVars.VITE_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY}
NODE_ENV=production
`;

fs.writeFileSync(desktopEnvPath, envContent);
console.log('✅ Created desktop-agent/.env file');

// Also create a config.js file that can be bundled
const configPath = path.join(process.cwd(), 'desktop-agent', 'env-config.js');
const configContent = `// Generated configuration file for desktop app
module.exports = {
    SUPABASE_URL: "${requiredEnvVars.VITE_SUPABASE_URL}",
    SUPABASE_ANON_KEY: "${requiredEnvVars.VITE_SUPABASE_ANON_KEY}",
    SUPABASE_SERVICE_KEY: "${requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY}",
    NODE_ENV: "production"
};
`;

fs.writeFileSync(configPath, configContent);
console.log('✅ Created desktop-agent/env-config.js file');

// Update the main.js to use embedded config as fallback
const mainJsPath = path.join(process.cwd(), 'desktop-agent', 'src', 'main.js');
if (fs.existsSync(mainJsPath)) {
    let mainContent = fs.readFileSync(mainJsPath, 'utf8');
    
    // Add fallback config loading at the top
    const fallbackConfig = `
// Fallback configuration for packaged app
let embeddedConfig = {};
try {
    embeddedConfig = require('../env-config.js');
} catch (e) {
    console.log('📄 No embedded config found, using environment variables');
}

// Set environment variables from embedded config if available
if (embeddedConfig.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    process.env.VITE_SUPABASE_URL = embeddedConfig.SUPABASE_URL;
    process.env.VITE_SUPABASE_ANON_KEY = embeddedConfig.SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = embeddedConfig.SUPABASE_SERVICE_KEY;
    console.log('✅ Using embedded configuration for Supabase');
}
`;

    // Insert fallback config after the initial requires
    if (!mainContent.includes('embeddedConfig')) {
        const insertPos = mainContent.indexOf("require('dotenv').config();");
        if (insertPos !== -1) {
            const afterDotenv = mainContent.indexOf('\n', insertPos) + 1;
            mainContent = mainContent.slice(0, afterDotenv) + fallbackConfig + mainContent.slice(afterDotenv);
            fs.writeFileSync(mainJsPath, mainContent);
            console.log('✅ Updated main.js with embedded config fallback');
        }
    }
}

// Update build script to include env files
const buildPath = path.join(process.cwd(), 'build', 'desktop-agent');
if (fs.existsSync(buildPath)) {
    // Copy env files to build directory
    const buildEnvPath = path.join(buildPath, '.env');
    const buildConfigPath = path.join(buildPath, 'env-config.js');
    
    fs.copyFileSync(desktopEnvPath, buildEnvPath);
    fs.copyFileSync(configPath, buildConfigPath);
    
    console.log('✅ Copied env files to build directory');
}

console.log('');
console.log('🎉 Desktop app environment fix complete!');
console.log('📋 Changes made:');
console.log('   • Created desktop-agent/.env with Supabase credentials');
console.log('   • Created desktop-agent/env-config.js for bundling');
console.log('   • Updated main.js with embedded config fallback');
console.log('   • Copied files to build directory');
console.log('');
console.log('💡 Next steps:');
console.log('   1. Rebuild the desktop app: npm run build:electron');
console.log('   2. Test locally: cd desktop-agent && npm start');
console.log('   3. Build new DMG: npm run electron:build'); 