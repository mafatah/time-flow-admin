#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

console.log('🔧 COMPREHENSIVE CREDENTIAL CLEANUP');
console.log('===================================');

const HARDCODED_URL = 'process.env.VITE_SUPABASE_URL';
const HARDCODED_KEY = 'process.env.VITE_SUPABASE_ANON_KEY';

// Fix patterns that were incorrectly replaced
const MALFORMED_PATTERNS = [
  '\'${process.env.VITE_SUPABASE_URL}\'',
  '"${process.env.VITE_SUPABASE_URL}"',
  '\'${process.env.VITE_SUPABASE_ANON_KEY}\'',
  '"${process.env.VITE_SUPABASE_ANON_KEY}"'
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Fix malformed environment variable patterns
    if (content.includes('\'${process.env.VITE_SUPABASE_URL}\'')) {
      content = content.replace(/'\$\{process\.env\.VITE_SUPABASE_URL\}'/g, 'process.env.VITE_SUPABASE_URL');
      changed = true;
    }
    
    if (content.includes('"${process.env.VITE_SUPABASE_URL}"')) {
      content = content.replace(/"\$\{process\.env\.VITE_SUPABASE_URL\}"/g, 'process.env.VITE_SUPABASE_URL');
      changed = true;
    }
    
    // Fix any remaining hardcoded URLs
    if (content.includes(HARDCODED_URL)) {
      content = content.replace(new RegExp(HARDCODED_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'process.env.VITE_SUPABASE_URL');
      changed = true;
    }
    
    // Fix any remaining hardcoded keys
    if (content.includes(HARDCODED_KEY)) {
      content = content.replace(new RegExp(HARDCODED_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'process.env.VITE_SUPABASE_ANON_KEY');
      changed = true;
    }
    
    // Fix malformed key patterns
    if (content.includes('process.env.VITE_SUPABASE_ANON_KEY || \'${process.env.VITE_SUPABASE_ANON_KEY}\'')) {
      content = content.replace(/process\.env\.VITE_SUPABASE_ANON_KEY \|\| '\$\{process\.env\.VITE_SUPABASE_ANON_KEY\}'/g, 'process.env.VITE_SUPABASE_ANON_KEY');
      changed = true;
    }
    
    // Add environment variable validation for scripts
    if (filePath.endsWith('.js') && !content.includes('dotenv') && content.includes('process.env.VITE_SUPABASE_URL')) {
      // Add dotenv import at the top if it's a standalone script
      const lines = content.split('\n');
      let hasImports = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('import ') || lines[i].includes('require(')) {
          hasImports = true;
          break;
        }
        if (lines[i].trim() && !lines[i].startsWith('//') && !lines[i].startsWith('/*')) {
          break;
        }
      }
      
      if (hasImports && !content.includes('dotenv')) {
        content = content.replace(
          /(import .+ from ['"][^'"]+['"];?\n)/,
          '$1import "dotenv/config";\n'
        );
        changed = true;
      }
    }
    
    // Add validation for environment variables
    if (content.includes('process.env.VITE_SUPABASE_URL') && !content.includes('VITE_SUPABASE_URL')) {
      const validationCode = `
// Validate environment variables
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');  
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file or environment configuration.');
  process.exit(1);
}
`;
      
      // Insert validation after imports but before main logic
      const createClientMatch = content.match(/(
// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient)/);
      if (createClientMatch) {
        content = content.replace(createClientMatch[0], validationCode + '\n' + createClientMatch[0]);
        changed = true;
      }
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Get all JavaScript files that might contain credentials
const jsFiles = [
  '*.js',
  'scripts/*.js',
  'scripts/*.cjs'
];

let totalFixed = 0;

console.log('🔍 Finding and fixing files...\n');

for (const pattern of jsFiles) {
  try {
    const files = await glob(pattern, { ignore: ['node_modules/**', 'dist/**', 'build/**'] });
    
    for (const file of files) {
      // Skip certain files
      if (file.includes('node_modules') || file.includes('package-lock') || file === 'comprehensive-credential-fix.js') {
        continue;
      }
      
      if (fixFile(file)) {
        totalFixed++;
      }
    }
  } catch (error) {
    console.error(`Error processing pattern ${pattern}:`, error.message);
  }
}

console.log(`\n📊 SUMMARY:`);
console.log(`Files fixed: ${totalFixed}`);
console.log('\n✅ All files have been updated to use environment variables!');
console.log('\n📋 NEXT STEPS:');
console.log('1. Set environment variables in Vercel dashboard');
console.log('2. Test locally with .env file');
console.log('3. Deploy to Vercel'); 