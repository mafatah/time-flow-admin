# TimeFlow Desktop Agent Guide

## 🚀 Quick Start

### 1. Starting the Desktop Agent
```bash
cd desktop-agent
npm start
```

### 2. Starting Time Tracking
The desktop agent has a UI window that opens when you start it. You have two options:

**Option A: Manual Start**
- Click the "Start Tracking" button in the UI window
- The status indicator will turn green when tracking is active

**Option B: Auto Start (Enabled)**
- The agent will automatically start tracking 5 seconds after launch
- This is now enabled in your config.json

### 3. Monitoring Screenshots
Once tracking starts, screenshots will be captured every 5 minutes (300 seconds) by default.

## 📸 Screenshot Functionality

### How It Works
1. **Screenshot Capture**: Every 5 minutes when tracking is active
2. **Activity Calculation**: Based on mouse clicks, keystrokes, and movements
3. **Focus Calculation**: Based on active vs idle time
4. **Upload**: Screenshots are uploaded to Supabase storage and metadata to database

### Checking if Screenshots are Working

#### Test Screenshot Functionality
```bash
cd desktop-agent
node test-screenshot.js
```

If this works, screenshots are functional. If not, you may have permission issues.

#### macOS Permission Requirements
On macOS, you need to grant Screen Recording permission:

1. Go to **System Preferences** > **Security & Privacy** > **Privacy**
2. Select **"Screen Recording"** from the left sidebar
3. Click the lock icon and enter your password
4. Add your terminal app (Terminal.app or iTerm) or the Electron app
5. Make sure the checkbox is enabled
6. Restart the desktop agent

### Viewing Screenshots in Admin Panel
1. Open the web admin panel: http://localhost:8083/
2. Login with admin credentials
3. Go to **Screenshots** page
4. You should see captured screenshots with activity metrics

## 🔧 Troubleshooting

### Issue: "Desktop app starts but no screenshots"

**Possible Causes:**
1. **Tracking not started** - Click "Start Tracking" button or enable auto-start
2. **Permission denied** - Grant Screen Recording permission on macOS
3. **Network issues** - Check if Supabase connection is working
4. **Time interval** - Screenshots are taken every 5 minutes, wait for the interval

**Solutions:**

#### 1. Check Tracking Status
- Look at the desktop agent UI window
- Status indicator should be green when tracking
- If red/gray, click "Start Tracking"

#### 2. Check Console Output
The desktop agent shows detailed logs:
```
✅ TimeFlow Agent ready
🚀 Starting time tracking...
📸 Starting screenshots every 300s
📸 Capturing screenshot...
✅ Screenshot captured and queued
```

#### 3. Check Permissions (macOS)
```bash
# Test if screenshot works
cd desktop-agent
node test-screenshot.js
```

#### 4. Check Database Connection
- Screenshots are stored in Supabase
- Check if the agent can connect to the database
- Look for connection errors in console

#### 5. Manual Screenshot Test
```bash
# Install screenshot-desktop globally for testing
npm install -g screenshot-desktop

# Test screenshot capture
screenshot-desktop test.png
```

### Issue: "Screenshots captured but not visible in admin panel"

**Possible Causes:**
1. **Database sync issues** - Screenshots queued but not uploaded
2. **Storage permissions** - Can't upload to Supabase storage
3. **User ID mismatch** - Screenshots saved under wrong user

**Solutions:**

#### 1. Check Queue Status
- Look at the desktop agent UI
- Check if screenshots are queued for upload
- Green status = online, Red = offline/queued

#### 2. Check User ID
In `desktop-agent/config.json`:
```json
{
  "user_id": "employee@timeflow.com"
}
```
Make sure this user exists in your database.

#### 3. Check Supabase Storage
- Go to Supabase dashboard
- Check the "screenshots" bucket
- Verify files are being uploaded

## ⚙️ Configuration

### Screenshot Settings
Edit `desktop-agent/config.json`:
```json
{
  "user_id": "employee@timeflow.com",
  "project_id": "proj-001",
  "auto_start_tracking": true
}
```

### Default Settings (can be changed via admin panel):
- **Screenshot Interval**: 300 seconds (5 minutes)
- **Idle Threshold**: 300 seconds (5 minutes)
- **Blur Screenshots**: false
- **Track URLs**: true
- **Track Applications**: true
- **Auto Start**: true (now enabled)

## 📊 Monitoring

### Desktop Agent UI
The desktop agent shows:
- **Status**: Active/Paused/Stopped
- **Activity %**: Based on mouse/keyboard activity
- **Focus %**: Based on active vs idle time
- **Statistics**: Mouse clicks, keystrokes, movements

### Admin Panel
View captured data at:
- **Screenshots**: http://localhost:8083/screenshots
- **Apps & URLs**: http://localhost:8083/reports/apps-urls-idle
- **Insights**: http://localhost:8083/insights

## 🔄 Restart Process

If you make changes or encounter issues:

1. **Stop the desktop agent** (Ctrl+C or close window)
2. **Restart it**:
   ```bash
   cd desktop-agent
   npm start
   ```
3. **Wait 5 seconds** for auto-start (if enabled)
4. **Check the UI** for green status indicator
5. **Wait 5-10 minutes** for first screenshot

## 📝 Logs and Debugging

### Console Logs
The desktop agent provides detailed logging:
- ✅ Success messages (green checkmarks)
- ⚠️ Warning messages (yellow warnings)
- ❌ Error messages (red X marks)
- 📸 Screenshot events
- 🔔 Notifications
- 📦 Queue status

### Common Log Messages
```
✅ TimeFlow Agent ready
🚀 Starting time tracking...
📸 Starting screenshots every 300s
📸 Capturing screenshot...
✅ Screenshot captured and queued
🔔 Notification: Screenshot captured
```

### Error Messages to Watch For
```
❌ Screenshot failed: [permission error]
❌ Failed to upload screenshot: [network error]
❌ Failed to create time log: [database error]
```

## 🎯 Expected Behavior

When everything is working correctly:

1. **Desktop agent starts** and shows UI window
2. **Tracking starts automatically** (green status)
3. **First screenshot** captured after 10 seconds
4. **Regular screenshots** every 5 minutes
5. **Activity metrics** updated in real-time
6. **Screenshots visible** in admin panel within minutes
7. **Notifications** shown for important events

## 🆘 Still Having Issues?

If screenshots still aren't working:

1. **Check the test screenshot** works: `node test-screenshot.js`
2. **Verify permissions** are granted on macOS
3. **Check network connectivity** to Supabase
4. **Restart the desktop agent** completely
5. **Wait 10+ minutes** for screenshots to appear
6. **Check admin panel** screenshots page for recent captures

The desktop agent is designed to work reliably in the background and should start capturing screenshots immediately when tracking begins. 