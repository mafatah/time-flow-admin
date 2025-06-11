# Auto-Update Test Instructions

## Quick Test (Recommended)

1. Start mock update server:
   cd auto-update-test
   npx http-server . -p 3001 --cors

2. Modify electron/autoUpdater.ts temporarily:
   Add this after line 15:
   autoUpdater.setFeedURL({
     provider: "generic", 
     url: "http://localhost:3001"
   });

3. Rebuild and restart:
   npm run build:electron
   npm run start:desktop

4. Test update check:
   Right-click tray → "Check for Updates"
   Should find version 999.0.0!

## Files Created:
- auto-update-test/latest.json (mock update manifest)
- auto-update-test/instructions.md (this file)

## Current App Version: 0.0.0
## Mock Test Version: 999.0.0
