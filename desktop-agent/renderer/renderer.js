const { ipcRenderer } = require('electron');

// === STATE MANAGEMENT ===
let currentUser = null;
let isTracking = false;
let sessionStartTime = null;
let activityStats = {
    mouseClicks: 0,
    keystrokes: 0,
    mouseMovements: 0,
    activityPercent: 0,
    focusPercent: 100
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
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupIpcListeners();
});

function initializeApp() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('timeflow_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showMainApp();
        } catch (e) {
            console.error('Error parsing saved user:', e);
            showLogin();
        }
    } else {
        showLogin();
    }
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Quick login button
    const quickLoginBtn = document.getElementById('quickLoginBtn');
    if (quickLoginBtn) {
        quickLoginBtn.addEventListener('click', handleQuickLogin);
    }

    // Navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.target.closest('.nav-item').getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // Control buttons
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (startBtn) startBtn.addEventListener('click', startTracking);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTracking);
    if (stopBtn) stopBtn.addEventListener('click', stopTracking);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

function setupIpcListeners() {
    // Listen for activity updates from main process
    ipcRenderer.on('activity-update', (event, data) => {
        updateActivityStats(data);
    });

    // Listen for session updates
    ipcRenderer.on('session-update', (event, data) => {
        updateSessionDisplay(data);
    });

    // Listen for notifications
    ipcRenderer.on('notification', (event, message, type = 'info') => {
        showNotification(message, type);
    });

    // Listen for screenshot events
    ipcRenderer.on('screenshot-captured', (event, data) => {
        addActivityFeedItem('screenshot', 'Screenshot captured', 'Just now');
    });
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('loginError');

    // Reset error
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    // Disable button
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    try {
        // For now, we'll use a simple demo login
        // In production, this would authenticate with the backend
        if (email && password) {
            // Create demo user
            currentUser = {
                id: 'demo-user-' + Date.now(),
                email: email,
                name: email.split('@')[0],
                role: 'employee'
            };

            // Save user to localStorage
            localStorage.setItem('timeflow_user', JSON.stringify(currentUser));

            // Notify main process about user login
            ipcRenderer.send('user-logged-in', currentUser);

            showMainApp();
        } else {
            throw new Error('Please enter email and password');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message || 'Login failed. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
}

async function handleQuickLogin() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const quickLoginBtn = document.getElementById('quickLoginBtn');
    const errorDiv = document.getElementById('loginError');

    // Reset error
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    // Set predefined credentials
    emailInput.value = 'employee@timeflow.com';
    passwordInput.value = 'password123';

    // Disable button
    quickLoginBtn.disabled = true;
    quickLoginBtn.textContent = 'Logging in...';

    try {
        // Create employee user
        currentUser = {
            id: 'employee-' + Date.now(),
            email: 'employee@timeflow.com',
            name: 'John Employee',
            role: 'employee'
        };

        // Save user to localStorage
        localStorage.setItem('timeflow_user', JSON.stringify(currentUser));

        // Notify main process about user login
        ipcRenderer.send('user-logged-in', currentUser);

        showMainApp();
        showNotification('Welcome back, John!', 'success');

    } catch (error) {
        console.error('Quick login error:', error);
        errorDiv.textContent = 'Quick login failed. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        quickLoginBtn.disabled = false;
        quickLoginBtn.textContent = 'Quick Login as Employee';
    }
}

function showLogin() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
    // Update user info in sidebar
    updateUserInfo();
    
    // Start activity monitoring
    ipcRenderer.send('start-activity-monitoring', currentUser.id);
    
    // Initialize dashboard
    navigateToPage('dashboard');
}

function updateUserInfo() {
    if (!currentUser) return;
    
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl) {
        userNameEl.textContent = currentUser.name || currentUser.email;
    }
    
    if (userAvatarEl) {
        const initial = (currentUser.name || currentUser.email).charAt(0).toUpperCase();
        userAvatarEl.textContent = initial;
    }
}

function navigateToPage(pageId) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-page="${pageId}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }

    // Update page content
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    
    const activePage = document.getElementById(`${pageId}Page`);
    if (activePage) {
        activePage.classList.add('active');
    }

    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        const pageTitles = {
            'dashboard': 'Dashboard',
            'time-tracker': 'Time Tracker',
            'reports': 'Reports',
            'screenshots': 'Screenshots',
            'idle-time': 'Idle Time'
        };
        pageTitle.textContent = pageTitles[pageId] || 'Dashboard';
    }
}

function startTracking() {
    isTracking = true;
    sessionStartTime = new Date();
    
    // Update UI
    updateTrackingButtons();
    updateSessionStatus('active');
    
    // Notify main process
    ipcRenderer.send('start-tracking', currentUser.id);
    
    // Start timer update
    startSessionTimer();
    
    showNotification('Time tracking started', 'success');
    addActivityFeedItem('start', 'Started time tracking', 'Just now');
}

