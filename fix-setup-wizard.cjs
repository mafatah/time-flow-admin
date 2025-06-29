const fs = require('fs');
const path = require('path');

// Create setup completion file in all possible locations
const completionData = {
  completed: true,
  timestamp: new Date().toISOString(),
  version: '1.0.39'
};

const possiblePaths = [
  path.join(__dirname, 'build', 'electron', '.setup-complete'),
  path.join(__dirname, 'electron', '.setup-complete'),
  path.join(__dirname, 'dist', 'mac-arm64', 'Ebdaa Work Time.app', 'Contents', 'Resources', 'app.asar.unpacked', '.setup-complete'),
  path.join(__dirname, '.setup-complete')
];

console.log('🔧 Creating setup completion files...');

possiblePaths.forEach(filePath => {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write completion file
    fs.writeFileSync(filePath, JSON.stringify(completionData, null, 2));
    console.log(`✅ Created: ${filePath}`);
  } catch (error) {
    console.log(`⚠️ Could not create: ${filePath} - ${error.message}`);
  }
});

console.log('🎉 Setup completion files created! Restart the app to bypass setup wizard.'); 