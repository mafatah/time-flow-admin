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
    // Always show login screen - don't auto-login saved users
    // This ensures employees must log in each time and manually start tracking
    localStorage.removeItem('timeflow_user'); // Clear any saved user
    showLogin();
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

    // Navigation handlers
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');
            if (targetPage) {
                showPage(targetPage);
                
                // Load screenshots when navigating to screenshots page
                if (targetPage === 'screenshots') {
                    setTimeout(loadRecentScreenshots, 100);
                }
            }
        });
    });

    // Dashboard control buttons
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (startBtn) startBtn.addEventListener('click', startTracking);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTracking);
    if (stopBtn) stopBtn.addEventListener('click', stopTracking);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Time Tracker page control buttons
    const trackerStartBtn = document.getElementById('trackerStartBtn');
    const trackerPauseBtn = document.getElementById('trackerPauseBtn');
    const trackerStopBtn = document.getElementById('trackerStopBtn');

    if (trackerStartBtn) trackerStartBtn.addEventListener('click', startTracking);
    if (trackerPauseBtn) trackerPauseBtn.addEventListener('click', pauseTracking);
    if (trackerStopBtn) trackerStopBtn.addEventListener('click', stopTracking);

    // Start/stop tracking buttons  
    const startTrackingBtn = document.getElementById('startTracking');
    const pauseTrackingBtn = document.getElementById('pauseTracking');
    const stopTrackingBtn = document.getElementById('stopTracking');

    if (startTrackingBtn) {
        startTrackingBtn.addEventListener('click', async () => {
            const result = await ipcRenderer.invoke('start-tracking');
            showNotification(result.message, result.success ? 'success' : 'error');
            updateTrackingControls();
        });
    }

    if (pauseTrackingBtn) {
        pauseTrackingBtn.addEventListener('click', async () => {
            const result = await ipcRenderer.invoke('pause-tracking');
            showNotification(result.message, result.success ? 'success' : 'error');
            updateTrackingControls();
        });
    }

    if (stopTrackingBtn) {
        stopTrackingBtn.addEventListener('click', async () => {
            const result = await ipcRenderer.invoke('stop-tracking');
            showNotification(result.message, result.success ? 'success' : 'error');
            updateTrackingControls();
        });
    }

    // Manual screenshot button
    const manualScreenshotBtn = document.getElementById('manualScreenshot');
    if (manualScreenshotBtn) {
        manualScreenshotBtn.addEventListener('click', async () => {
            showNotification('Capturing screenshot...', 'info');
            const result = await ipcRenderer.invoke('force-screenshot');
            showNotification(result.message, result.success ? 'success' : 'error');
            // Refresh screenshots after manual capture
            setTimeout(loadRecentScreenshots, 2000);
        });
    }

    // Settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', saveSettings);
    }

    // Current task input
    const currentTaskInput = document.getElementById('currentTask');
    if (currentTaskInput) {
        currentTaskInput.addEventListener('change', (e) => {
            // Save current task
            localStorage.setItem('currentTask', e.target.value);
            showNotification('Task updated', 'success');
        });
    }

    // Screenshot date filter
    const screenshotDate = document.getElementById('screenshotDate');
    if (screenshotDate) {
        screenshotDate.value = new Date().toISOString().split('T')[0];
        screenshotDate.addEventListener('change', loadRecentScreenshots);
    }

    // Load More Screenshots button
    const loadMoreBtn = document.getElementById('loadMoreScreenshotsBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreScreenshots);
    }
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
        // Get the config from main process
        const config = await ipcRenderer.invoke('get-config');
        
        // Create Supabase client if not already created
        if (!window.supabase) {
            const { createClient } = require('@supabase/supabase-js');
            window.supabase = createClient(config.supabase_url, config.supabase_key);
        }

        // Authenticate with Supabase
        const { data: authData, error: authError } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) {
            throw new Error(authError.message);
        }

        // Get user details from users table
        const { data: userDetails, error: userError } = await window.supabase
            .from('users')
            .select('id, email, full_name, role')
            .eq('id', authData.user.id)
            .single();

        if (userError) {
            console.error('User details error:', userError);
            // Still proceed with auth data if user table lookup fails
        }

        // Set current user
        currentUser = {
            id: authData.user.id,
            email: authData.user.email,
            name: userDetails ? userDetails.full_name : email.split('@')[0],
            role: userDetails ? userDetails.role : 'employee'
        };

        // Save user to localStorage
        localStorage.setItem('timeflow_user', JSON.stringify(currentUser));

        // Notify main process about user login
        ipcRenderer.send('user-logged-in', currentUser);

        showMainApp();
        showNotification('Login successful!', 'success');
        
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message || 'Authentication failed. Please check your credentials.';
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
    passwordInput.value = 'employee123456';

    // Disable button
    quickLoginBtn.disabled = true;
    quickLoginBtn.textContent = 'Logging in...';

    try {
        // Get the config from main process
        const config = await ipcRenderer.invoke('get-config');
        
        // Create Supabase client if not already created
        if (!window.supabase) {
            const { createClient } = require('@supabase/supabase-js');
            window.supabase = createClient(config.supabase_url, config.supabase_key);
        }

        // Authenticate with Supabase
        const { data: authData, error: authError } = await window.supabase.auth.signInWithPassword({
            email: 'employee@timeflow.com',
            password: 'employee123456'
        });

        if (authError) {
            throw new Error(authError.message);
        }

        // Get user details from users table
        const { data: userDetails, error: userError } = await window.supabase
            .from('users')
            .select('id, email, full_name, role')
            .eq('id', authData.user.id)
            .single();

        if (userError) {
            console.error('User details error:', userError);
            // Still proceed with auth data if user table lookup fails
        }

        // Set current user
        currentUser = {
            id: authData.user.id,
            email: authData.user.email,
            name: userDetails ? userDetails.full_name : 'John Employee',
            role: userDetails ? userDetails.role : 'employee'
        };

        // Save user to localStorage
        localStorage.setItem('timeflow_user', JSON.stringify(currentUser));

        // Notify main process about user login
        ipcRenderer.send('user-logged-in', currentUser);

        showMainApp();
        showNotification('Welcome back!', 'success');
        
    } catch (error) {
        console.error('Quick login error:', error);
        errorDiv.textContent = error.message || 'Quick login failed. Please try again.';
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
    
    // Update current date
    updateCurrentDate();
    
    // Load saved task
    loadCurrentTask();
    
    // Don't auto-start activity monitoring - let employee start manually
    // Employee must click "Start Tracking" to begin
    
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

    // Update page content - convert hyphenated names to camelCase
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    
    // Convert hyphenated page names to camelCase for page IDs
    const pageIdMap = {
        'dashboard': 'dashboardPage',
        'time-tracker': 'timeTrackerPage', 
        'reports': 'reportsPage',
        'screenshots': 'screenshotsPage',
        'idle-time': 'idleTimePage'
    };
    
    const actualPageId = pageIdMap[pageId] || pageId + 'Page';
    const activePage = document.getElementById(actualPageId);
    if (activePage) {
        activePage.classList.add('active');
        console.log('✅ Switched to page:', pageId, '- Element ID:', actualPageId);
    } else {
        console.log('⚠️ Page not found:', pageId, '- Looking for element ID:', actualPageId);
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
    // Dashboard buttons
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');

    // Time Tracker page buttons
    const trackerStartBtn = document.getElementById('trackerStartBtn');
    const trackerPauseBtn = document.getElementById('trackerPauseBtn');
    const trackerStopBtn = document.getElementById('trackerStopBtn');

    if (isTracking) {
        // Dashboard buttons
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'Tracking...';
        }
        if (pauseBtn) pauseBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = false;

        // Time tracker buttons
        if (trackerStartBtn) {
            trackerStartBtn.disabled = true;
            trackerStartBtn.textContent = 'Tracking...';
        }
        if (trackerPauseBtn) trackerPauseBtn.disabled = false;
        if (trackerStopBtn) trackerStopBtn.disabled = false;
    } else {
        // Dashboard buttons
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Tracking';
        }
        if (pauseBtn) pauseBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = true;

        // Time tracker buttons
        if (trackerStartBtn) {
            trackerStartBtn.disabled = false;
            trackerStartBtn.textContent = 'Start Session';
        }
        if (trackerPauseBtn) trackerPauseBtn.disabled = true;
        if (trackerStopBtn) trackerStopBtn.disabled = true;
    }
}

