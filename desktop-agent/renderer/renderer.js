const { ipcRenderer } = require('electron');

// === STATE MANAGEMENT ===
let currentSession = null;
let isTracking = false;
let isPaused = false;
let startTime = null;
let timerInterval = null;
let activityStats = {
    mouseClicks: 0,
    keystrokes: 0,
    mouseMovements: 0,
    activeSeconds: 0,
    idleSeconds: 0
};
let appSettings = {};
let queueStatus = {};

// === DOM ELEMENTS ===
const elements = {
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),
    statusTime: document.getElementById('statusTime'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    stopBtn: document.getElementById('stopBtn'),
    activityPercent: document.getElementById('activityPercent'),
    focusPercent: document.getElementById('focusPercent'),
    mouseClicks: document.getElementById('mouseClicks'),
    keystrokes: document.getElementById('keystrokes'),
    mouseMovements: document.getElementById('mouseMovements'),
    activeTime: document.getElementById('activeTime'),
    idleTime: document.getElementById('idleTime'),
    activityProgress: document.getElementById('activityProgress'),
    queueStatus: document.getElementById('queueStatus'),
    screenshotsQueued: document.getElementById('screenshotsQueued'),
    appLogsQueued: document.getElementById('appLogsQueued'),
    urlLogsQueued: document.getElementById('urlLogsQueued'),
    screenshotInterval: document.getElementById('screenshotInterval'),
    idleThreshold: document.getElementById('idleThreshold'),
    blurScreenshots: document.getElementById('blurScreenshots'),
    trackUrls: document.getElementById('trackUrls'),
    trackApps: document.getElementById('trackApps'),
    connectionDot: document.getElementById('connectionDot'),
    connectionText: document.getElementById('connectionText'),
    notification: document.getElementById('notification')
};

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 TimeFlow Agent UI initialized');
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial state
    await loadInitialState();
    
    // Start update loops
    startUpdateLoops();
    
    console.log('✅ UI ready');
});

function setupEventListeners() {
    // Control buttons
    elements.startBtn.addEventListener('click', startTracking);
    elements.pauseBtn.addEventListener('click', pauseTracking);
    elements.stopBtn.addEventListener('click', stopTracking);

    // IPC listeners for main process events
    ipcRenderer.on('tracking-started', (event, session) => {
        console.log('📡 Tracking started:', session);
        currentSession = session;
        isTracking = true;
        isPaused = false;
        startTime = new Date(session.start_time);
        updateUI();
        showNotification('Time tracking started', 'success');
    });

    ipcRenderer.on('tracking-stopped', () => {
        console.log('📡 Tracking stopped');
        currentSession = null;
        isTracking = false;
        isPaused = false;
        startTime = null;
        updateUI();
        showNotification('Time tracking stopped', 'info');
    });

    ipcRenderer.on('tracking-paused', (event, data) => {
        console.log('📡 Tracking paused:', data.reason);
        isPaused = true;
        updateUI();
        showNotification(`Tracking paused (${data.reason})`, 'warning');
    });

    ipcRenderer.on('tracking-resumed', () => {
        console.log('📡 Tracking resumed');
        isPaused = false;
        updateUI();
        showNotification('Tracking resumed', 'success');
    });

    ipcRenderer.on('idle-status-changed', (event, data) => {
        console.log('📡 Idle status changed:', data);
        if (data.isIdle) {
            showNotification(`User idle for ${Math.floor(data.idleSeconds / 60)}m`, 'warning');
        } else {
            showNotification(`User active (was idle ${Math.floor(data.idleDuration / 60)}m)`, 'success');
        }
        updateUI();
    });

    ipcRenderer.on('screenshot-captured', (event, data) => {
        console.log('📡 Screenshot captured:', data);
        elements.activityPercent.textContent = `${data.activityPercent}%`;
        elements.focusPercent.textContent = `${data.focusPercent}%`;
        elements.activityProgress.style.width = `${data.activityPercent}%`;
        showNotification('Screenshot captured', 'info');
    });

    ipcRenderer.on('settings-updated', (event, settings) => {
        console.log('📡 Settings updated:', settings);
        appSettings = settings;
        updateSettingsDisplay();
        showNotification('Settings updated from server', 'info');
    });
}

