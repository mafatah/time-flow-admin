# TimeFlow Desktop App Icon

This directory should contain the application icon files for the Electron desktop app.

## Required Icon Files:
- `icon.png` (512x512) - Main app icon
- `icon.ico` (Windows format)
- `icon.icns` (macOS format)
- `icon.iconset/` (macOS icon set directory)

## Icon Design:
Use the TimeFlow logo design from `src/components/ui/timeflow-logo.tsx`:
- Clock face with hour markers
- Clock hands pointing to 10:10 (classic time)
- Flow arrow on the right
- Primary blue color scheme (#2563eb)
- Professional, clean design

## How to Generate Icons:

### Method 1: Using the SVG Component
1. Open the TimeFlow logo component in a browser
2. Use browser dev tools to export the SVG as PNG (512x512)
3. Use online converters to generate platform-specific formats

### Method 2: Using Design Tools
1. Export the logo design from the component
2. Create a 512x512 PNG version
3. Use tools like:
   - **Electron Icon Maker**: https://www.electronjs.org/docs/latest/tutorial/icons
   - **Icon Kitchen**: https://icon.kitchen/
   - **CloudConvert**: https://cloudconvert.com/

### Method 3: Command Line (macOS)
```bash
# Generate icns from png
iconutil -c icns icon.iconset/
```

### Method 4: Online Tools
- **Favicon Generator**: https://realfavicongenerator.net/
- **App Icon Generator**: https://appicon.co/

## Electron Builder Configuration:
The `package.json` build section should include:
```json
"build": {
  "appId": "com.timeflow.admin",
  "productName": "TimeFlow",
  "icon": "electron/assets/icon.png",
  "mac": {
    "icon": "electron/assets/icon.icns"
  },
  "win": {
    "icon": "electron/assets/icon.ico"
  },
  "linux": {
    "icon": "electron/assets/icon.png"
  }
}
```

## Icon Specifications:
- **Windows (.ico)**: 16x16, 32x32, 48x48, 256x256
- **macOS (.icns)**: 16x16, 32x32, 128x128, 256x256, 512x512
- **Linux (.png)**: 512x512

## Color Scheme:
- Primary: #2563eb (Blue 600)
- Secondary: #1d4ed8 (Blue 700)
- Accent: #ef4444 (Red 500) for second hand
- Background: #ffffff (White) 