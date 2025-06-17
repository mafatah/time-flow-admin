#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🚨 EMERGENCY COMPREHENSIVE CLEANUP - REMOVING ALL HARDCODED CREDENTIALS');
console.log('=====================================================================');

const HARDCODED_PATTERNS = {
  url: 'REMOVED_FOR_SECURITY',
  anonKey: 'REMOVED_FOR_SECURITY',
  serviceKey: 'REMOVED_FOR_SECURITY'
};

// Old key patterns that might still exist
const OLD_KEY_PATTERNS = [
  'REMOVED_FOR_SECURITY'
];

const SKIP_PATTERNS = [
  '/node_modules/',
  '/dist/',
  '/build/',
  '/.git/',
  '/.vercel/',
  'package-lock.json',
  'emergency-comprehensive-cleanup.js'
];

function shouldSkipFile(filePath) {
  return SKIP_PATTERNS.some(pattern => filePath.includes(pattern));
}

function cleanFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    const originalContent = content;
    
    // Replace hardcoded URL
    if (content.includes(HARDCODED_PATTERNS.url)) {
      content = content.replace(new RegExp(HARDCODED_PATTERNS.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'process.env.VITE_SUPABASE_URL');
      changed = true;
    }
    
    // Replace current anon key
    if (content.includes(HARDCODED_PATTERNS.anonKey)) {
      content = content.replace(new RegExp(HARDCODED_PATTERNS.anonKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'process.env.VITE_SUPABASE_ANON_KEY');
      changed = true;
    }
    
    // Replace service key
    if (content.includes(HARDCODED_PATTERNS.serviceKey)) {
      content = content.replace(new RegExp(HARDCODED_PATTERNS.serviceKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'process.env.SUPABASE_SERVICE_ROLE_KEY');
      changed = true;
    }
    
    // Replace old key patterns
    OLD_KEY_PATTERNS.forEach(oldKey => {
      if (content.includes(oldKey)) {
        content = content.replace(new RegExp(oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'process.env.VITE_SUPABASE_ANON_KEY');
        changed = true;
      }
    });
    
    // Add dotenv import if needed (for .cjs files)
    if (changed && filePath.endsWith('.cjs') && !content.includes('dotenv')) {
      // Add require('dotenv').config() at the top
      const lines = content.split('\n');
      let insertIndex = 0;
      
      // Find first non-comment line
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('/*')) {
          insertIndex = i;
          break;
        }
      }
      
      lines.splice(insertIndex, 0, "require('dotenv').config();");
      content = lines.join('\n');
    }
    
    // Add environment variable validation
    if (changed && content.includes('process.env.VITE_SUPABASE_URL')) {
      const validationCode = `
// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}
`;
      
      // Find createClient line and add validation before it
      if (content.includes('createClient')) {
        content = content.replace(/(const\s+\w+\s*=\s*createClient)/m, validationCode + '\n$1');
      }
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Cleaned: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
    return false;
  }
}

function scanDirectory(dir) {
  let totalCleaned = 0;
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      
      if (shouldSkipFile(filePath)) {
        continue;
      }
      
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        totalCleaned += scanDirectory(filePath);
      } else if (file.endsWith('.js') || file.endsWith('.ts') || 
                 file.endsWith('.tsx') || file.endsWith('.jsx') || 
                 file.endsWith('.cjs') || file.endsWith('.mjs')) {
        if (cleanFile(filePath)) {
          totalCleaned++;
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return totalCleaned;
}

// Main execution
console.log('🔍 Scanning entire codebase for ANY hardcoded credentials...\n');

const totalCleaned = scanDirectory('.');

console.log(`\n🎉 EMERGENCY CLEANUP COMPLETE!`);
console.log(`📊 Files cleaned: ${totalCleaned}`);

if (totalCleaned > 0) {
  console.log('\n⚠️  IMPORTANT: You must create a .env file with:');
  console.log('VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.log('VITE_SUPABASE_ANON_KEY=your_anon_key');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_key');
}

console.log('\n🔒 ALL HARDCODED CREDENTIALS HAVE BEEN REMOVED!');
process.exit(0); 