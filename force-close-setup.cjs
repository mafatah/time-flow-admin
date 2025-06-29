const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Force closing setup wizard and marking setup complete...');

// 1. Kill any stuck TimeFlow processes
exec('pkill -f "Ebdaa Work Time"', (error) => {
  if (error) {
    console.log('⚠️ No TimeFlow processes to kill or error killing:', error.message);
  } else {
    console.log('✅ Killed stuck TimeFlow processes');
  }
  
  // 2. Create setup completion files
  const completionData = {
    completed: true,
    timestamp: new Date().toISOString(),
    version: '1.0.39',
    forcedCompletion: true
  };

  const possiblePaths = [
    path.join(__dirname, 'build', 'electron', '.setup-complete'),
    path.join(__dirname, 'electron', '.setup-complete'),
    path.join(__dirname, 'dist', 'mac-arm64', 'Ebdaa Work Time.app', 'Contents', 'Resources', 'app.asar.unpacked', '.setup-complete'),
    path.join(__dirname, '.setup-complete')
  ];

  console.log('📝 Creating setup completion files...');
  possiblePaths.forEach(filePath => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(completionData, null, 2));
      console.log(`✅ Created: ${filePath}`);
    } catch (error) {
      console.log(`⚠️ Could not create: ${filePath} - ${error.message}`);
    }
  });

  // 3. Wait and restart the app
  console.log('⏳ Waiting 3 seconds before restarting...');
  setTimeout(() => {
    console.log('🚀 Restarting TimeFlow...');
    exec('open "/Applications/Ebdaa Work Time.app"', (error) => {
      if (error) {
        console.error('❌ Error restarting app:', error.message);
      } else {
        console.log('✅ TimeFlow restarted successfully!');
        console.log('🎉 Setup should now be bypassed completely.');
      }
    });
  }, 3000);
}); 