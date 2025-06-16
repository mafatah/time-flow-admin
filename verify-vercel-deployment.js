#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 VERIFYING VERCEL DEPLOYMENT READINESS');
console.log('======================================');

const HARDCODED_URL = process.env.VITE_SUPABASE_URL;
const HARDCODED_KEY_PATTERN = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIi/;

let issues = [];
let criticalFiles = [];
let cleanFiles = [];

// Files that should definitely not contain hardcoded credentials
const CRITICAL_FILES = [
  'src/integrations/supabase/client.ts',
  'electron/config.ts',
  'desktop-agent/load-config.js',
  'desktop-agent/config.json',
  'vercel.json',
  'package.json'
];

// Check if a file contains hardcoded credentials
function checkFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { exists: false };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const hasHardcodedUrl = content.includes(HARDCODED_URL);
    const hasHardcodedKey = HARDCODED_KEY_PATTERN.test(content);
    
    return {
      exists: true,
      hasHardcodedUrl,
      hasHardcodedKey,
      hasCredentials: hasHardcodedUrl || hasHardcodedKey,
      usesEnvVars: content.includes('process.env.VITE_SUPABASE_URL') || content.includes('import.meta.env.VITE_SUPABASE_URL')
    };
  } catch (error) {
    return { exists: true, error: error.message };
  }
}

// Check critical production files
console.log('📋 CHECKING CRITICAL PRODUCTION FILES:');
console.log('=====================================');

CRITICAL_FILES.forEach(file => {
  const result = checkFile(file);
  
  if (!result.exists) {
    console.log(`⚠️  ${file} - FILE NOT FOUND`);
    issues.push(`Missing file: ${file}`);
    return;
  }
  
  if (result.error) {
    console.log(`❌ ${file} - ERROR: ${result.error}`);
    issues.push(`Error reading ${file}: ${result.error}`);
    return;
  }
  
  if (result.hasCredentials) {
    console.log(`❌ ${file} - CONTAINS HARDCODED CREDENTIALS`);
    criticalFiles.push(file);
    issues.push(`${file} contains hardcoded credentials`);
  } else if (result.usesEnvVars) {
    console.log(`✅ ${file} - USES ENVIRONMENT VARIABLES`);
    cleanFiles.push(file);
  } else {
    console.log(`⚠️  ${file} - NO CREDENTIALS FOUND (may be OK)`);
  }
});

// Scan for any remaining files with hardcoded credentials
console.log('\n🔍 SCANNING FOR REMAINING HARDCODED CREDENTIALS:');
console.log('===============================================');

function scanForCredentials(dir, maxDepth = 3, currentDepth = 0) {
  if (currentDepth > maxDepth) return;
  
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      // Skip certain directories
      if (['node_modules', '.git', 'dist', 'build', '.vercel'].includes(file)) {
        return;
      }
      
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanForCredentials(filePath, maxDepth, currentDepth + 1);
      } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.json')) {
        const result = checkFile(filePath);
        
        if (result.hasCredentials) {
          const relativePath = path.relative(__dirname, filePath);
          console.log(`❌ ${relativePath} - CONTAINS HARDCODED CREDENTIALS`);
          issues.push(`${relativePath} contains hardcoded credentials`);
        }
      }
    });
  } catch (error) {
    // Skip directories we can't read
  }
}

scanForCredentials(__dirname);

// Check environment configuration
console.log('\n⚙️  CHECKING ENVIRONMENT CONFIGURATION:');
console.log('=====================================');

// Check if .env.example exists and is properly configured
const envExample = checkFile('.env.example');
if (envExample.exists && !envExample.hasCredentials) {
  console.log('✅ .env.example - PROPERLY CONFIGURED (no hardcoded credentials)');
} else if (envExample.hasCredentials) {
  console.log('⚠️  .env.example - Contains example credentials (this is OK)');
} else {
  console.log('⚠️  .env.example - NOT FOUND');
}

// Check Vercel configuration
const vercelConfig = checkFile('vercel.json');
if (vercelConfig.exists) {
  console.log('✅ vercel.json - EXISTS');
} else {
  console.log('❌ vercel.json - NOT FOUND');
  issues.push('vercel.json is missing');
}

// Final report
console.log('\n📊 VERIFICATION REPORT:');
console.log('=====================');

console.log(`✅ Clean files: ${cleanFiles.length}`);
console.log(`❌ Files with issues: ${issues.length}`);

if (issues.length === 0) {
  console.log('\n🎉 SUCCESS! Your project is ready for Vercel deployment!');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Set environment variables in Vercel dashboard');
  console.log('2. Deploy with: vercel --prod');
  console.log('3. Verify application works with production environment');
} else {
  console.log('\n⚠️  ISSUES FOUND:');
  issues.forEach(issue => console.log(`   - ${issue}`));
  
  console.log('\n🛠️  RECOMMENDED ACTIONS:');
  console.log('1. Fix the issues listed above');
  console.log('2. Run this script again to verify');
  console.log('3. Once clean, deploy to Vercel');
}

console.log('\n📝 VERCEL ENVIRONMENT VARIABLES NEEDED:');
console.log('   - VITE_SUPABASE_URL');
console.log('   - VITE_SUPABASE_ANON_KEY');
console.log('   - SUPABASE_SERVICE_ROLE_KEY');
console.log('   - APPLE_ID (for desktop app signing)');
console.log('   - APPLE_APP_SPECIFIC_PASSWORD');
console.log('   - APPLE_TEAM_ID');

process.exit(issues.length > 0 ? 1 : 0); 