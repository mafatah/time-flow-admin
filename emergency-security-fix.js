#!/usr/bin/env node

/**
 * EMERGENCY SECURITY FIX SCRIPT
 * 
 * This script helps secure the TimeFlow application by:
 * 1. Creating a secure .env template
 * 2. Updating .gitignore to prevent future leaks
 * 3. Creating a list of files that need manual token removal
 */

import fs from 'fs';
import path from 'path';

console.log('🚨 EMERGENCY SECURITY FIX SCRIPT');
console.log('=====================================\n');

// 1. Create .env template
const envTemplate = `# TimeFlow Application Environment Variables
# IMPORTANT: Never commit this file to Git!

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anonymous-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Development Settings
NODE_ENV=development
VITE_APP_TITLE=TimeFlow Admin

# Production Settings (for deployment)
# Set these in your hosting platform's environment variables
`;

// 2. Create .env.example for documentation
const envExample = `# TimeFlow Environment Variables Template
# Copy this file to .env and fill in your actual values

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anonymous-key
SUPABASE_SERVICE_KEY=your-service-key
NODE_ENV=development
`;

// 3. Update .gitignore
const gitignoreAdditions = `
# Environment variables - NEVER COMMIT
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Security
*.pem
*.key
credentials.json

# Supabase
.supabase/

# Temporary files
*.tmp
*.temp
temp/
`;

try {
  // Create .env template
  if (!fs.existsSync('.env')) {
    fs.writeFileSync('.env', envTemplate);
    console.log('✅ Created .env template file');
  } else {
    console.log('ℹ️  .env file already exists');
  }

  // Create .env.example
  fs.writeFileSync('.env.example', envExample);
  console.log('✅ Created .env.example template');

  // Update .gitignore
  let gitignoreContent = '';
  if (fs.existsSync('.gitignore')) {
    gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  }

  if (!gitignoreContent.includes('.env')) {
    fs.appendFileSync('.gitignore', gitignoreAdditions);
    console.log('✅ Updated .gitignore with security rules');
  } else {
    console.log('ℹ️  .gitignore already contains .env rules');
  }

  // Create list of files that need manual fixing
  const filesToFix = [
    'src/integrations/supabase/client.ts',
    'electron/main.ts',
    'electron/config.ts',
    'netlify.toml',
    'vercel.json',
    'All test-*.js files',
    'All check-*.js files',
    'All fix-*.js files',
    'All debug-*.html files'
  ];

  const fixInstructions = `# FILES REQUIRING MANUAL TOKEN REMOVAL

## 🚨 CRITICAL: These files contain hardcoded tokens that must be removed:

${filesToFix.map(file => `- ${file}`).join('\n')}

## 📝 Manual Steps Required:

1. **FIRST**: Go to Supabase Dashboard and regenerate ALL API keys
2. **Replace hardcoded tokens** in above files with environment variables:
   
   Replace this pattern:
   \`\`\`
   // Example removed for security - use environment variables instead
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
   \`\`\`
   
   With this:
   \`\`\`
   const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
   \`\`\`

3. **Update your .env file** with new tokens from Supabase
4. **Remove all built files** in dist/ and rebuild
5. **Commit changes** and push to clean the repository

## 🔐 Environment Variable Patterns:

- URL: \`process.env.VITE_SUPABASE_URL\`
- Anon Key: \`process.env.VITE_SUPABASE_ANON_KEY\`
- Service Key: \`process.env.SUPABASE_SERVICE_KEY\`

## ⚠️  REMEMBER:
- Never hardcode secrets again
- Always use environment variables
- Add security scanning to your workflow
`;

  fs.writeFileSync('SECURITY-FIX-INSTRUCTIONS.md', fixInstructions);
  console.log('✅ Created SECURITY-FIX-INSTRUCTIONS.md');

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. 🚨 URGENT: Go to Supabase Dashboard and regenerate API keys');
  console.log('2. 📝 Follow instructions in SECURITY-FIX-INSTRUCTIONS.md');
  console.log('3. 🔄 Rebuild and redeploy your application');
  console.log('4. 📊 Check security-fix-report.md for full details');

} catch (error) {
  console.error('❌ Error running security fix script:', error);
} 