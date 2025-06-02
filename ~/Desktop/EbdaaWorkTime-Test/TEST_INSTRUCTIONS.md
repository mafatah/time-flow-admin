# Ebdaa Work Time - Local Testing Instructions

## Files Available for Testing:
- `EbdaaWorkTime-ARM.dmg` (Apple Silicon Macs - 114MB)
- `EbdaaWorkTime-Intel.dmg` (Intel Macs - 119MB) 
- `EbdaaWorkTime-Setup.exe` (Windows - 85MB)

## Test 1: DMG Crash Prevention
**Purpose**: Verify that the app prevents crashes when run from DMG

### Steps:
1. Double-click `EbdaaWorkTime-ARM.dmg` (or Intel version)
2. When DMG mounts, try to launch "Ebdaa Work Time.app" directly from the DMG
3. **Expected Result**: App should show warning dialog and close immediately
4. **Warning Dialog Should Say**:
   ```
   Installation Required - Ebdaa Work Time
   
   This application is running from the disk image (DMG) 
   and will crash if the DMG is ejected.
   
   To fix this:
   1. Drag "Ebdaa Work Time.app" to your Applications folder
   2. Eject the DMG
   3. Launch the app from Applications folder
   
   The app will now close to prevent crashes.
   ```

## Test 2: Proper Installation
**Purpose**: Verify normal installation and launch works

### Steps:
1. Open the DMG (if not already open)
2. Drag "Ebdaa Work Time.app" to the "Applications" folder shortcut
3. Eject the DMG: `hdiutil detach "/Volumes/Install Ebdaa Work Time"`
4. Launch from Applications: `open /Applications/Ebdaa\ Work\ Time.app`
5. **Expected Result**: App should launch normally without warnings

## Test 3: Check File Integrity
**Purpose**: Verify files are not corrupted

### Commands to run:
```bash
# Check DMG integrity
hdiutil verify EbdaaWorkTime-ARM.dmg
hdiutil verify EbdaaWorkTime-Intel.dmg

# Check file sizes match expectations
ls -lh *.dmg *.exe
```

## Test 4: Clean Up After Testing
```bash
# Remove test installation
rm -rf "/Applications/Ebdaa Work Time.app"

# Clean up test files (optional)
cd ~ && rm -rf ~/Desktop/EbdaaWorkTime-Test
```

## What to Look For:
✅ **Success Indicators**:
- Warning dialog appears when running from DMG
- App prevents startup from DMG location
- Normal launch works from Applications folder
- No crash reports generated

❌ **Failure Indicators**:
- App crashes with bus error when run from DMG
- No warning dialog appears
- App hangs or becomes unresponsive
- Console shows memory access violations

## Troubleshooting:
If you still see crashes:
1. Check Console.app for crash reports
2. Look for "KERN_MEMORY_ERROR" or "Bus error" messages
3. Verify the DMG crash prevention code is working

## Developer Notes:
- Crash prevention added in `electron/main.ts`
- DMG layout optimized for clear installation flow
- File sizes reduced by 90% from original 1.2GB
- All builds are unsigned for testing (prevents notarization issues) 