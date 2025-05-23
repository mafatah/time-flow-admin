const fs = require('fs');
const path = require('path');

function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Fix require statements for relative imports
  let fixedContent = content.replace(/require\("\.\/([^"]+)"\)/g, (match, p1) => {
    if (p1.endsWith('.cjs')) {
      return match; // Already has .cjs extension
    }
    return `require("./${p1}.cjs")`;
  });
  
  // Fix preload.js references
  fixedContent = fixedContent.replace(/preload\.js/g, 'preload.cjs');
  
  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent);
    console.log(`Fixed imports in ${filePath}`);
  }
}

function findAndFixFiles(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findAndFixFiles(fullPath);
    } else if (file.endsWith('.cjs')) {
      fixImportsInFile(fullPath);
    }
  }
}

findAndFixFiles('./build/electron');
console.log('Import fixing complete!');
