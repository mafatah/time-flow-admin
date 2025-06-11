"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startActivityMonitoring = startActivityMonitoring;
exports.stopActivityMonitoring = stopActivityMonitoring;
exports.fetchSettings = fetchSettings;
exports.triggerActivityCapture = triggerActivityCapture;
exports.triggerDirectScreenshot = triggerDirectScreenshot;
exports.getActivityMetrics = getActivityMetrics;
exports.recordRealActivity = recordRealActivity;
exports.resetActivityMetrics = resetActivityMetrics;
exports.triggerActivityRefresh = triggerActivityRefresh;
exports.setupAppEventHandlers = setupAppEventHandlers;
exports.getCurrentActivityMetrics = getCurrentActivityMetrics;
exports.testActivity = testActivity;
exports.demonstrateEnhancedLogging = demonstrateEnhancedLogging;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const supabase_1 = require("./supabase.cjs");
const unsyncedManager_1 = require("./unsyncedManager.cjs");
const errorHandler_1 = require("./errorHandler.cjs");
const config_1 = require("./config.cjs");
// Import app events for communication with main process
let appEvents = null;
// Note: Don't use require('./main') here as it causes circular dependency issues
const UNSYNCED_ACTIVITY_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'unsynced_activity.json');
// Special UUID for activity monitoring - this represents a virtual "task" for general activity monitoring
const ACTIVITY_MONITORING_TASK_ID = '00000000-0000-0000-0000-000000000001';
// === SETTINGS ===
let appSettings = {
    blur_screenshots: false,
    screenshot_interval_seconds: 60,
    idle_threshold_seconds: 300 // 5 minutes default
};
// === ACTIVITY METRICS ===
let activityMetrics = {
    mouse_clicks: 0,
    keystrokes: 0,
    mouse_movements: 0,
    last_activity_time: Date.now(),
    activity_score: 0
};
let lastActivityTime = Date.now();
// === INTERVALS ===
let activityInterval;
let appTrackingInterval;
let activityMetricsInterval;
let notificationInterval;
let activityResetInterval; // Add reset interval
// === TRACKING STATE ===
let isMonitoring = false;
let currentUserId = null;
let currentActivitySession = null;
let currentApp = null;
let consecutiveScreenshotFailures = 0;
let lastSuccessfulScreenshot = 0;
let systemUnavailableStart = null;
const MAX_SCREENSHOT_FAILURES = 3; // Stop after 3 consecutive failures
const MAX_SYSTEM_UNAVAILABLE_TIME = 2 * 60 * 1000; // 2 minutes
const SCREENSHOT_TIMEOUT_MS = 10000; // 10 seconds timeout for screenshot capture
// Always-on activity monitoring - starts when app launches
async function startActivityMonitoring(userId) {
    if (isMonitoring) {
        console.log('🔄 Activity monitoring already running');
        return;
    }
    console.log('🚀 Starting always-on activity monitoring for user:', userId);
    currentUserId = userId;
    isMonitoring = true;
    lastActivityTime = Date.now();
    // Reset activity metrics
    activityMetrics = {
        mouse_clicks: 0,
        keystrokes: 0,
        mouse_movements: 0,
        last_activity_time: Date.now(),
        activity_score: 0
    };
    // Fetch settings from server first
    await fetchSettings();
    // Create new activity session
    currentActivitySession = {
        id: (0, crypto_1.randomUUID)(),
        user_id: userId,
        start_time: new Date().toISOString(),
        is_active: true,
        total_screenshots: 0,
        total_apps: 0,
        total_mouse_clicks: 0,
        total_keystrokes: 0,
        total_mouse_movements: 0
    };
    // Save session to database
    saveActivitySession();
    // Start random screenshot capture (2 per 10-minute period)
    startRandomScreenshotCapture();
    // Start app activity tracking every 5 seconds - DON'T reset activity timer!
    appTrackingInterval = setInterval(async () => {
        if (currentUserId && isUserActive()) {
            await trackCurrentApp();
        }
    }, 5000);
    // Start activity metrics tracking every 1 second
    activityMetricsInterval = setInterval(async () => {
        await trackActivityMetrics();
    }, 1000);
    // Start notification checking every 60 seconds
    notificationInterval = setInterval(async () => {
        await checkNotifications();
    }, 60000);
    // Start activity metrics reset every 10 minutes to show incremental changes
    activityResetInterval = setInterval(() => {
        resetActivityMetrics();
    }, 10 * 60 * 1000); // 10 minutes
    console.log(`✅ Activity monitoring started - Random screenshots (2 per 10 min), App tracking every 5s, Activity metrics every 1s, Reset every 10min`);
}
function stopActivityMonitoring() {
    if (!isMonitoring)
        return;
    console.log('🛑 Stopping activity monitoring');
    isMonitoring = false;
    if (activityInterval) {
        clearTimeout(activityInterval);
        activityInterval = undefined;
    }
    if (appTrackingInterval) {
        clearInterval(appTrackingInterval);
        appTrackingInterval = undefined;
    }
    if (activityMetricsInterval) {
        clearInterval(activityMetricsInterval);
        activityMetricsInterval = undefined;
    }
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = undefined;
    }
    if (activityResetInterval) {
        clearInterval(activityResetInterval);
        activityResetInterval = undefined;
    }
    // End current activity session
    if (currentActivitySession) {
        currentActivitySession.end_time = new Date().toISOString();
        currentActivitySession.is_active = false;
        currentActivitySession.total_mouse_clicks = activityMetrics.mouse_clicks;
        currentActivitySession.total_keystrokes = activityMetrics.keystrokes;
        currentActivitySession.total_mouse_movements = activityMetrics.mouse_movements;
        saveActivitySession();
    }
    // End current app activity with safety checks
    if (currentApp) {
        try {
            currentApp.end_time = new Date().toISOString();
            currentApp.duration_seconds = Math.floor((Date.now() - new Date(currentApp.start_time).getTime()) / 1000);
            currentApp.mouse_clicks = activityMetrics.mouse_clicks;
            currentApp.keystrokes = activityMetrics.keystrokes;
            currentApp.mouse_movements = activityMetrics.mouse_movements;
            saveAppActivity();
        }
        catch (error) {
            console.error('❌ Error saving final app activity during stop:', error);
            // Don't throw error, just log it
        }
    }
    currentActivitySession = null;
    currentApp = null;
    currentUserId = null;
}
function isUserActive() {
    const idleTimeMs = appSettings.idle_threshold_seconds * 1000;
    const timeSinceLastActivity = Date.now() - activityMetrics.last_activity_time;
    // Only stop monitoring if we have consecutive technical failures, not just lack of screenshots
    if (consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES) {
        console.log(`❌ Too many consecutive screenshot failures (${consecutiveScreenshotFailures}), stopping monitoring due to technical issues`);
        return false;
    }
    // Check actual user activity (mouse/keyboard), not screenshot success
    return timeSinceLastActivity < idleTimeMs;
}
function updateLastActivity() {
    lastActivityTime = Date.now();
    activityMetrics.last_activity_time = Date.now();
}
// Track real activity metrics instead of simulating
async function trackActivityMetrics() {
    if (!currentUserId || !isMonitoring)
        return;
    try {
        const now = Date.now();
        const timeSinceLastActivity = now - activityMetrics.last_activity_time;
        const idleThresholdMs = appSettings.idle_threshold_seconds * 1000;
        const isCurrentlyIdle = timeSinceLastActivity > idleThresholdMs;
        // === ACTIVITY_DECAY_SYSTEM ===
        // Gradually decrease activity score over time when idle
        if (isCurrentlyIdle) {
            const secondsIdle = Math.floor(timeSinceLastActivity / 1000);
            // Progressive decay: faster decay as idle time increases
            let decayRate = 1; // Base decay per second
            if (secondsIdle > 60)
                decayRate = 2; // Faster after 1 minute
            if (secondsIdle > 300)
                decayRate = 5; // Much faster after 5 minutes
            const oldScore = activityMetrics.activity_score;
            activityMetrics.activity_score = Math.max(0, activityMetrics.activity_score - decayRate);
            if (oldScore !== activityMetrics.activity_score) {
                console.log('💤 ACTIVITY DECAY:', {
                    idle_duration_seconds: secondsIdle,
                    decay_rate: decayRate,
                    activity_score_before: oldScore,
                    activity_score_after: activityMetrics.activity_score,
                    user_status: 'IDLE_DECAY'
                });
            }
        }
        // === DETAILED IDLE DETECTION LOGGING ===
        // Commented out to reduce log noise during debugging
        /*
        console.log('🕰️ ACTIVITY METRICS:', {
          timestamp: new Date().toISOString(),
          timeSinceLastActivity_ms: timeSinceLastActivity,
          timeSinceLastActivity_seconds: Math.round(timeSinceLastActivity / 1000),
          idleThreshold_seconds: appSettings.idle_threshold_seconds,
          isCurrentlyIdle: isCurrentlyIdle,
          currentActivity: {
            mouse_clicks: activityMetrics.mouse_clicks,
            keystrokes: activityMetrics.keystrokes,
            mouse_movements: activityMetrics.mouse_movements,
            current_activity_score: activityMetrics.activity_score
          },
          detection_method: 'REAL_INPUT_WITH_DECAY'
        });
        */
        // Update current session metrics
        if (currentActivitySession) {
            currentActivitySession.total_mouse_clicks = activityMetrics.mouse_clicks;
            currentActivitySession.total_keystrokes = activityMetrics.keystrokes;
            currentActivitySession.total_mouse_movements = activityMetrics.mouse_movements;
        }
        // Update current app metrics
        if (currentApp) {
            currentApp.mouse_clicks = activityMetrics.mouse_clicks;
            currentApp.keystrokes = activityMetrics.keystrokes;
            currentApp.mouse_movements = activityMetrics.mouse_movements;
        }
    }
    catch (error) {
        console.error('❌ Activity metrics tracking failed:', error);
        (0, errorHandler_1.logError)('trackActivityMetrics', error);
    }
}
// Add settings fetch function
async function fetchSettings() {
    try {
        // Try to load from config file first
        const configPath = path_1.default.join(process.cwd(), 'desktop-agent', 'config.json');
        if (fs_1.default.existsSync(configPath)) {
            const configContent = fs_1.default.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configContent);
            appSettings = {
                blur_screenshots: config.blur_screenshots || false,
                screenshot_interval_seconds: config.screenshot_interval_seconds || 60,
                idle_threshold_seconds: config.idle_threshold_seconds || 300
            };
            console.log('✅ Settings loaded from config:', appSettings);
            return;
        }
        // Fallback to database settings if config file doesn't exist
        const { data, error } = await supabase_1.supabase
            .from('settings')
            .select('*')
            .single();
        if (error) {
            console.log('⚠️ Could not fetch settings, using defaults:', error);
            return;
        }
        if (data) {
            appSettings = {
                blur_screenshots: data.blur_screenshots || false,
                screenshot_interval_seconds: data.screenshot_interval_seconds || 60,
                idle_threshold_seconds: data.idle_threshold_seconds || 300
            };
            console.log('✅ Settings loaded from database:', appSettings);
        }
    }
    catch (error) {
        console.error('❌ Settings fetch error:', error);
        (0, errorHandler_1.logError)('fetchSettings', error);
    }
}
// Add blur function using Canvas API
async function blurImage(buffer) {
    try {
        // For now, we'll use a simple approach - in production you'd want to use sharp or canvas
        // This is a placeholder that returns the original buffer
        // In a real implementation, you'd blur the image here
        console.log('🔄 Blurring screenshot...');
        // TODO: Implement actual image blurring using sharp or canvas
        // For now, just return original buffer
        return buffer;
    }
    catch (error) {
        console.error('❌ Image blur failed:', error);
        return buffer; // Return original if blur fails
    }
}
async function captureActivityScreenshot() {
    if (!currentUserId || !currentActivitySession)
        return;
    try {
        console.log('📸 Capturing activity screenshot...');
        console.log('🔍 Screenshot attempt details:', {
            userId: currentUserId,
            sessionId: currentActivitySession.id,
            timestamp: new Date().toISOString()
        });
        // Reduce timeout to 5 seconds and add more detailed error handling
        const screenshotPromise = new Promise(async (resolve, reject) => {
            try {
                console.log('🖥️ Getting primary display...');
                const primaryDisplay = electron_1.screen.getPrimaryDisplay();
                const { width, height } = primaryDisplay.workAreaSize;
                console.log(`📐 Display dimensions: ${width}x${height}`);
                console.log('🔍 Getting desktop sources...');
                const sources = await electron_1.desktopCapturer.getSources({
                    types: ['screen'],
                    thumbnailSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) }
                });
                console.log(`📺 Found ${sources.length} screen sources`);
                if (sources.length === 0) {
                    throw new Error('No screen sources available - check macOS Screen Recording permissions');
                }
                console.log('🖼️ Converting thumbnail to PNG buffer...');
                let buffer = sources[0].thumbnail.toPNG();
                console.log(`📊 Screenshot buffer size: ${buffer.length} bytes`);
                // Apply blur if enabled in settings
                if (appSettings.blur_screenshots) {
                    console.log('🔄 Applying blur to screenshot...');
                    buffer = await blurImage(buffer);
                }
                const filename = `activity_${Date.now()}_${(0, crypto_1.randomUUID)().slice(0, 8)}.png`;
                const tempPath = path_1.default.join(electron_1.app.getPath('temp'), filename);
                console.log(`💾 Saving screenshot to: ${tempPath}`);
                fs_1.default.writeFileSync(tempPath, buffer);
                console.log('✅ Screenshot file saved successfully');
                resolve({ tempPath, filename });
            }
            catch (error) {
                console.error('❌ Screenshot capture error:', error);
                reject(error);
            }
        });
        // Reduce timeout to 5 seconds for faster feedback
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Screenshot capture timeout (5s)')), 5000);
        });
        console.log('⏱️ Starting screenshot capture with 5s timeout...');
        const { tempPath, filename } = await Promise.race([screenshotPromise, timeoutPromise]);
        console.log('☁️ Starting upload to Supabase...');
        // Upload to Supabase with activity metrics
        await uploadActivityScreenshot(tempPath, filename);
        // Update session stats
        currentActivitySession.total_screenshots++;
        saveActivitySession();
        // Reset failure count on success
        consecutiveScreenshotFailures = 0;
        lastSuccessfulScreenshot = Date.now();
        // Reset system unavailable tracking
        if (systemUnavailableStart) {
            console.log('✅ System available again after being unavailable');
            systemUnavailableStart = null;
        }
        // Skip event emission to avoid circular dependency issues with main.ts
        console.log('📸 Screenshot capture and upload completed successfully!');
        console.log(`📊 Total screenshots this session: ${currentActivitySession?.total_screenshots || 0}`);
        // Calculate next screenshot time for user information
        const nextScreenshotSeconds = config_1.screenshotIntervalSeconds;
        const nextMinutes = Math.floor(nextScreenshotSeconds / 60);
        const nextSecondsRemainder = nextScreenshotSeconds % 60;
        console.log(`📸 Next screenshot in ${nextMinutes} minutes ${nextSecondsRemainder} seconds`);
    }
    catch (error) {
        consecutiveScreenshotFailures++;
        console.error(`💥 Screenshot failed (attempt ${consecutiveScreenshotFailures}/${MAX_SCREENSHOT_FAILURES}):`);
        console.error('📋 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
        (0, errorHandler_1.logError)('captureActivityScreenshot', error);
        // Track when system became unavailable
        if (!systemUnavailableStart) {
            systemUnavailableStart = Date.now();
            console.log('⚠️ System appears to be unavailable, starting timer');
        }
        // Check if we should stop tracking due to consecutive failures or timeout
        const shouldStopTracking = consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES ||
            (systemUnavailableStart && (Date.now() - systemUnavailableStart) > MAX_SYSTEM_UNAVAILABLE_TIME);
        if (shouldStopTracking) {
            console.log('🛑 Stopping tracking due to system unavailability or screenshot failures');
            console.log(`📊 Failure stats: ${consecutiveScreenshotFailures} failures, ${systemUnavailableStart ? Date.now() - systemUnavailableStart : 0}ms unavailable`);
            // Stop all monitoring
            stopActivityMonitoring();
            // Notify main process to stop timer tracking
            try {
                if (!appEvents) {
                    appEvents = require('./main').appEvents;
                }
                if (appEvents) {
                    appEvents.emit('auto-stop-tracking', {
                        reason: consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES ? 'screenshot_failures' : 'system_unavailable',
                        failures: consecutiveScreenshotFailures,
                        unavailableTime: systemUnavailableStart ? Date.now() - systemUnavailableStart : 0
                    });
                }
            }
            catch (e) {
                console.log('⚠️ Could not notify main process:', e);
            }
            // Show notification if possible
            try {
                new electron_1.Notification({
                    title: 'TimeFlow - Tracking Stopped',
                    body: consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES
                        ? 'Tracking stopped due to screenshot capture issues (laptop closed?)'
                        : 'Tracking stopped due to system inactivity'
                }).show();
            }
            catch (e) {
                // Silent fail for notifications
            }
        }
    }
}
async function uploadActivityScreenshot(filePath, filename) {
    if (!currentUserId) {
        console.log('⚠️ No user ID available, queuing screenshot for later upload');
        (0, unsyncedManager_1.queueScreenshot)({
            user_id: 'unknown',
            project_id: '00000000-0000-0000-0000-000000000001',
            image_url: `local://${filePath}`,
            captured_at: new Date().toISOString()
        });
        return;
    }
    // Use a default task ID that should exist in the system
    // This will be replaced with real task ID when proper time tracking is active
    const taskId = ACTIVITY_MONITORING_TASK_ID;
    console.log(`☁️ Starting upload process...`);
    console.log(`📋 Upload details:`, {
        userId: currentUserId,
        taskId: taskId,
        filename: filename,
        filePath: filePath
    });
    try {
        console.log('📂 Reading file buffer...');
        const fileBuffer = fs_1.default.readFileSync(filePath);
        console.log(`📊 File buffer size: ${fileBuffer.length} bytes`);
        console.log('☁️ Uploading to Supabase Storage...');
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase_1.supabase.storage
            .from('screenshots')
            .upload(`${currentUserId}/${filename}`, fileBuffer, {
            contentType: 'image/png',
            upsert: true
        });
        if (uploadError) {
            console.error('❌ Supabase Storage upload failed:', {
                error: uploadError.message,
                code: uploadError.name,
                details: uploadError
            });
            (0, unsyncedManager_1.queueScreenshot)({
                user_id: currentUserId,
                project_id: '00000000-0000-0000-0000-000000000001',
                image_url: `local://${filePath}`,
                captured_at: new Date().toISOString()
            });
            throw new Error(`Storage upload failed: ${uploadError.message}`);
        }
        console.log('✅ Storage upload successful, getting public URL...');
        // Get public URL
        const { data: { publicUrl } } = supabase_1.supabase.storage
            .from('screenshots')
            .getPublicUrl(`${currentUserId}/${filename}`);
        console.log(`🔗 Public URL generated: ${publicUrl}`);
        console.log('💾 Saving to database...');
        // Save to database with activity metrics - handle idle states properly
        const timeSinceLastActivity = Date.now() - activityMetrics.last_activity_time;
        const isCurrentlyIdle = timeSinceLastActivity > (appSettings.idle_threshold_seconds * 1000);
        // If user is idle, activity should be 0
        const activityPercent = isCurrentlyIdle ? 0 : Math.round(activityMetrics.activity_score);
        const focusPercent = isCurrentlyIdle ? 0 : Math.round(activityMetrics.activity_score * 0.8);
        // === DETAILED ACTIVITY PERCENTAGE LOGGING ===
        // Commented out to reduce log noise during debugging
        /*
        console.log('📊 ACTIVITY PERCENTAGE CALCULATION:', {
          timestamp: new Date().toISOString(),
          idle_detection: {
            timeSinceLastActivity_ms: timeSinceLastActivity,
            timeSinceLastActivity_seconds: Math.round(timeSinceLastActivity / 1000),
            idle_threshold_seconds: appSettings.idle_threshold_seconds,
            isCurrentlyIdle: isCurrentlyIdle
          },
          raw_metrics: {
            mouse_clicks: activityMetrics.mouse_clicks,
            keystrokes: activityMetrics.keystrokes,
            mouse_movements: activityMetrics.mouse_movements,
            activity_score: activityMetrics.activity_score
          },
          calculations: {
            activity_percent_formula: isCurrentlyIdle ? 'IDLE = 0%' : `Math.round(${activityMetrics.activity_score})`,
            activity_percent_result: activityPercent,
            focus_percent_formula: isCurrentlyIdle ? 'IDLE = 0%' : `Math.round(${activityMetrics.activity_score} * 0.8)`,
            focus_percent_result: focusPercent,
            focus_estimation_note: 'Focus is estimated as 80% of activity score'
          },
          screenshot_classification: {
            activity_level: activityPercent > 70 ? 'HIGH' : activityPercent > 30 ? 'MEDIUM' : activityPercent > 0 ? 'LOW' : 'IDLE',
            focus_level: focusPercent > 70 ? 'HIGH' : focusPercent > 30 ? 'MEDIUM' : focusPercent > 0 ? 'LOW' : 'IDLE',
            is_productive: focusPercent > 50,
            detection_status: isCurrentlyIdle ? 'USER_IS_IDLE' : 'USER_IS_ACTIVE'
          }
        });
        */
        const dbPayload = {
            user_id: currentUserId,
            project_id: '00000000-0000-0000-0000-000000000001',
            image_url: publicUrl,
            captured_at: new Date().toISOString(),
            activity_percent: activityPercent,
            focus_percent: focusPercent,
            mouse_clicks: activityMetrics.mouse_clicks,
            keystrokes: activityMetrics.keystrokes,
            mouse_movements: activityMetrics.mouse_movements
        };
        console.log('📊 Database payload:', dbPayload);
        const { error: dbError } = await supabase_1.supabase
            .from('screenshots')
            .insert(dbPayload);
        if (dbError) {
            console.error('❌ Database save failed:', {
                error: dbError.message,
                code: dbError.code,
                details: dbError
            });
            (0, unsyncedManager_1.queueScreenshot)({
                user_id: currentUserId,
                project_id: '00000000-0000-0000-0000-000000000001',
                image_url: publicUrl,
                captured_at: new Date().toISOString()
            });
            throw new Error(`Database save failed: ${dbError.message}`);
        }
        console.log('🎉 Screenshot uploaded and saved to database successfully!');
        // Clean up temp file
        try {
            fs_1.default.unlinkSync(filePath);
            console.log('🗑️ Temporary file cleaned up');
        }
        catch (cleanupError) {
            console.log('⚠️ Could not clean up temp file:', cleanupError.message);
        }
        // Emit event to trigger notification in main process
        try {
            if (!appEvents) {
                // Try to get app events again in case it wasn't available during initialization
                appEvents = require('./main').appEvents;
            }
            if (appEvents) {
                appEvents.emit('screenshot-captured');
            }
        }
        catch (e) {
            console.log('⚠️ Could not emit screenshot-captured event:', e.message);
        }
    }
    catch (error) {
        console.error('💥 Upload process failed:', error);
        throw error; // Re-throw to be handled by calling function
    }
}
async function getCurrentAppName() {
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        try {
            if (process.platform === 'win32') {
                // Windows implementation using PowerShell
                const { stdout } = await execAsync(`powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 ProcessName | ForEach-Object {$_.ProcessName}"`);
                const appName = stdout.trim();
                return appName || 'System Application';
            }
            else if (process.platform === 'darwin') {
                // macOS implementation using AppleScript - improved version
                const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true' 2>/dev/null || echo "System Application"`);
                const appName = stdout.trim();
                return appName || 'System Application';
            }
            else if (process.platform === 'linux') {
                // Linux implementation using xdotool or wmctrl
                try {
                    const { stdout } = await execAsync(`xdotool getactivewindow getwindowname 2>/dev/null || wmctrl -a $(wmctrl -l | head -1 | cut -d' ' -f1) 2>/dev/null || echo "System Application"`);
                    const appName = stdout.trim();
                    return appName || 'System Application';
                }
                catch {
                    return 'System Application';
                }
            }
            else {
                return 'System Application';
            }
        }
        catch (error) {
            // Only log occasionally to reduce spam
            if (Math.random() < 0.01) { // Log only 1% of the time
                console.log('⚠️ App detection failed occasionally, using System Application');
            }
            return 'System Application';
        }
    }
    catch (error) {
        return 'System Application';
    }
}
async function getCurrentWindowTitle() {
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        try {
            if (process.platform === 'win32') {
                // Windows implementation using PowerShell
                const { stdout } = await execAsync(`powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 MainWindowTitle | ForEach-Object {$_.MainWindowTitle}"`);
                const windowTitle = stdout.trim();
                return windowTitle || 'Unknown Window';
            }
            else if (process.platform === 'darwin') {
                // macOS implementation using corrected AppleScript
                const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get title of front window of (first application process whose frontmost is true)'`);
                const windowTitle = stdout.trim();
                return windowTitle || 'Unknown Window';
            }
            else if (process.platform === 'linux') {
                // Linux implementation
                try {
                    const { stdout } = await execAsync(`xdotool getactivewindow getwindowname 2>/dev/null || echo "Unknown Window"`);
                    const windowTitle = stdout.trim();
                    return windowTitle || 'Unknown Window';
                }
                catch {
                    return 'Unknown Window';
                }
            }
            else {
                return 'Unknown Window';
            }
        }
        catch (error) {
            // Fallback to app name if window title not available
            const appName = await getCurrentAppName();
            return `${appName} Window`;
        }
    }
    catch (error) {
        console.error('❌ Window title detection failed:', error);
        return 'Unknown Window';
    }
}
async function getCurrentURL() {
    try {
        // Only try to get URLs from actual browser applications
        const appName = await getCurrentAppName();
        // Check if it's actually a browser
        const browsers = ['Google Chrome', 'Safari', 'Firefox', 'Microsoft Edge', 'Arc', 'chrome', 'firefox', 'msedge'];
        const isBrowser = browsers.some(browser => appName.toLowerCase().includes(browser.toLowerCase()));
        if (!isBrowser) {
            return undefined;
        }
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        try {
            let script = '';
            if (process.platform === 'win32') {
                // Windows implementation - try to get URL from different browsers
                if (appName.toLowerCase().includes('chrome')) {
                    // For Chrome on Windows - this is a simplified approach
                    // In production, you'd need more sophisticated methods
                    return undefined; // Placeholder - Windows URL detection is complex
                }
                else if (appName.toLowerCase().includes('edge')) {
                    return undefined; // Placeholder
                }
                return undefined;
            }
            else if (process.platform === 'darwin') {
                // macOS implementation
                if (appName.includes('Chrome') || appName.includes('Arc')) {
                    script = `osascript -e 'tell application "Google Chrome" to get URL of active tab of front window'`;
                }
                else if (appName.includes('Safari')) {
                    script = `osascript -e 'tell application "Safari" to get URL of front document'`;
                }
                else if (appName.includes('Firefox')) {
                    // Firefox doesn't support AppleScript for URL access
                    return undefined;
                }
                else {
                    return undefined;
                }
                const { stdout } = await execAsync(script);
                const url = stdout.trim();
                // Only return valid URLs
                if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                    return url;
                }
            }
            return undefined;
        }
        catch (error) {
            // Don't log URL detection errors as they're common when browser isn't open
            return undefined;
        }
    }
    catch (error) {
        return undefined;
    }
}
async function trackCurrentApp() {
    if (!currentUserId || !currentActivitySession)
        return;
    try {
        // Get current active application with timeout and error handling
        const appName = await getCurrentAppName();
        const windowTitle = await getCurrentWindowTitle();
        const currentURL = await getCurrentURL();
        // Validate that we got valid data
        if (!appName || appName === 'Unknown Application') {
            console.log('⚠️ Could not detect valid app name, skipping app tracking');
            return;
        }
        if (currentApp &&
            currentApp.app_name === appName &&
            currentApp.window_title === windowTitle &&
            currentApp.url === currentURL) {
            // Still in same app/window/URL, continue tracking
            return;
        }
        // End previous app activity with safety checks
        if (currentApp) {
            try {
                currentApp.end_time = new Date().toISOString();
                currentApp.duration_seconds = Math.floor((Date.now() - new Date(currentApp.start_time).getTime()) / 1000);
                currentApp.mouse_clicks = activityMetrics.mouse_clicks;
                currentApp.keystrokes = activityMetrics.keystrokes;
                currentApp.mouse_movements = activityMetrics.mouse_movements;
                await saveAppActivity();
                // Save URL log if we have a URL
                if (currentApp.url) {
                    await saveURLActivity(currentApp);
                }
            }
            catch (error) {
                console.error('❌ Error saving previous app activity:', error);
                // Continue with new app tracking even if saving previous failed
            }
        }
        // Start new app activity with validation
        try {
            currentApp = {
                app_name: appName,
                window_title: windowTitle || 'Unknown Window',
                start_time: new Date().toISOString(),
                duration_seconds: 0,
                url: currentURL,
                mouse_clicks: 0,
                keystrokes: 0,
                mouse_movements: 0
            };
            // Validate the new currentApp object
            if (!currentApp.app_name) {
                console.error('❌ Failed to create valid currentApp object');
                currentApp = null;
                return;
            }
            currentActivitySession.total_apps++;
            saveActivitySession();
            console.log('📱 App activity:', appName, '-', windowTitle, currentURL ? `(${currentURL})` : '');
        }
        catch (error) {
            console.error('❌ Error creating new app activity:', error);
            currentApp = null;
        }
    }
    catch (error) {
        console.error('❌ App tracking failed:', error);
        (0, errorHandler_1.logError)('trackCurrentApp', error);
        // Reset currentApp if tracking fails completely
        currentApp = null;
    }
}
async function saveAppActivity() {
    // Add comprehensive null checks to prevent the error
    if (!currentApp) {
        console.log('⚠️ No current app to save - skipping saveAppActivity');
        return;
    }
    if (!currentUserId) {
        console.log('⚠️ No current user ID - skipping saveAppActivity');
        return;
    }
    if (!currentActivitySession) {
        console.log('⚠️ No current activity session - skipping saveAppActivity');
        return;
    }
    // Additional validation to ensure currentApp has required properties
    if (!currentApp.app_name) {
        console.log('⚠️ Current app missing app_name - skipping saveAppActivity');
        return;
    }
    try {
        // Use minimal app_logs schema - only basic columns that definitely exist
        const appLogData = {
            user_id: currentUserId,
            project_id: '00000000-0000-0000-0000-000000000001', // Use default project UUID
            app_name: currentApp.app_name,
            window_title: currentApp.window_title || 'Unknown Window'
        };
        const { error } = await supabase_1.supabase
            .from('app_logs')
            .insert(appLogData);
        if (error) {
            // Queue for later upload if database fails
            (0, unsyncedManager_1.queueAppLog)(appLogData);
            throw error;
        }
        console.log('✅ App activity saved:', currentApp.app_name);
    }
    catch (error) {
        console.error('❌ Failed to save app activity:', error);
        (0, errorHandler_1.logError)('saveAppActivity', error);
    }
}
function getAppCategory(appName) {
    const categories = {
        // Development tools
        'Visual Studio Code': 'development',
        'Xcode': 'development',
        'Terminal': 'development',
        'iTerm': 'development',
        'Android Studio': 'development',
        'IntelliJ IDEA': 'development',
        // Browsers
        'Google Chrome': 'browser',
        'Safari': 'browser',
        'Firefox': 'browser',
        'Microsoft Edge': 'browser',
        'Arc': 'browser',
        // Communication
        'Slack': 'communication',
        'Zoho Cliq': 'communication',
        'Microsoft Teams': 'communication',
        'Zoom': 'communication',
        'Skype': 'communication',
        'Discord': 'communication',
        'WhatsApp': 'communication',
        'Telegram': 'communication',
        'Mail': 'communication',
        // System
        'Finder': 'system',
        'System Preferences': 'system',
        'Activity Monitor': 'system',
        'Console': 'system',
        // Entertainment
        'Spotify': 'entertainment',
        'Apple Music': 'entertainment',
        'VLC': 'entertainment',
        'QuickTime Player': 'entertainment',
        'Netflix': 'entertainment',
        // Productivity
        'Microsoft Word': 'productivity',
        'Microsoft Excel': 'productivity',
        'Microsoft PowerPoint': 'productivity',
        'Google Docs': 'productivity',
        'Notion': 'productivity',
        'Obsidian': 'productivity',
        'Bear': 'productivity',
        // Design
        'Figma': 'design',
        'Adobe Photoshop': 'design',
        'Adobe Illustrator': 'design',
        'Sketch': 'design'
    };
    // Check for exact matches first
    if (categories[appName]) {
        return categories[appName];
    }
    // Check for partial matches
    const lowerAppName = appName.toLowerCase();
    for (const [app, category] of Object.entries(categories)) {
        if (lowerAppName.includes(app.toLowerCase()) || app.toLowerCase().includes(lowerAppName)) {
            return category;
        }
    }
    return 'other';
}
function calculateProductivityScore(app) {
    const category = getAppCategory(app.app_name);
    const activityLevel = (app.mouse_clicks + app.keystrokes + app.mouse_movements / 10) / app.duration_seconds;
    let baseScore = 50; // Default score
    // Adjust based on app category
    switch (category) {
        case 'development':
            baseScore = 90;
            break;
        case 'communication':
            baseScore = 70;
            break;
        case 'browser':
            baseScore = 60; // Depends on URL
            break;
        case 'entertainment':
            baseScore = 20;
            break;
        case 'system':
            baseScore = 40;
            break;
    }
    // Adjust based on activity level
    const activityMultiplier = Math.min(1.5, Math.max(0.5, activityLevel));
    return Math.round(baseScore * activityMultiplier);
}
async function saveURLActivity(appActivity) {
    if (!appActivity.url || !currentUserId)
        return;
    try {
        // Use minimal url_logs schema
        const urlLogData = {
            user_id: currentUserId,
            site_url: appActivity.url,
            category: getURLCategory(appActivity.url)
        };
        const { error } = await supabase_1.supabase
            .from('url_logs')
            .insert(urlLogData);
        if (error) {
            console.error('❌ Failed to save URL activity:', error);
            // Could queue for later upload here
        }
        else {
            console.log('✅ URL activity saved:', appActivity.url);
        }
    }
    catch (error) {
        console.error('❌ Failed to save URL activity:', error);
        (0, errorHandler_1.logError)('saveURLActivity', error);
    }
}
function getURLCategory(url) {
    if (url.includes('github.com') || url.includes('stackoverflow.com') || url.includes('docs.')) {
        return 'other'; // Use 'other' instead of 'development' until constraint is fixed
    }
    if (url.includes('youtube.com') || url.includes('netflix.com') || url.includes('spotify.com')) {
        return 'entertainment';
    }
    if (url.includes('facebook.com') || url.includes('twitter.com') || url.includes('linkedin.com')) {
        return 'social';
    }
    if (url.includes('google.com') || url.includes('wikipedia.org')) {
        return 'other'; // Use 'other' instead of 'research' until constraint is fixed
    }
    return 'other';
}
function calculateURLProductivityScore(url) {
    const category = getURLCategory(url);
    switch (category) {
        case 'development':
            return 95;
        case 'research':
            return 80;
        case 'social':
            return 30;
        case 'entertainment':
            return 15;
        default:
            return 50;
    }
}
async function saveActivitySession() {
    if (!currentActivitySession)
        return;
    try {
        // Save activity session as an app log entry for now - minimal schema
        const sessionLogData = {
            user_id: currentActivitySession.user_id,
            project_id: '00000000-0000-0000-0000-000000000001', // Use default project UUID
            app_name: 'Activity Monitor',
            window_title: `${currentActivitySession.is_active ? 'Active' : 'Ended'} Session - Screenshots: ${currentActivitySession.total_screenshots}`
        };
        const { error } = await supabase_1.supabase
            .from('app_logs')
            .insert(sessionLogData);
        if (error) {
            console.error('❌ Failed to save activity session:', error);
            // Queue for later upload using existing queue system
            (0, unsyncedManager_1.queueAppLog)(sessionLogData);
        }
    }
    catch (error) {
        console.error('❌ Failed to save activity session:', error);
        (0, errorHandler_1.logError)('saveActivitySession', error);
    }
}
// Manual activity trigger (for testing)
function triggerActivityCapture() {
    console.log('🧪 triggerActivityCapture() called');
    console.log('📊 Activity monitoring state - isMonitoring:', isMonitoring, 'currentUserId:', currentUserId);
    // Use the real task ID from active tracking if available, otherwise skip
    if (!currentUserId) {
        console.log('⚠️ No user ID set for activity capture - skipping screenshot');
        return;
    }
    console.log('📸 Triggering manual screenshot capture...');
    captureActivityScreenshot();
}
// Direct screenshot test function (for testing without activity monitoring)
async function triggerDirectScreenshot() {
    console.log('🧪 triggerDirectScreenshot() called - testing basic screenshot functionality');
    try {
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        console.log(`🖥️ Display size: ${width}x${height}`);
        const sources = await electron_1.desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) }
        });
        console.log(`📺 Available sources: ${sources.length}`);
        if (sources.length === 0) {
            console.log('❌ No screen sources available - check macOS Screen Recording permissions');
            return false;
        }
        const buffer = sources[0].thumbnail.toPNG();
        const filename = `test_direct_${(0, crypto_1.randomUUID)()}.png`;
        const tempPath = path_1.default.join(electron_1.app.getPath('temp'), filename);
        fs_1.default.writeFileSync(tempPath, buffer);
        console.log(`💾 Test screenshot saved to: ${tempPath}`);
        console.log(`📊 Screenshot size: ${buffer.length} bytes`);
        // For testing, let's just save locally and not upload to avoid DB issues
        const testDir = path_1.default.join(electron_1.app.getPath('userData'), 'test_screenshots');
        fs_1.default.mkdirSync(testDir, { recursive: true });
        const finalPath = path_1.default.join(testDir, filename);
        fs_1.default.copyFileSync(tempPath, finalPath);
        fs_1.default.unlinkSync(tempPath);
        console.log(`✅ Test screenshot saved successfully to: ${finalPath}`);
        return true;
    }
    catch (error) {
        console.error('❌ Direct screenshot test failed:', error);
        (0, errorHandler_1.logError)('triggerDirectScreenshot', error);
        return false;
    }
}
async function checkNotifications() {
    if (!currentUserId)
        return;
    try {
        const { data: notifications, error } = await supabase_1.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUserId)
            .is('read_at', null)
            .order('created_at', { ascending: false })
            .limit(5);
        if (error) {
            console.error('❌ Failed to fetch notifications:', error);
            return;
        }
        if (notifications && notifications.length > 0) {
            for (const notification of notifications) {
                showNotification(notification);
                // Mark as read
                await supabase_1.supabase
                    .from('notifications')
                    .update({ read_at: new Date().toISOString() })
                    .eq('id', notification.id);
            }
        }
    }
    catch (error) {
        console.error('❌ Notification check failed:', error);
        (0, errorHandler_1.logError)('checkNotifications', error);
    }
}
function showNotification(notification) {
    try {
        if (electron_1.Notification.isSupported()) {
            const notif = new electron_1.Notification({
                title: 'Time Flow',
                body: getNotificationMessage(notification),
                icon: path_1.default.join(__dirname, '../assets/icon.png'), // Add app icon
                silent: false
            });
            notif.show();
            notif.on('click', () => {
                console.log('📱 Notification clicked:', notification.type);
                // Could open admin panel or specific page
            });
            console.log('📱 Notification shown:', notification.type);
        }
    }
    catch (error) {
        console.error('❌ Failed to show notification:', error);
    }
}
function getNotificationMessage(notification) {
    switch (notification.type) {
        case 'low_activity':
            return 'Low activity detected. Please check your productivity.';
        case 'long_session':
            return 'You\'ve been working for a long time. Consider taking a break.';
        case 'activity_drop':
            return 'Significant activity drop detected.';
        case 'unusual_pattern':
            return 'Unusual activity pattern detected.';
        default:
            return notification.payload?.message || 'You have a new notification.';
    }
}
// Export activity metrics for external access
function getActivityMetrics() {
    return { ...activityMetrics };
}
// Export function to record REAL user activity (call this from actual input events)
function recordRealActivity(type, count = 1) {
    if (!isMonitoring || !currentUserId)
        return;
    const now = Date.now();
    const timestamp = new Date().toISOString();
    // Record the real activity with proper increments
    const previousMetrics = { ...activityMetrics };
    switch (type) {
        case 'mouse_click':
            activityMetrics.mouse_clicks += count;
            break;
        case 'keystroke':
            activityMetrics.keystrokes += count;
            break;
        case 'mouse_movement':
            activityMetrics.mouse_movements += count;
            break;
    }
    // Calculate activity score from real input (improved formula)
    let scoreIncrease = 0;
    switch (type) {
        case 'mouse_click':
            scoreIncrease = count * 15; // Clicks are worth more
            break;
        case 'keystroke':
            scoreIncrease = count * 10; // Keystrokes are significant
            break;
        case 'mouse_movement':
            scoreIncrease = count * 2; // Mouse movements are worth less
            break;
    }
    // Boost activity score but cap at 100
    const previousScore = activityMetrics.activity_score;
    activityMetrics.activity_score = Math.min(100, activityMetrics.activity_score + scoreIncrease);
    // Update last activity time with real input
    updateLastActivity();
    // Enhanced detailed logging for all input types
    if (type === 'mouse_click') {
        console.log(`🖱️ Real mouse click detected: ${count} click${count > 1 ? 's' : ''}, total clicks: ${activityMetrics.mouse_clicks}`);
        console.log(`🖱️ MOUSE CLICK DETAILS:`, {
            timestamp: timestamp,
            click_count: count,
            total_session_clicks: activityMetrics.mouse_clicks,
            activity_score_before: previousScore,
            activity_score_after: activityMetrics.activity_score,
            score_increase: scoreIncrease,
            session_totals: {
                mouse_clicks: activityMetrics.mouse_clicks,
                keystrokes: activityMetrics.keystrokes,
                mouse_movements: activityMetrics.mouse_movements
            },
            user_status: 'GENUINELY_ACTIVE_CLICKING'
        });
    }
    else if (type === 'keystroke') {
        console.log(`⌨️ Real keystroke detected: ${count} keystroke${count > 1 ? 's' : ''}, total keystrokes: ${activityMetrics.keystrokes}`);
        console.log(`⌨️ KEYSTROKE DETAILS:`, {
            timestamp: timestamp,
            keystroke_count: count,
            total_session_keystrokes: activityMetrics.keystrokes,
            activity_score_before: previousScore,
            activity_score_after: activityMetrics.activity_score,
            score_increase: scoreIncrease,
            session_totals: {
                mouse_clicks: activityMetrics.mouse_clicks,
                keystrokes: activityMetrics.keystrokes,
                mouse_movements: activityMetrics.mouse_movements
            },
            user_status: 'GENUINELY_ACTIVE_TYPING'
        });
    }
    else if (type === 'mouse_movement') {
        // Mouse movement recorded silently to avoid log spam
    }
    // Overall activity summary (shown occasionally to avoid spam)
    if (Math.random() < 0.1) { // Show 10% of the time
        console.log(`📊 ACTIVITY SUMMARY:`, {
            timestamp: timestamp,
            latest_input_type: type.toUpperCase(),
            current_activity_score: activityMetrics.activity_score,
            session_activity: {
                total_clicks: activityMetrics.mouse_clicks,
                total_keystrokes: activityMetrics.keystrokes,
                total_movements: activityMetrics.mouse_movements,
                combined_inputs: activityMetrics.mouse_clicks + activityMetrics.keystrokes + activityMetrics.mouse_movements
            },
            productivity_level: activityMetrics.activity_score >= 80 ? 'HIGH' :
                activityMetrics.activity_score >= 50 ? 'MEDIUM' :
                    activityMetrics.activity_score >= 20 ? 'LOW' : 'MINIMAL',
            user_engagement: 'REAL_USER_ACTIVE'
        });
    }
}
// Improved activity metrics reset with better logging
function resetActivityMetrics() {
    if (!isMonitoring)
        return;
    const oldMetrics = { ...activityMetrics };
    // Reset ALL counters for fresh start
    activityMetrics.mouse_clicks = 0;
    activityMetrics.keystrokes = 0;
    activityMetrics.mouse_movements = 0;
    // Keep activity score and last activity time (don't reset these)
    console.log('🔄 ACTIVITY_METRICS_RESET:', {
        timestamp: new Date().toISOString(),
        reset_type: '10_MINUTE_INTERVAL',
        previous_metrics: {
            mouse_clicks: oldMetrics.mouse_clicks,
            keystrokes: oldMetrics.keystrokes,
            mouse_movements: oldMetrics.mouse_movements,
            activity_score: oldMetrics.activity_score
        },
        current_metrics: {
            mouse_clicks: activityMetrics.mouse_clicks,
            keystrokes: activityMetrics.keystrokes,
            mouse_movements: activityMetrics.mouse_movements,
            activity_score: activityMetrics.activity_score // This stays the same
        },
        note: 'Counters reset for fresh 10-minute window, score preserved'
    });
    // Save the accumulated metrics to current session and app
    if (currentActivitySession) {
        currentActivitySession.total_mouse_clicks += oldMetrics.mouse_clicks;
        currentActivitySession.total_keystrokes += oldMetrics.keystrokes;
        currentActivitySession.total_mouse_movements += oldMetrics.mouse_movements;
        saveActivitySession();
    }
    if (currentApp) {
        currentApp.mouse_clicks += oldMetrics.mouse_clicks;
        currentApp.keystrokes += oldMetrics.keystrokes;
        currentApp.mouse_movements += oldMetrics.mouse_movements;
        saveAppActivity();
    }
}
// Export function to force refresh activity display
function triggerActivityRefresh() {
    if (!isMonitoring)
        return;
    console.log('🔄 Forcing activity refresh:', {
        timestamp: new Date().toISOString(),
        current_metrics: {
            mouse_clicks: activityMetrics.mouse_clicks,
            keystrokes: activityMetrics.keystrokes,
            mouse_movements: activityMetrics.mouse_movements,
            activity_score: activityMetrics.activity_score
        }
    });
}
// Add handlers for app focus/blur events
function setupAppEventHandlers() {
    try {
        if (!appEvents) {
            appEvents = require('./main').appEvents;
        }
        if (appEvents) {
            // Listen for focus events
            appEvents.on('app-focus', () => {
                console.log('👁️ App gained focus');
                recordRealActivity('mouse_click', 1);
                console.log('🖱️ App focus detected - recorded as click');
            });
            // Listen for blur events  
            appEvents.on('app-blur', () => {
                console.log('👁️ App lost focus');
                recordRealActivity('mouse_click', 1);
                console.log('🖱️ App blur detected - recorded as click');
            });
            console.log('✅ App event handlers setup successfully');
        }
    }
    catch (error) {
        console.log('⚠️ Could not setup app event handlers:', error);
    }
}
// Call this during initialization
if (appEvents) {
    setupAppEventHandlers();
}
function startRandomScreenshotCapture() {
    if (activityInterval) {
        clearTimeout(activityInterval);
    }
    console.log('📸 Starting random screenshots - 2 per 10 minute period');
    scheduleRandomScreenshot();
}
function scheduleRandomScreenshot() {
    if (activityInterval) {
        clearTimeout(activityInterval);
    }
    // Generate random interval between 2-8 minutes (120-480 seconds)
    // This ensures 2 screenshots within each 10-minute window at random times
    const minInterval = 120; // 2 minutes 
    const maxInterval = 480; // 8 minutes
    const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
    console.log(`📸 Next screenshot in ${Math.round(randomInterval / 60)} minutes ${randomInterval % 60} seconds`);
    activityInterval = setTimeout(async () => {
        // Take screenshot regardless of user activity status - that's the whole point of monitoring!
        if (currentUserId) {
            console.log('📸 Attempting scheduled screenshot...');
            await captureActivityScreenshot();
        }
        else {
            console.log('⚠️ No user ID available for scheduled screenshot');
        }
        // Schedule next random screenshot
        scheduleRandomScreenshot();
    }, randomInterval * 1000);
}
// Export function to get current activity metrics
function getCurrentActivityMetrics() {
    return {
        mouse_clicks: activityMetrics.mouse_clicks,
        keystrokes: activityMetrics.keystrokes,
        mouse_movements: activityMetrics.mouse_movements,
        activity_score: activityMetrics.activity_score,
        last_activity_time: activityMetrics.last_activity_time,
        last_activity_formatted: new Date(activityMetrics.last_activity_time).toISOString(),
        time_since_last_activity_seconds: Math.round((Date.now() - activityMetrics.last_activity_time) / 1000),
        is_monitoring: isMonitoring,
        current_user_id: currentUserId
    };
}
// Test function to manually trigger activity (for testing)
function testActivity(type, count = 1) {
    console.log(`🧪 TESTING ACTIVITY: ${type} x${count}`);
    console.log(`🧪 Testing enhanced activity logging system...`);
    if (type === 'all') {
        console.log('🧪 === COMPREHENSIVE ACTIVITY TEST ===');
        console.log('🧪 Testing mouse clicks...');
        recordRealActivity('mouse_click', count);
        setTimeout(() => {
            console.log('🧪 Testing keystrokes...');
            recordRealActivity('keystroke', count);
        }, 500);
        setTimeout(() => {
            console.log('🧪 Testing mouse movements...');
            recordRealActivity('mouse_movement', count * 5); // More movements
        }, 1000);
        setTimeout(() => {
            console.log('🧪 === TEST COMPLETE ===');
            const metrics = getCurrentActivityMetrics();
            console.log('🧪 FINAL TEST RESULTS:', {
                test_type: 'COMPREHENSIVE',
                input_count_tested: count,
                final_metrics: metrics,
                test_success: metrics.mouse_clicks > 0 && metrics.keystrokes > 0 && metrics.mouse_movements > 0
            });
        }, 1500);
    }
    else {
        recordRealActivity(type, count);
        setTimeout(() => {
            const metrics = getCurrentActivityMetrics();
            console.log('🧪 SINGLE TEST RESULTS:', {
                test_type: type.toUpperCase(),
                input_count_tested: count,
                final_metrics: metrics,
                test_success: true
            });
        }, 200);
    }
    const metrics = getCurrentActivityMetrics();
    return metrics;
}
// Enhanced demonstration function for showcasing the new logging system
function demonstrateEnhancedLogging() {
    console.log('🎯 === ENHANCED LOGGING DEMONSTRATION ===');
    console.log('🎯 This will show detailed logs for keyboard, mouse clicks, and movements...');
    // Test different activity types with delays to show separate logs
    setTimeout(() => {
        console.log('🎯 [1/5] Testing single mouse click...');
        recordRealActivity('mouse_click', 1);
    }, 500);
    setTimeout(() => {
        console.log('🎯 [2/5] Testing multiple keystrokes...');
        recordRealActivity('keystroke', 3);
    }, 1000);
    setTimeout(() => {
        console.log('🎯 [3/5] Testing mouse movements...');
        recordRealActivity('mouse_movement', 10);
    }, 1500);
    setTimeout(() => {
        console.log('🎯 [4/5] Testing rapid clicking...');
        recordRealActivity('mouse_click', 5);
    }, 2000);
    setTimeout(() => {
        console.log('🎯 [5/5] Testing heavy typing session...');
        recordRealActivity('keystroke', 15);
    }, 2500);
    setTimeout(() => {
        console.log('🎯 === DEMONSTRATION COMPLETE ===');
        const finalMetrics = getCurrentActivityMetrics();
        console.log('🎯 DEMONSTRATION SUMMARY:', {
            total_demonstration_inputs: {
                mouse_clicks: finalMetrics.mouse_clicks,
                keystrokes: finalMetrics.keystrokes,
                mouse_movements: finalMetrics.mouse_movements
            },
            final_activity_score: finalMetrics.activity_score,
            engagement_level: finalMetrics.activity_score >= 80 ? 'VERY_HIGH' :
                finalMetrics.activity_score >= 60 ? 'HIGH' :
                    finalMetrics.activity_score >= 40 ? 'MEDIUM' : 'LOW',
            demonstration_success: true,
            logging_system_status: 'ENHANCED_LOGGING_ACTIVE'
        });
    }, 3000);
}