function pauseTracking() {
    isTracking = false;
    
    // Update UI
    updateTrackingButtons();
    updateSessionStatus('paused');
    
    // Notify main process
    ipcRenderer.send('pause-tracking');
    
    showNotification('Time tracking paused', 'warning');
    addActivityFeedItem('pause', 'Paused time tracking', 'Just now');
}

function stopTracking() {
    isTracking = false;
    sessionStartTime = null;
    
    // Update UI
    updateTrackingButtons();
    updateSessionStatus('stopped');
    updateSessionTime('00:00:00');
    
    // Notify main process
    ipcRenderer.send('stop-tracking');
    
    showNotification('Time tracking stopped', 'info');
    addActivityFeedItem('stop', 'Stopped time tracking', 'Just now');
}

function updateTrackingButtons() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');

    if (isTracking) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        startBtn.textContent = 'Tracking...';
    } else {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        startBtn.textContent = 'Start Tracking';
    }
}

function updateSessionStatus(status) {
    const statusBadge = document.getElementById('sessionStatus');
    if (statusBadge) {
        statusBadge.className = `status-badge ${status}`;
        const statusTexts = {
            'active': 'Active',
            'paused': 'Paused',
            'stopped': 'Stopped'
        };
        statusBadge.textContent = statusTexts[status] || 'Stopped';
    }
}

function startSessionTimer() {
    setInterval(() => {
        if (isTracking && sessionStartTime) {
            const elapsed = Date.now() - sessionStartTime.getTime();
            const timeString = formatElapsedTime(elapsed);
            updateSessionTime(timeString);
        }
    }, 1000);
}

function updateSessionTime(timeString) {
    const sessionTimeEl = document.getElementById('sessionTime');
    if (sessionTimeEl) {
        sessionTimeEl.textContent = timeString;
    }
}

function formatElapsedTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateActivityStats(data) {
    // Update activity stats from main process
    Object.assign(activityStats, data);
    
    // Update UI elements
    const activityPercentEl = document.getElementById('activityPercent');
    const focusPercentEl = document.getElementById('focusPercent');
    const mouseClicksEl = document.getElementById('mouseClicks');

    if (activityPercentEl) {
        activityPercentEl.textContent = Math.round(activityStats.activityPercent) + '%';
    }
    
    if (focusPercentEl) {
        focusPercentEl.textContent = Math.round(activityStats.focusPercent) + '%';
    }
    
    if (mouseClicksEl) {
        mouseClicksEl.textContent = activityStats.mouseClicks || 0;
    }
}

function addActivityFeedItem(type, title, time) {
    const activityFeed = document.getElementById('activityFeed');
    if (!activityFeed) return;

    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    const iconMap = {
        'screenshot': '📸',
        'start': '▶️',
        'pause': '⏸️',
        'stop': '⏹️',
        'idle': '😴'
    };
    
    const icon = iconMap[type] || '📋';
    
    activityItem.innerHTML = `
        <div class="activity-icon ${type}">
            ${icon}
        </div>
        <div class="activity-details">
            <div class="activity-title">${title}</div>
            <div class="activity-time">${time}</div>
        </div>
    `;
    
    // Add to top of feed
    activityFeed.insertBefore(activityItem, activityFeed.firstChild);
    
    // Keep only last 10 items
    while (activityFeed.children.length > 10) {
        activityFeed.removeChild(activityFeed.lastChild);
    }
}

function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }

    // Set message and type
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function logout() {
    // Clear user data
    localStorage.removeItem('timeflow_user');
    currentUser = null;
    
    // Stop tracking if active
    if (isTracking) {
        stopTracking();
    }
    
    // Notify main process
    ipcRenderer.send('user-logged-out');
    
    // Reset form
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    
    // Show login screen
    showLogin();
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
    } else if (isTracking && !sessionStartTime) {
        elements.statusIndicator.className = 'status-indicator active pulse';
        elements.statusText.textContent = 'Active';
        elements.statusTime.textContent = 'Starting...';
    } else if (isTracking && sessionStartTime) {
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
    } else if (isTracking && !sessionStartTime) {
        elements.startBtn.disabled = false;
        elements.pauseBtn.disabled = true;
        elements.stopBtn.disabled = true;
        elements.startBtn.textContent = 'Starting...';
    } else if (isTracking && sessionStartTime) {
        elements.startBtn.disabled = true;
        elements.pauseBtn.disabled = false;
        elements.stopBtn.disabled = false;
        elements.startBtn.textContent = 'Tracking...';
    }
}

function updateTimer() {
    if (!isTracking || !sessionStartTime) {
        elements.statusTime.textContent = 'Ready to start';
        return;
    }

    const now = new Date();
    const elapsed = Math.floor((now - sessionStartTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (isTracking && sessionStartTime) {
        elements.statusTime.textContent = `Active for ${timeString}`;
    } else {
        elements.statusTime.textContent = `Ready to start`;
    }
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
    if (sessionStartTime) {
        clearInterval(sessionStartTime);
    }
});

console.log('📱 TimeFlow Agent Renderer loaded');
