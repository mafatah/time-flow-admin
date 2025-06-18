const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, 'build/electron/electron');

// Get all .cjs files in the build directory
const files = fs.readdirSync(buildDir).filter(file => file.endsWith('.cjs'));

files.forEach(file => {
  const filePath = path.join(buildDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix relative imports to use .cjs extension
  content = content.replace(/require\((['"`])\.\/([^'"`]+)\1\)/g, (match, quote, moduleName) => {
    // Don't modify if already has extension
    if (moduleName.includes('.')) {
      return match;
    }
    
    // Check if the .cjs file exists
    const targetFile = path.join(buildDir, moduleName + '.cjs');
    if (fs.existsSync(targetFile)) {
      return `require(${quote}./${moduleName}.cjs${quote})`;
    }
    
    return match;
  });
  
  // Fix dynamic imports too
  content = content.replace(/import\((['"`])\.\/([^'"`]+)\1\)/g, (match, quote, moduleName) => {
    // Don't modify if already has extension
    if (moduleName.includes('.')) {
      return match;
    }
    
    // Check if the .cjs file exists
    const targetFile = path.join(buildDir, moduleName + '.cjs');
    if (fs.existsSync(targetFile)) {
      return `import(${quote}./${moduleName}.cjs${quote})`;
    }
    
    return match;
  });
  
  // Specific fix for secure-config import issues
  content = content.replace(/require\((['"`])\.\/secure-config\1\)/g, 'require($1./secure-config.cjs$1)');
  content = content.replace(/import\((['"`])\.\/secure-config\1\)/g, 'import($1./secure-config.cjs$1)');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed imports in ${file}`);
});

console.log('Import fixing complete!');