async function loadInitialState() {
    try {
        // Get current tracking status
        const trackingStatus = await ipcRenderer.invoke('is-tracking');
        isTracking = trackingStatus.isTracking;
        isPaused = trackingStatus.isPaused;

        // Get current session
        currentSession = await ipcRenderer.invoke('get-session');
        if (currentSession) {
            startTime = new Date(currentSession.start_time);
        }

        // Get settings
        appSettings = await ipcRenderer.invoke('get-settings');
        updateSettingsDisplay();

        // Get activity stats
        activityStats = await ipcRenderer.invoke('get-stats');

        console.log('📊 Initial state loaded:', {
            isTracking,
            isPaused,
            currentSession,
            appSettings
        });

        updateUI();

    } catch (error) {
        console.error('❌ Failed to load initial state:', error);
        showNotification('Failed to load initial state', 'error');
    }
}

function startUpdateLoops() {
    // Update timer every second
    timerInterval = setInterval(() => {
        if (isTracking && !isPaused && startTime) {
            updateTimer();
        }
    }, 1000);

    // Update activity stats every 5 seconds
    setInterval(async () => {
        try {
            const stats = await ipcRenderer.invoke('get-stats');
            if (stats) {
                activityStats = stats;
                updateActivityStats();
            }
        } catch (error) {
            console.error('❌ Failed to get stats:', error);
        }
    }, 5000);

    // Update queue status every 10 seconds
    setInterval(async () => {
        // This would need to be implemented in main process
        // For now, simulate queue status
        updateQueueStatus();
    }, 10000);
}

// === TRACKING CONTROLS ===
async function startTracking() {
    try {
        elements.startBtn.disabled = true;
        await ipcRenderer.invoke('start-tracking', 'default-task');
        console.log('✅ Start tracking requested');
    } catch (error) {
        console.error('❌ Failed to start tracking:', error);
        showNotification('Failed to start tracking', 'error');
        elements.startBtn.disabled = false;
    }
}

async function pauseTracking() {
    try {
        elements.pauseBtn.disabled = true;
        await ipcRenderer.invoke('pause-tracking');
        console.log('✅ Pause tracking requested');
    } catch (error) {
        console.error('❌ Failed to pause tracking:', error);
        showNotification('Failed to pause tracking', 'error');
        elements.pauseBtn.disabled = false;
    }
}

async function stopTracking() {
    try {
        elements.stopBtn.disabled = true;
        await ipcRenderer.invoke('stop-tracking');
        console.log('✅ Stop tracking requested');
    } catch (error) {
        console.error('❌ Failed to stop tracking:', error);
        showNotification('Failed to stop tracking', 'error');
        elements.stopBtn.disabled = false;
    }
}

// === UI UPDATES ===
function updateUI() {
    updateStatus();
    updateControls();
    updateActivityStats();
    updateTimer();
}

function updateStatus() {
    if (!isTracking) {
        elements.statusIndicator.className = 'status-indicator stopped';
        elements.statusText.textContent = 'Not Tracking';
        elements.statusTime.textContent = 'Ready to start';
    } else if (isPaused) {
        elements.statusIndicator.className = 'status-indicator paused pulse';
        elements.statusText.textContent = 'Paused';
        elements.statusTime.textContent = 'Tracking paused';
    } else {
        elements.statusIndicator.className = 'status-indicator active pulse';
        elements.statusText.textContent = 'Active';
        elements.statusTime.textContent = 'Currently tracking';
    }
}

