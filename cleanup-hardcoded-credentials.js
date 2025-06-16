#!/usr/bin/env node

/**
 * Script to remove hardcoded Supabase credentials from all files
 * This script will find and replace hardcoded credentials with environment variable usage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The hardcoded values to find and replace
const HARDCODED_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const HARDCODED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';
const HARDCODED_SERVICE_KEY_PATTERN = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzgzODg4MiwiZXhwIjoyMDYzNDE0ODgyfQ\..+/g;

// Files to skip (already cleaned or system files)
const SKIP_FILES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.env',
  'cleanup-hardcoded-credentials.js',
  'package-lock.json',
  '.dmg',
  '.app'
];

// File extensions to process
const PROCESS_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.cjs', '.mjs', '.json', '.md'];

let filesProcessed = 0;
let filesChanged = 0;
let credentialsFound = 0;

function shouldSkipFile(filePath) {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(__dirname, filePath);
  
  return SKIP_FILES.some(skip => 
    relativePath.includes(skip) || 
    fileName.startsWith('.') ||
    fileName.endsWith('.dmg') ||
    fileName.endsWith('.app')
  );
}

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return PROCESS_EXTENSIONS.includes(ext);
}

function cleanFileContent(content, filePath) {
  let changed = false;
  let newContent = content;
  
  // Count credential occurrences
  const urlMatches = (content.match(new RegExp(HARDCODED_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  const anonKeyMatches = (content.match(new RegExp(HARDCODED_ANON_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  const serviceKeyMatches = (content.match(HARDCODED_SERVICE_KEY_PATTERN) || []).length;
  
  if (urlMatches + anonKeyMatches + serviceKeyMatches > 0) {
    credentialsFound += (urlMatches + anonKeyMatches + serviceKeyMatches);
    console.log(`🔍 Found credentials in: ${path.relative(__dirname, filePath)}`);
    console.log(`   - URL instances: ${urlMatches}`);
    console.log(`   - Anon key instances: ${anonKeyMatches}`);
    console.log(`   - Service key instances: ${serviceKeyMatches}`);
  }
  
  // Replace hardcoded URL with environment variable usage
  if (content.includes(HARDCODED_URL)) {
    if (filePath.endsWith('.md')) {
      // For markdown files, just mask the URL
      newContent = newContent.replace(new RegExp(HARDCODED_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'https://your-project.supabase.co');
    } else {
      // For code files, replace with environment variable
      newContent = newContent.replace(new RegExp(HARDCODED_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '${process.env.VITE_SUPABASE_URL || ""}');
    }
    changed = true;
  }
  
  // Replace hardcoded anon key
  if (content.includes(HARDCODED_ANON_KEY)) {
    if (filePath.endsWith('.md')) {
      // For markdown files, just mask the key
      newContent = newContent.replace(new RegExp(HARDCODED_ANON_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'your_anon_key_here');
    } else {
      // For code files, replace with environment variable
      newContent = newContent.replace(new RegExp(HARDCODED_ANON_KEY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '${process.env.VITE_SUPABASE_ANON_KEY || ""}');
    }
    changed = true;
  }
  
  // Replace service role keys
  if (HARDCODED_SERVICE_KEY_PATTERN.test(content)) {
    if (filePath.endsWith('.md')) {
      newContent = newContent.replace(HARDCODED_SERVICE_KEY_PATTERN, 'your_service_role_key_here');
    } else {
      newContent = newContent.replace(HARDCODED_SERVICE_KEY_PATTERN, '${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}');
    }
    changed = true;
  }
  
  return { content: newContent, changed };
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (shouldSkipFile(fullPath)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && shouldProcessFile(fullPath)) {
      filesProcessed++;
      
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const result = cleanFileContent(content, fullPath);
        
        if (result.changed) {
          fs.writeFileSync(fullPath, result.content, 'utf8');
          filesChanged++;
          console.log(`✅ Cleaned: ${path.relative(__dirname, fullPath)}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${fullPath}:`, error.message);
      }
    }
  }
}

function main() {
  console.log('🧹 Starting hardcoded credential cleanup...\n');
  
  console.log('🔍 Scanning for hardcoded Supabase credentials...');
  console.log(`   URL: ${HARDCODED_URL}`);
  console.log(`   Anon Key: ${HARDCODED_ANON_KEY.substring(0, 50)}...`);
  console.log(`   Service Keys: [pattern matching]\n`);
  
  processDirectory(__dirname);
  
  console.log('\n📊 Cleanup Summary:');
  console.log(`   Files processed: ${filesProcessed}`);
  console.log(`   Files changed: ${filesChanged}`);
  console.log(`   Credentials found: ${credentialsFound}`);
  
  if (filesChanged > 0) {
    console.log('\n✅ Credential cleanup completed successfully!');
    console.log('   All hardcoded credentials have been replaced with environment variables.');
    console.log('   Please ensure your .env file contains the correct values.');
  } else {
    console.log('\n✨ No hardcoded credentials found - codebase is already clean!');
  }
}

// Run the cleanup
main(); 