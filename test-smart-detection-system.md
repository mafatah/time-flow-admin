# 🧪 Smart Detection System Testing Guide

## 🎯 **STEP 1: Restart TimeFlow with New System**

Run the restart script:
```bash
./restart-timeflow-for-m_afatah.sh
```

## 🔍 **STEP 2: Test Multiple Instance Fix**

1. **Try to open TimeFlow again** while it's running:
   - Click TimeFlow.app in Applications
   - Should show notification: "TimeFlow Already Running"
   - Should NOT create duplicate icons in system tray
   - Should NOT appear multiple times in Activity Monitor

## 📸 **STEP 3: Test Random Screenshot System**

**Expected Behavior:**
- ✅ Screenshots taken randomly (2-6 minute intervals)
- ✅ About 3 screenshots per 10 minutes
- ✅ NOT every 10 seconds like before

**To Test:**
- Watch system tray for screenshot notifications
- Check admin dashboard for screenshot timing

## 🖥️ **STEP 4: Test App Detection**

**Do these activities:**
1. Open **Google Chrome** → Browse some websites
2. Open **VS Code** → Edit some files  
3. Open **Safari** → Browse different sites
4. Switch between apps frequently

**Expected Results:**
- ✅ Screenshots show REAL app names (not "Activity Monitor")
- ✅ App logs populate with actual usage
- ✅ Immediate detection when switching apps

## 🌐 **STEP 5: Test URL Detection**

**Do these activities:**
1. Browse **different websites** in Chrome/Safari
2. Open **multiple tabs**
3. Switch between tabs frequently

**Expected Results:**
- ✅ Screenshots show actual URLs
- ✅ URL logs populate with browse history
- ✅ Browser activity tracked immediately

## 📊 **STEP 6: Verify Database Updates**

**Check Admin Dashboard:**
- Screenshots should show real app names
- App Activity should show diverse applications
- URL Activity should show browsing history
- Data should update every 1 minute (batch uploads)

## 🎮 **STEP 7: Test System Tray Behavior**

**Test Tray Click:**
- Click system tray icon → Should toggle window visibility
- When window hidden → No dock icon
- When window shown → Dock icon appears

**Test Dock Behavior:**
- App should start without dock icon (background mode)
- Dock icon only appears when window is visible

## ⚡ **STEP 8: Verify Performance**

**What Should Happen:**
- ✅ Smooth app switching (no lag)
- ✅ Low CPU usage (efficient polling)
- ✅ No memory leaks
- ✅ Stable operation

## 🚨 **TROUBLESHOOTING**

### If App Detection Still Fails:
1. **System Settings** → **Privacy & Security** → **Accessibility**
2. Find **"TimeFlow"** → Toggle **OFF** then **ON**
3. Restart TimeFlow: `./restart-timeflow-for-m_afatah.sh`

### If URL Detection Fails:
1. **System Settings** → **Privacy & Security** → **Screen Recording**
2. Find **"TimeFlow"** → Toggle **OFF** then **ON**
3. Restart TimeFlow

### If Multiple Instances Still Appear:
1. Kill all processes: `pkill -f "TimeFlow"`
2. Wait 10 seconds
3. Open TimeFlow normally

## ✅ **SUCCESS CRITERIA**

After testing, you should see:
- 🎯 Real app names in screenshots (Chrome, Safari, VS Code, etc.)
- 🌐 Actual URLs being tracked
- 📸 Random screenshot timing (not constant intervals)
- 🚫 Only ONE TimeFlow instance ever running
- ⚡ Immediate app/URL detection when switching
- 📊 Data updates every minute in admin dashboard

## 📞 **Report Results**

Let me know:
1. Which tests pass ✅
2. Which tests fail ❌  
3. Any error messages or strange behavior

I'll fix any remaining issues immediately! 