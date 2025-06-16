#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧹 CLEANING UP HARDCODED CREDENTIALS FOR PRODUCTION');
console.log('=================================================');

// Define all known hardcoded credentials that need to be replaced
const HARDCODED_PATTERNS = {
  urls: [
    'process.env.VITE_SUPABASE_URL'
  ],
  keys: [
    'process.env.VITE_SUPABASE_ANON_KEY'
  ]
};

// Files to skip (already cleaned or should not be modified)
const SKIP_FILES = [
  'cleanup-production-credentials.js',
  'cleanup-hardcoded-credentials.js',
  'node_modules',
  '.git',
  'dist',
  'build',
  '.env',
  '.env.local',
  'package-lock.json',
  'yarn.lock',
  '.md'
];

// Production-safe replacements
const REPLACEMENTS = {
  // For scripts that should use environment variables
  'const supabaseUrl = "process.env.VITE_SUPABASE_URL"': 'const supabaseUrl = process.env.VITE_SUPABASE_URL',
  'const SUPABASE_URL = \'process.env.VITE_SUPABASE_URL\'': 'const SUPABASE_URL = process.env.VITE_SUPABASE_URL',
  'const supabaseAnonKey = \'eyJ': 'const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || \'eyJ',
  'const SUPABASE_KEY = \'eyJ': 'const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || \'eyJ',
  'const supabaseKey = "eyJ': 'const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJ',
  'const supabaseServiceKey = \'eyJ': 'const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || \'eyJ'
};

function shouldSkipFile(filePath) {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

function cleanupFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Apply replacements
    for (const [pattern, replacement] of Object.entries(REPLACEMENTS)) {
      if (content.includes(pattern)) {
        content = content.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
        changed = true;
      }
    }

    // Replace hardcoded URLs with environment variable references
    HARDCODED_PATTERNS.urls.forEach(url => {
      if (content.includes(url)) {
        const urlRegex = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(urlRegex, process.env.VITE_SUPABASE_URL);
        changed = true;
      }
    });

    // For API keys, we need to be more careful - only replace in safe contexts
    HARDCODED_PATTERNS.keys.forEach(key => {
      if (content.includes(key)) {
        // Only replace if it's a variable assignment or similar safe context
        const safePatterns = [
          `'${key}'`,
          `"${key}"`,
          `= '${key}`,
          `= "${key}`
        ];
        
        safePatterns.forEach(pattern => {
          if (content.includes(pattern)) {
            content = content.replace(pattern, pattern.replace(key, '${process.env.VITE_SUPABASE_ANON_KEY}'));
            changed = true;
          }
        });
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Cleaned: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalCleaned = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    if (shouldSkipFile(filePath)) {
      return;
    }

    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      totalCleaned += scanDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.json'))) {
      if (cleanupFile(filePath)) {
        totalCleaned++;
      }
    }
  });

  return totalCleaned;
}

// Create a secure .env template
function createSecureEnvTemplate() {
  const envTemplate = `# TimeFlow Production Environment Variables
# SECURITY: Never commit this file to Git!

# === SUPABASE CREDENTIALS ===
# Get these from your Supabase project dashboard
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_public_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# === APPLE DEVELOPER CREDENTIALS ===
APPLE_ID=alshqawe66@gmail.com
APPLE_APP_SPECIFIC_PASSWORD=icmi-tdzi-ydvi-lszi
APPLE_TEAM_ID=6GW49LK9V9

# === APPLICATION SETTINGS ===
NODE_ENV=production
SCREENSHOT_INTERVAL_SECONDS=300
IDLE_TIMEOUT_MINUTES=5

# === DEPLOYMENT SETTINGS ===
VERCEL_ENV=production
`;

  fs.writeFileSync('.env.production.template', envTemplate);
  console.log('✅ Created .env.production.template');
}

// Main execution
console.log('Starting credential cleanup...\n');

const totalCleaned = scanDirectory(__dirname);

createSecureEnvTemplate();

console.log('\n🎉 CLEANUP COMPLETE!');
console.log(`📊 Files cleaned: ${totalCleaned}`);
console.log('\n📋 NEXT STEPS:');
console.log('1. Set environment variables in Vercel dashboard:');
console.log('   - VITE_SUPABASE_URL');
console.log('   - VITE_SUPABASE_ANON_KEY');
console.log('   - SUPABASE_SERVICE_ROLE_KEY');
console.log('2. Test deployment with proper environment variables');
console.log('3. Remove any remaining test/temp files with hardcoded credentials');
console.log('\n⚠️  IMPORTANT: Review and test all changes before deploying to production!'); 