function updateControls() {
    if (!isTracking) {
        elements.startBtn.disabled = false;
        elements.pauseBtn.disabled = true;
        elements.stopBtn.disabled = true;
        elements.startBtn.textContent = 'Start Tracking';
    } else if (isPaused) {
        elements.startBtn.disabled = false;
        elements.pauseBtn.disabled = true;
        elements.stopBtn.disabled = false;
        elements.startBtn.textContent = 'Resume';
    } else {
        elements.startBtn.disabled = true;
        elements.pauseBtn.disabled = false;
        elements.stopBtn.disabled = false;
        elements.startBtn.textContent = 'Start Tracking';
    }
}

function updateTimer() {
    if (!isTracking || !startTime) {
        elements.statusTime.textContent = 'Ready to start';
        return;
    }

    const now = new Date();
    const elapsed = Math.floor((now - startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (isPaused) {
        elements.statusTime.textContent = `Paused at ${timeString}`;
    } else {
        elements.statusTime.textContent = `Active for ${timeString}`;
    }
}

function updateActivityStats() {
    elements.mouseClicks.textContent = activityStats.mouseClicks || 0;
    elements.keystrokes.textContent = activityStats.keystrokes || 0;
    elements.mouseMovements.textContent = activityStats.mouseMovements || 0;
    
    const activeMinutes = Math.floor((activityStats.activeSeconds || 0) / 60);
    const idleMinutes = Math.floor((activityStats.idleSeconds || 0) / 60);
    
    elements.activeTime.textContent = `${activeMinutes}m`;
    elements.idleTime.textContent = `${idleMinutes}m`;

    // Calculate activity percentage
    const totalActivity = (activityStats.mouseClicks || 0) + (activityStats.keystrokes || 0) + Math.floor((activityStats.mouseMovements || 0) / 10);
    const activityPercent = Math.min(100, totalActivity * 2);
    
    elements.activityProgress.style.width = `${activityPercent}%`;
}

function updateSettingsDisplay() {
    if (!appSettings) return;

    elements.screenshotInterval.textContent = `${Math.floor(appSettings.screenshot_interval_seconds / 60)}m`;
    elements.idleThreshold.textContent = `${Math.floor(appSettings.idle_threshold_seconds / 60)}m`;
    elements.blurScreenshots.textContent = appSettings.blur_screenshots ? 'Yes' : 'No';
    elements.trackUrls.textContent = appSettings.track_urls ? 'Yes' : 'No';
    elements.trackApps.textContent = appSettings.track_applications ? 'Yes' : 'No';
}

function updateQueueStatus() {
    // Simulate queue status - in real implementation, this would come from sync manager
    const totalQueued = Math.floor(Math.random() * 5); // Random for demo
    
    elements.screenshotsQueued.textContent = Math.floor(totalQueued / 3);
    elements.appLogsQueued.textContent = Math.floor(totalQueued / 2);
    elements.urlLogsQueued.textContent = totalQueued;

    if (totalQueued === 0) {
        elements.queueStatus.className = 'queue-status';
        elements.queueStatus.innerHTML = '<div class="queue-text">All data synced ✓</div>';
        elements.connectionDot.className = 'connection-dot';
        elements.connectionText.textContent = 'Connected';
    } else {
        elements.queueStatus.className = 'queue-status offline';
        elements.queueStatus.innerHTML = `<div class="queue-text">${totalQueued} items queued for sync</div>`;
        elements.connectionDot.className = 'connection-dot offline';
        elements.connectionText.textContent = 'Syncing...';
    }
}

// === NOTIFICATIONS ===
function showNotification(message, type = 'info') {
    elements.notification.textContent = message;
    elements.notification.className = `notification ${type} show`;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        elements.notification.className = 'notification';
    }, 3000);
    
    console.log(`🔔 Notification (${type}): ${message}`);
}

// === UTILITY FUNCTIONS ===
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// === ERROR HANDLING ===
window.addEventListener('error', (event) => {
    console.error('❌ UI Error:', event.error);
    showNotification('An error occurred in the UI', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled Promise Rejection:', event.reason);
    showNotification('An unexpected error occurred', 'error');
});

// === CLEANUP ===
window.addEventListener('beforeunload', () => {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
});

console.log('📱 TimeFlow Agent Renderer loaded');
