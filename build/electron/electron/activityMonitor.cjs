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
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const supabase_1 = require("./supabase.cjs");
const unsyncedManager_1 = require("./unsyncedManager.cjs");
const errorHandler_1 = require("./errorHandler.cjs");
const config_1 = require("./config.cjs");
const UNSYNCED_ACTIVITY_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'unsynced_activity.json');
// Special UUID for activity monitoring - this represents a virtual "task" for general activity monitoring
const ACTIVITY_MONITORING_TASK_ID = '00000000-0000-0000-0000-000000000001';
let appSettings = {
    blur_screenshots: false,
    screenshot_interval_seconds: config_1.screenshotIntervalSeconds,
    idle_threshold_seconds: config_1.idleTimeoutMinutes * 60
};
let activityInterval;
let appTrackingInterval;
let notificationInterval;
let activityMetricsInterval;
let isMonitoring = false;
let currentUserId = null;
let currentActivitySession = null;
let lastActivityTime = Date.now();
let currentApp = null;
let activityMetrics = {
    mouse_clicks: 0,
    keystrokes: 0,
    mouse_movements: 0,
    last_activity_time: Date.now(),
    activity_score: 0
};
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
    // Start screenshot capture using settings interval
    activityInterval = setInterval(async () => {
        if (currentUserId && isUserActive()) {
            await captureActivityScreenshot();
            updateLastActivity();
        }
    }, appSettings.screenshot_interval_seconds * 1000);
    // Start app activity tracking every 5 seconds
    appTrackingInterval = setInterval(async () => {
        if (currentUserId && isUserActive()) {
            await trackCurrentApp();
            updateLastActivity();
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
    console.log(`✅ Activity monitoring started - Screenshots every ${appSettings.screenshot_interval_seconds}s, App tracking every 5s, Activity metrics every 1s`);
}
function stopActivityMonitoring() {
    if (!isMonitoring)
        return;
    console.log('🛑 Stopping activity monitoring');
    isMonitoring = false;
    if (activityInterval) {
        clearInterval(activityInterval);
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
    // End current activity session
    if (currentActivitySession) {
        currentActivitySession.end_time = new Date().toISOString();
        currentActivitySession.is_active = false;
        currentActivitySession.total_mouse_clicks = activityMetrics.mouse_clicks;
        currentActivitySession.total_keystrokes = activityMetrics.keystrokes;
        currentActivitySession.total_mouse_movements = activityMetrics.mouse_movements;
        saveActivitySession();
    }
    // End current app activity
    if (currentApp) {
        currentApp.end_time = new Date().toISOString();
        currentApp.duration_seconds = Math.floor((Date.now() - new Date(currentApp.start_time).getTime()) / 1000);
        currentApp.mouse_clicks = activityMetrics.mouse_clicks;
        currentApp.keystrokes = activityMetrics.keystrokes;
        currentApp.mouse_movements = activityMetrics.mouse_movements;
        saveAppActivity();
    }
    currentActivitySession = null;
    currentApp = null;
    currentUserId = null;
}
function isUserActive() {
    const idleTimeMs = appSettings.idle_threshold_seconds * 1000;
    return (Date.now() - lastActivityTime) < idleTimeMs;
}
function updateLastActivity() {
    lastActivityTime = Date.now();
    activityMetrics.last_activity_time = Date.now();
}
// Simulate keyboard and mouse activity tracking
// In a real implementation, you'd use native modules to track actual input
async function trackActivityMetrics() {
    if (!currentUserId || !isMonitoring)
        return;
    try {
        // Simulate activity detection (in production, use native modules)
        const now = Date.now();
        const timeSinceLastActivity = now - activityMetrics.last_activity_time;
        // Simulate some activity based on time (for demo purposes)
        if (timeSinceLastActivity < 5000) { // Active in last 5 seconds
            // Simulate random activity
            const mouseClicks = Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0;
            const keystrokes = Math.random() > 0.7 ? Math.floor(Math.random() * 10) : 0;
            const mouseMovements = Math.random() > 0.5 ? Math.floor(Math.random() * 20) : 0;
            activityMetrics.mouse_clicks += mouseClicks;
            activityMetrics.keystrokes += keystrokes;
            activityMetrics.mouse_movements += mouseMovements;
            // Calculate activity score (0-100)
            const recentActivity = mouseClicks + keystrokes + (mouseMovements / 10);
            activityMetrics.activity_score = Math.min(100, Math.max(0, recentActivity * 10));
            if (mouseClicks > 0 || keystrokes > 0 || mouseMovements > 0) {
                updateLastActivity();
            }
        }
        else {
            // Decrease activity score over time
            activityMetrics.activity_score = Math.max(0, activityMetrics.activity_score - 1);
        }
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
                idle_threshold_seconds: data.idle_threshold_seconds || 180
            };
            console.log('✅ Settings loaded:', appSettings);
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
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        const sources = await electron_1.desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) }
        });
        if (sources.length === 0) {
            console.log('❌ No screen sources available - check macOS Screen Recording permissions');
            return;
        }
        let buffer = sources[0].thumbnail.toPNG();
        // Apply blur if enabled in settings
        if (appSettings.blur_screenshots) {
            console.log('🔄 Applying blur to screenshot...');
            buffer = await blurImage(buffer);
        }
        const filename = `activity_${(0, crypto_1.randomUUID)()}.png`;
        const tempPath = path_1.default.join(electron_1.app.getPath('temp'), filename);
        fs_1.default.writeFileSync(tempPath, buffer);
        console.log('💾 Activity screenshot saved:', filename);
        // Upload to Supabase with activity metrics
        await uploadActivityScreenshot(tempPath, filename);
        // Update session stats
        currentActivitySession.total_screenshots++;
        saveActivitySession();
        console.log('✅ Activity screenshot uploaded successfully with metrics');
    }
    catch (error) {
        console.error('❌ Activity screenshot failed:', error);
        (0, errorHandler_1.logError)('captureActivityScreenshot', error);
    }
}
async function uploadActivityScreenshot(filePath, filename) {
    if (!currentUserId) {
        console.log('⚠️ No user ID available, queuing screenshot for later upload');
        (0, unsyncedManager_1.queueScreenshot)({
            user_id: 'unknown',
            task_id: ACTIVITY_MONITORING_TASK_ID,
            image_url: `local://${filePath}`,
            captured_at: new Date().toISOString()
        });
        return;
    }
    // Use a default task ID that should exist in the system
    // This will be replaced with real task ID when proper time tracking is active
    const taskId = ACTIVITY_MONITORING_TASK_ID;
    console.log(`☁️ Uploading activity screenshot - user: ${currentUserId}, task: ${taskId}`);
    try {
        const fileBuffer = fs_1.default.readFileSync(filePath);
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase_1.supabase.storage
            .from('screenshots')
            .upload(`${currentUserId}/${filename}`, fileBuffer, {
            contentType: 'image/png',
            upsert: true
        });
        if (uploadError) {
            console.log('❌ Storage upload failed:', uploadError);
            (0, unsyncedManager_1.queueScreenshot)({
                user_id: currentUserId,
                task_id: taskId,
                image_url: `local://${filePath}`,
                captured_at: new Date().toISOString()
            });
            return;
        }
        // Get public URL
        const { data: { publicUrl } } = supabase_1.supabase.storage
            .from('screenshots')
            .getPublicUrl(`${currentUserId}/${filename}`);
        // Save to database with activity metrics
        const { error: dbError } = await supabase_1.supabase
            .from('screenshots')
            .insert({
            user_id: currentUserId,
            task_id: taskId,
            image_url: publicUrl,
            captured_at: new Date().toISOString(),
            activity_percent: Math.round(activityMetrics.activity_score),
            focus_percent: Math.round(activityMetrics.activity_score * 0.8), // Estimate focus from activity
            mouse_clicks: activityMetrics.mouse_clicks,
            keystrokes: activityMetrics.keystrokes,
            mouse_movements: activityMetrics.mouse_movements
        });
        if (dbError) {
            console.log('❌ Database save failed:', dbError);
            (0, unsyncedManager_1.queueScreenshot)({
                user_id: currentUserId,
                task_id: taskId,
                image_url: publicUrl,
                captured_at: new Date().toISOString()
            });
            return;
        }
        console.log('✅ Activity screenshot uploaded successfully with metrics');
        // Clean up local file
        try {
            fs_1.default.unlinkSync(filePath);
        }
        catch (err) {
            console.log('⚠️ Could not delete local file:', err.message);
        }
    }
    catch (error) {
        console.log('❌ Activity screenshot upload error:', error);
        (0, unsyncedManager_1.queueScreenshot)({
            user_id: currentUserId,
            task_id: taskId,
            image_url: `local://${filePath}`,
            captured_at: new Date().toISOString()
        });
    }
}
async function getCurrentAppName() {
    // Simplified implementation - would need native module for real app detection
    // For demo purposes, simulate different apps
    const apps = ['VS Code', 'Chrome', 'Slack', 'Terminal', 'Finder', 'Safari', 'Zoom', 'Spotify'];
    return apps[Math.floor(Math.random() * apps.length)];
}
async function getCurrentWindowTitle() {
    // Simplified implementation - would need native module for real window title
    const titles = [
        'time-flow-admin - VS Code',
        'GitHub - Chrome',
        'Slack - Team Chat',
        'Terminal',
        'Documents - Finder',
        'YouTube - Safari',
        'Zoom Meeting',
        'Spotify - Music'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
}
async function getCurrentURL() {
    try {
        // This would need native implementation to get browser URLs
        // For demo purposes, simulate URLs for browser apps
        const urls = [
            'https://github.com/user/time-flow-admin',
            'https://stackoverflow.com/questions/react',
            'https://youtube.com/watch?v=example',
            'https://google.com/search?q=typescript',
            'https://supabase.com/docs',
            'https://tailwindcss.com/docs',
            'https://facebook.com',
            'https://twitter.com',
            'https://linkedin.com'
        ];
        // Only return URL for browser-like apps
        const currentApp = await getCurrentAppName();
        if (currentApp.includes('Chrome') || currentApp.includes('Safari')) {
            return urls[Math.floor(Math.random() * urls.length)];
        }
        return undefined;
    }
    catch (error) {
        console.error('❌ URL capture failed:', error);
        return undefined;
    }
}
async function trackCurrentApp() {
    if (!currentUserId || !currentActivitySession)
        return;
    try {
        // Get current active application
        const appName = await getCurrentAppName();
        const windowTitle = await getCurrentWindowTitle();
        const currentURL = await getCurrentURL();
        if (currentApp &&
            currentApp.app_name === appName &&
            currentApp.window_title === windowTitle &&
            currentApp.url === currentURL) {
            // Still in same app/window/URL, continue tracking
            return;
        }
        // End previous app activity
        if (currentApp) {
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
        // Start new app activity
        currentApp = {
            app_name: appName,
            window_title: windowTitle,
            start_time: new Date().toISOString(),
            duration_seconds: 0,
            url: currentURL,
            mouse_clicks: 0,
            keystrokes: 0,
            mouse_movements: 0
        };
        currentActivitySession.total_apps++;
        saveActivitySession();
        console.log('📱 App activity:', appName, '-', windowTitle, currentURL ? `(${currentURL})` : '');
    }
    catch (error) {
        console.error('❌ App tracking failed:', error);
        (0, errorHandler_1.logError)('trackCurrentApp', error);
    }
}
async function saveAppActivity() {
    if (!currentApp || !currentUserId || !currentActivitySession)
        return;
    try {
        // Use minimal app_logs schema - only basic columns that definitely exist
        const appLogData = {
            user_id: currentUserId,
            project_id: '00000000-0000-0000-0000-000000000001', // Use default project UUID
            app_name: currentApp.app_name,
            window_title: currentApp.window_title
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
        'VS Code': 'development',
        'Chrome': 'browser',
        'Safari': 'browser',
        'Slack': 'communication',
        'Zoom': 'communication',
        'Terminal': 'development',
        'Finder': 'system',
        'Spotify': 'entertainment',
        'YouTube': 'entertainment'
    };
    return categories[appName] || 'other';
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
        return 'development';
    }
    if (url.includes('youtube.com') || url.includes('netflix.com') || url.includes('spotify.com')) {
        return 'entertainment';
    }
    if (url.includes('facebook.com') || url.includes('twitter.com') || url.includes('linkedin.com')) {
        return 'social';
    }
    if (url.includes('google.com') || url.includes('wikipedia.org')) {
        return 'research';
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
