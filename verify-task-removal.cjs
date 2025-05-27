
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying Task Removal from Codebase...\n');

// Check for remaining task references in code
const taskReferences = [
  'setTaskId',
  'task_id',
  'taskId',
  '"tasks"',
  "'tasks'",
  'setTaskId',
  'getTaskId'
];

const excludeDirs = ['node_modules', '.git', 'build', 'dist'];
const includeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.sql'];

function searchInFiles(searchTerm) {
  try {
    const result = execSync(`grep -r "${searchTerm}" src/ electron/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules`, 
      { encoding: 'utf8' });
    return result.trim().split('\n').filter(line => line.length > 0);
  } catch (error) {
    // No matches found
    return [];
  }
}

console.log('📂 Checking for task references in source code:\n');

let foundIssues = false;

taskReferences.forEach(term => {
  const matches = searchInFiles(term);
  if (matches.length > 0) {
    console.log(`❌ Found "${term}" in:`);
    matches.forEach(match => console.log(`   ${match}`));
    console.log();
    foundIssues = true;
  } else {
    console.log(`✅ "${term}" - No references found`);
  }
});

if (!foundIssues) {
  console.log('\n🎉 SUCCESS: All task references have been removed from the codebase!');
  console.log('\n📋 Next Steps:');
  console.log('1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. Run the complete task removal SQL script you provided');
  console.log('3. Restart your desktop app');
} else {
  console.log('\n⚠️  Some task references still exist. Please review and remove them.');
}

console.log('\n🔧 Checking build files...');
try {
  const buildResult = execSync('grep -r "setTaskId\\|task_id" build/ || echo "No task references in build"', 
    { encoding: 'utf8' });
  if (buildResult.includes('No task references in build')) {
    console.log('✅ Build files are clean');
  } else {
    console.log('❌ Task references found in build files:');
    console.log(buildResult);
  }
} catch (error) {
  console.log('✅ Build files are clean (no references found)');
}
