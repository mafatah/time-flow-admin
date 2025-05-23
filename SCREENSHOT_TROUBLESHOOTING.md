# 📸 Screenshot Functionality Troubleshooting Guide

## 🔍 Current Status
- **Database Check Results**: 0 screenshots, 0 users, 0 tasks, 0 active tracking sessions
- **Screenshot Interval**: Set to 20 seconds for testing
- **Platform**: macOS (requires special permissions)

## ❌ Root Issues Identified

### 1. **No Active Time Tracking**
Screenshots are only captured when time tracking is active. Without an active session, no screenshots will be taken.

### 2. **Empty Database**
No users or tasks exist in the database, which means:
- No one can log in
- No tasks available for tracking
- No user ID to associate screenshots with

### 3. **Potential macOS Permissions**
macOS requires explicit Screen Recording permissions for Electron apps.

## ✅ Step-by-Step Solution

### Step 1: Set Up Database Data First
```bash
# Run the database check to confirm current state
node check-screenshots.js
```

**You need to create:**
1. **Users** in the database (admin account)
2. **Projects** for task organization  
3. **Tasks** to track time against

### Step 2: Grant macOS Permissions

1. **Open System Preferences**
2. **Security & Privacy** → **Privacy** tab
3. **Screen Recording** (left sidebar)
4. **Check the box** next to your Electron app
5. **Restart the application**

### Step 3: Test Screenshot Functionality

1. **Start the desktop app**
   ```bash
   npm start
   ```

2. **Navigate to Time Tracker** (separate menu item)

3. **Select a task** from dropdown

4. **Click "Start Tracking"** 
   - This is CRITICAL - screenshots only work during active tracking
   - You should see timer start counting

5. **Wait 20 seconds** for first screenshot
   - Check console logs for screenshot capture messages
   - Look for: "📸 Starting screenshot capture for user: ..."

6. **Check Screenshots menu** after 30-40 seconds

## 🔧 Enhanced Debugging

### Check Console Logs
The app now logs detailed screenshot activity:
- `📸 Starting screenshot capture`
- `🖥️ Display size`
- `📺 Available sources`
- `💾 Screenshot saved to temp path`
- `☁️ Uploading screenshot`
- `✅ Screenshot uploaded successfully`
- `❌ Screenshot upload failed`

### Mac Permission Issues
If you see: `❌ No screen sources available - check macOS Screen Recording permissions`
- Grant Screen Recording permission (Step 2 above)
- Restart the app completely

### Database Issues
Run the check script periodically:
```bash
node check-screenshots.js
```

## 📝 Complete Test Workflow

1. **Create Test Data**:
   - Sign up/login as admin
   - Create a project (e.g., "Test Project")
   - Create a task under that project (e.g., "Testing Screenshots")

2. **Start Time Tracking**:
   - Go to "Time Tracker" menu
   - Select the test task
   - Click "Start Tracking"
   - Verify timer is running

3. **Monitor Screenshot Capture**:
   - Watch console for capture logs every 20 seconds
   - Check "Screenshots" menu after 30-40 seconds
   - Verify images appear in database

4. **Verify Results**:
   ```bash
   node check-screenshots.js
   ```
   Should show screenshots and active tracking session

## ⚠️ Important Notes

- **Screenshots require active tracking** - they don't capture when idle
- **macOS permissions are mandatory** - app will fail silently without them
- **Database must have users/tasks** - empty database = no functionality
- **20-second interval is for testing** - change back to 10 minutes for production
- **Check browser console** in Electron dev tools for additional errors

## 🎯 Expected Results

After following all steps:
- Screenshots appear every 20 seconds in the Screenshots page
- Database check shows screenshots, active sessions, users, and tasks
- Console logs show successful capture and upload messages
- Time tracking timer runs continuously

## 🆘 If Still Not Working

1. **Check Electron dev console** (F12 in the app)
2. **Check macOS Console.app** for Electron errors
3. **Verify Supabase connection** in browser network tab
4. **Test screen capture manually** with other apps to confirm permissions
5. **Restart Mac** if permission changes don't take effect 