function updateSessionStatus(status) {
    const statusBadge = document.getElementById('sessionStatus');
    const trackerStatusBadge = document.getElementById('trackerSessionStatus');
    
    const statusTexts = {
        'active': 'Active',
        'paused': 'Paused',
        'stopped': 'Stopped'
    };
    
    if (statusBadge) {
        statusBadge.className = `status-badge ${status}`;
        statusBadge.textContent = statusTexts[status] || 'Stopped';
    }
    
    if (trackerStatusBadge) {
        trackerStatusBadge.className = `status-badge ${status}`;
        trackerStatusBadge.textContent = statusTexts[status] || 'Stopped';
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
    const trackerSessionTimeEl = document.getElementById('trackerSessionTime');
    
    if (sessionTimeEl) {
        sessionTimeEl.textContent = timeString;
    }
    
    if (trackerSessionTimeEl) {
        trackerSessionTimeEl.textContent = timeString;
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

function updateCurrentDate() {
    const todayDateEl = document.getElementById('todayDate');
    if (todayDateEl) {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        todayDateEl.textContent = now.toLocaleDateString('en-US', options);
    }
}

function loadCurrentTask() {
    const currentTaskInput = document.getElementById('currentTaskInput');
    const savedTask = localStorage.getItem('currentTask');
    if (currentTaskInput && savedTask) {
        currentTaskInput.value = savedTask;
    }
}

function filterScreenshots() {
    const selectedDate = document.getElementById('screenshotDate').value;
    showNotification(`Filtering screenshots for ${selectedDate}`, 'info');
    // In a real implementation, this would filter the screenshot grid
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

// Add new functions for screenshot functionality
async function loadRecentScreenshots() {
    const screenshotDate = document.getElementById('screenshotDate');
    const selectedDate = screenshotDate ? screenshotDate.value : new Date().toISOString().split('T')[0];
    
    try {
        showNotification('Loading screenshots...', 'info');
        
        // Get current user from config
        const config = await ipcRenderer.invoke('get-config');
        if (!config || !config.user_id) {
            showNotification('User not logged in', 'error');
            return;
        }

        // Fetch screenshots from main process
        const screenshots = await ipcRenderer.invoke('fetch-screenshots', {
            user_id: config.user_id,
            date: selectedDate,
            limit: 20
        });

        displayScreenshots(screenshots);
        
        if (screenshots.length > 0) {
            showNotification(`Loaded ${screenshots.length} screenshots`, 'success');
        } else {
            showNotification('No screenshots found for selected date', 'info');
        }
        
    } catch (error) {
        console.error('Error loading screenshots:', error);
        showNotification('Failed to load screenshots', 'error');
    }
}

function displayScreenshots(screenshots) {
    const gridContainer = document.getElementById('screenshotGrid');
    if (!gridContainer) return;

    if (screenshots.length === 0) {
        gridContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748b;">
                <span style="font-size: 48px;">📷</span>
                <div style="margin-top: 16px; font-size: 16px;">No screenshots found</div>
                <div style="font-size: 14px; margin-top: 8px;">Screenshots will appear here when captured</div>
            </div>
        `;
        return;
    }

    // Build screenshot grid HTML
    let screenshotHTML = '';
    screenshots.forEach((screenshot, index) => {
        const capturedAt = new Date(screenshot.captured_at);
        const timeString = capturedAt.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        
        const activityPercent = screenshot.activity_percent || 0;
        
        screenshotHTML += `
            <div class="screenshot-item" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc;">
                <div style="width: 100%; height: 120px; background: #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 8px; cursor: pointer;" onclick="openScreenshot('${screenshot.image_url}')">
                    <img src="${screenshot.image_url}" 
                         alt="Screenshot ${index + 1}" 
                         style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s;"
                         onmouseover="this.style.transform='scale(1.05)'"
                         onmouseout="this.style.transform='scale(1)'"
                         onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; height: 100%; color: #64748b;\\'>📸<\\/div>';">
                </div>
                <div style="font-size: 12px; color: #64748b;">${timeString}</div>
                <div style="font-size: 11px; color: #94a3b8;">Activity: ${activityPercent}%</div>
            </div>
        `;
    });

    gridContainer.innerHTML = screenshotHTML;
    
    // Store current screenshots for load more functionality
    window.currentScreenshots = screenshots;
    window.screenshotOffset = screenshots.length;
}

async function loadMoreScreenshots() {
    const screenshotDate = document.getElementById('screenshotDate');
    const selectedDate = screenshotDate ? screenshotDate.value : new Date().toISOString().split('T')[0];
    
    try {
        showNotification('Loading more screenshots...', 'info');
        
        // Get current user from config
        const config = await ipcRenderer.invoke('get-config');
        if (!config || !config.user_id) {
            showNotification('User not logged in', 'error');
            return;
        }

        // Fetch more screenshots with offset
        const offset = window.screenshotOffset || 0;
        const newScreenshots = await ipcRenderer.invoke('fetch-screenshots', {
            user_id: config.user_id,
            date: selectedDate,
            limit: 20,
            offset: offset
        });

        if (newScreenshots.length === 0) {
            showNotification('No more screenshots to load', 'info');
            return;
        }

        // Append new screenshots to existing ones
        const allScreenshots = [...(window.currentScreenshots || []), ...newScreenshots];
        displayScreenshots(allScreenshots);
        
        showNotification(`Loaded ${newScreenshots.length} more screenshots`, 'success');
        
    } catch (error) {
        console.error('Error loading more screenshots:', error);
        showNotification('Failed to load more screenshots', 'error');
    }
}

function openScreenshot(imageUrl) {
    // Open screenshot in new window/tab
    window.open(imageUrl, '_blank');
}

function filterScreenshots() {
    // Reload screenshots for the selected date
    loadRecentScreenshots();
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    // Remove active state from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Add active state to clicked nav item
    const activeNavItem = document.querySelector(`[data-page="${pageId}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Load screenshots when navigating to screenshots page
    if (pageId === 'screenshots') {
        setTimeout(loadRecentScreenshots, 100);
    }
}
