// Test permissions using IPC (for renderer process)
// Copy and paste this into the DevTools console of the TimeFlow app

console.log('🔍 Testing permissions via IPC...');

// Test if we have access to electron's ipcRenderer
if (typeof window !== 'undefined' && window.electronAPI) {
  console.log('✅ Electron API available');
  
  // Try to trigger permission check
  window.electronAPI.testPermissions().then(result => {
    console.log('📊 Permission test result:', result);
  }).catch(err => {
    console.log('❌ Permission test failed:', err);
  });
  
} else if (typeof require !== 'undefined') {
  // Direct access in main process or with nodeIntegration
  console.log('✅ Direct require access available');
  
  try {
    const { ipcRenderer } = require('electron');
    
    // Send permission test request
    ipcRenderer.invoke('test-permissions').then(result => {
      console.log('📊 Permission test result:', result);
    }).catch(err => {
      console.log('❌ IPC permission test failed:', err);
    });
    
  } catch (error) {
    console.log('❌ Error with IPC:', error.message);
  }
  
} else {
  console.log('❌ No Electron API access available');
  console.log('ℹ️ Try opening DevTools in the main TimeFlow window');
}

// Alternative: Test active-win directly if available
try {
  if (typeof require !== 'undefined') {
    const activeWin = require('active-win');
    activeWin().then(result => {
      console.log('🖥️ Direct Active-Win Test:');
      console.log('App:', result?.owner?.name || 'Unknown');
      console.log('Title:', result?.title || 'Unknown');
    }).catch(err => {
      console.log('❌ Active-Win Error:', err.message);
    });
  }
} catch (err) {
  console.log('ℹ️ Active-Win not directly accessible from renderer');
} 