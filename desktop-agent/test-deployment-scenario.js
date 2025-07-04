const fs = require('fs');
const path = require('path');

console.log('🧪 Testing deployment scenario (without .env file)...');

// Backup .env file if it exists
const envPath = path.join(__dirname, '.env');
const envBackupPath = path.join(__dirname, '.env.backup');

if (fs.existsSync(envPath)) {
  console.log('📄 Backing up .env file...');
  fs.renameSync(envPath, envBackupPath);
  console.log('✅ .env file backed up');
}

try {
  // Try to load config without .env file (like in deployment)
  console.log('🔧 Loading config without .env file...');
  const { loadConfig } = require('./load-config');
  const config = loadConfig();
  
  console.log('✅ Config loaded successfully');
  console.log('   Config:', config);
  
} catch (error) {
  console.error('❌ ERROR REPRODUCED:', error.message);
  console.error('This is the same error users see in the packaged app!');
} finally {
  // Restore .env file
  if (fs.existsSync(envBackupPath)) {
    console.log('🔄 Restoring .env file...');
    fs.renameSync(envBackupPath, envPath);
    console.log('✅ .env file restored');
  }
}

console.log('�� Test complete'); 