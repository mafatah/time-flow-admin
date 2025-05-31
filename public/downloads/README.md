# TimeFlow Desktop App Downloads

This directory contains the downloadable desktop application files.

## How to Add Actual Desktop Apps:

### 1. Build the Desktop Applications
```bash
# First, ensure all dependencies are installed
npm install

# Build the web app and electron components
npm run build:all

# Build desktop applications (when Electron config is fixed)
npm run electron:build
```

### 2. Add Built Files to This Directory
Place the built application files here:
- `TimeFlow-Setup.exe` (Windows installer)
- `TimeFlow.dmg` (macOS disk image)
- `TimeFlow.AppImage` (Linux AppImage)

### 3. Current Status
The download component will automatically serve files from this directory.
Currently using placeholder URLs - replace with actual download URLs when files are ready.

### 4. File Naming Convention
- **Windows**: `TimeFlow-win-x64.exe` or `TimeFlow-Setup.exe`
- **macOS**: `TimeFlow-mac.dmg` or `TimeFlow-universal.dmg`
- **Linux**: `TimeFlow-linux-x64.AppImage` or `TimeFlow.AppImage`

### 5. Upload to CDN (Production)
For production, upload these files to:
- AWS S3 / CloudFront
- GitHub Releases
- Your own file server
- Or keep them in the public directory

### 6. Update Download URLs
Edit `src/components/ui/desktop-download.tsx` to point to the actual file URLs. 