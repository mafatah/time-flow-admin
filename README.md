# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/16ca980c-c11a-40b9-9bec-cfa784f78c4d

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/16ca980c-c11a-40b9-9bec-cfa784f78c4d) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev

# Step 5: Build the web and Electron code, then launch the desktop app.
# `npm start` runs `npm run build:all` before starting Electron.
npm start
```

## Environment variables

This project uses Supabase. Add a `.env` file in the project root or set the following variables in your environment:

```bash
SUPABASE_URL=https://your-supabase-url
SUPABASE_PUBLISHABLE_KEY=your-supabase-key
```

These variables must be available in `process.env` when the app runs. If they are missing, the fallback values from `.env.example` are used.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Building the project

The TypeScript configuration is split between the web and Electron parts of the application.

- `tsconfig.app.json` is used when compiling the web code.
- `tsconfig.electron.json` is used for compiling the Electron process.

You can compile each part individually using the provided npm scripts:

```bash
npm run build:web
npm run build:electron
```

To build both parts in one step, use:

```bash
npm run build:all
```

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/16ca980c-c11a-40b9-9bec-cfa784f78c4d) and click on Share -> Publish.

## Working with Codex offline

The Codex environment installs dependencies during setup and then disables
network access. If you need additional packages, add them to
`.openai/setup.sh`. The script runs automatically before the network is
disabled and should install your dependencies using `npm ci`.

## Auto-start permissions

The application configures itself to start automatically when you log in.
On **Windows**, a registry entry under
`HKCU\Software\Microsoft\Windows\CurrentVersion\Run` is created.
On **Linux**, a `.desktop` file is written to `~/.config/autostart`.
Both operations require write access to these locations, so ensure the
application has the necessary permissions.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

# Ebdaa Work Time - Employee Time Tracking & Productivity Monitoring

<!-- Deployment trigger: Environment variables configured -->

# 🚀 DMG Issues Fixed - Complete Summary

## Issues Resolved ✅

### 1. **Login Not Saved (Session Persistence)**
- **Problem**: Users had to login every time they opened the app
- **Root Cause**: Desktop agent wasn't persisting user sessions
- **Fix**: Implemented proper session storage in desktop agent
  - Added `saveDesktopAgentSession()` function
  - Added `loadDesktopAgentSession()` function  
  - Added session validation with expiration checks
  - Sessions now persist in `desktop-agent-session.json`

### 2. **Health Check Popup Not Showing**
- **Problem**: System health check modal wasn't visible when starting timer
- **Root Cause**: Modal styling and visibility issues
- **Fix**: Enhanced health check modal system
  - Improved modal styling with proper z-index (999999)
  - Added backdrop blur and animations
  - Added real-time feature status updates
  - Added error display with fix suggestions
  - Added permission help dialog

### 3. **URL Detection Not Working**
- **Problem**: Browser URL tracking failed in DMG
- **Root Cause**: Missing entitlements and permission handling
- **Fix**: Enhanced URL detection system
  - Added browser-specific AppleScript commands
  - Enhanced error handling and fallbacks
  - Added proper permission dialogs
  - Updated entitlements with scripting targets

### 4. **App Detection Not Working**
- **Problem**: Active application detection failed
- **Root Cause**: Permission and entitlement issues
- **Fix**: Improved app detection system
  - Enhanced macOS app detection with multiple methods
  - Better error handling and timeouts
  - Proper permission checking and user guidance

### 5. **Missing Permission Prompts**
- **Problem**: No guidance for users to grant required permissions
- **Root Cause**: Insufficient permission handling in DMG
- **Fix**: Comprehensive permission system
  - User-friendly permission dialogs
  - Step-by-step permission setup guides
  - Automatic System Preferences opening
  - Clear error messages and recovery options

## Technical Changes Made 🔧

### Desktop Agent (`desktop-agent/src/main.js`)
```javascript
// Session persistence
- Added saveDesktopAgentSession()
- Added loadDesktopAgentSession()
- Added clearDesktopAgentSession()
- Fixed IPC handlers for session management

// Permission system
- Enhanced checkPlatformPermissions()
- Added showPermissionDialog()
- Added showPermissionGuide()
- Enhanced detectActiveApplication()
- Enhanced detectBrowserUrl()

// Health check IPC handlers
- test-app-detection
- test-url-detection
- test-screenshot-capture
- test-database-connection
- test-fraud-detection
```

### Renderer (`desktop-agent/renderer/renderer.js`)
```javascript
// Health check modal
- Enhanced showHealthCheckModal() with better styling
- Added updateHealthCheckFeatureStatus()
- Added showHealthCheckErrors()
- Added showPermissionFixDialog()
- Real-time status updates during tests
```

### Entitlements (`entitlements.mac.plist`)
```xml
<!-- Added comprehensive permissions -->
- Screen recording entitlements
- Browser scripting targets (Safari, Chrome, Edge, Firefox)
- AppleScript automation permissions
- File system access permissions
- Network permissions
```

## User Experience Improvements 🎯

### Before Fixes:
- ❌ Login required every time
- ❌ No health check feedback
- ❌ URL detection silent failure
- ❌ App detection not working
- ❌ No permission guidance

### After Fixes:
- ✅ Login persists with "Remember Me"
- ✅ Interactive health check with real-time status
- ✅ URL detection with proper error handling
- ✅ App detection with fallback methods
- ✅ Clear permission setup guidance
- ✅ System Preferences integration
- ✅ Error recovery options

## Testing Instructions 🧪

### 1. Login Persistence Test
1. Login with "Remember Me" checked
2. Quit the app completely
3. Restart the app
4. **Expected**: Should auto-login without prompting

### 2. Health Check Test
1. Click "Start Timer"
2. **Expected**: Health check modal appears immediately
3. Watch real-time feature testing
4. **Expected**: Clear pass/fail/warning status for each feature

### 3. Permission Test
1. If permissions missing, health check will show errors
2. Click "Fix Permissions" button
3. **Expected**: System Preferences opens automatically
4. Grant permissions and restart app

### 4. URL Detection Test
1. Open a browser (Safari, Chrome, Edge)
2. Navigate to any website
3. Start timer and check health check
4. **Expected**: URL detection shows ✅ with current URL

### 5. App Detection Test
1. Switch between different applications
2. Check health check or debug console
3. **Expected**: App detection shows ✅ with current app name

## Build Instructions 🔨

```bash
# Build updated desktop agent
cd desktop-agent
npm run build

# The fixes are now included in the built DMG
```

## Next Steps 📋

1. **Test the updated DMG** on a clean Mac
2. **Verify all features work** after granting permissions
3. **Check health check modal** appears when starting timer
4. **Confirm login persistence** works across app restarts
5. **Test URL and app detection** in various browsers/apps

The DMG now provides a much better user experience with proper session persistence, clear permission guidance, and comprehensive health checking! 🎉
