const { ipcRenderer } = require('electron');

// === GLOBAL VARIABLES ===
let supabaseClient = null;
let currentUser = null;
let isTracking = false;
let sessionStartTime = null;
let sessionTimer = null;
let trackingStatus = 'stopped'; // 'active', 'paused', 'stopped'

// Activity stats tracking
let activityStats = {
    mouseClicks: 0,
    keystrokes: 0,
    mouseMovements: 0,
    activityPercent: 0,
    focusPercent: 100
};

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 TimeFlow Desktop Agent initializing...');
        
        // Get config from main process
        const config = await ipcRenderer.invoke('get-config');
        console.log('✅ Config loaded:', config);
        
        // Initialize Supabase client if available
        if (typeof window.supabase !== 'undefined') {
            supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_key);
            console.log('✅ Supabase client initialized');
        } else {
            console.error('❌ Supabase library not loaded');
            showError('Authentication system not available');
            return;
        }
        
        // Initialize the app
        initializeApp();
        setupEventListeners();
        setupIpcListeners();
        
        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        console.log('✅ Desktop agent initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize desktop agent:', error);
        showError('Failed to initialize application');
    }
});

// === APP INITIALIZATION ===
async function initializeApp() {
    try {
        console.log('🚀 TimeFlow Desktop Agent initializing...');
        
        // Get config from main process
        const config = await ipcRenderer.invoke('get-config');
        console.log('✅ Config loaded:', config);
        
        // Initialize Supabase client
        supabaseClient = supabase.createClient(config.supabase_url, config.supabase_key);
        console.log('✅ Supabase client initialized');
        
        // Try to load saved session
        const savedSession = await ipcRenderer.invoke('load-session');
        if (savedSession && savedSession.user) {
            console.log('📂 Found saved session, auto-logging in...');
            await handleUserLogin(savedSession.user);
        }
        
        // Add test buttons after dashboard is loaded
        addTestButtons();
        
        // Add Mac permission check
        checkMacPermissions();
        
        console.log('✅ App initialization complete');
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showNotification('Failed to initialize app: ' + error.message, 'error');
    }
}

// === EVENT LISTENERS ===
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // === LOGIN FORM EVENTS ===
    const loginForm = document.getElementById('loginForm');
    const quickLoginBtn = document.getElementById('quickLoginBtn');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (quickLoginBtn) {
        quickLoginBtn.addEventListener('click', handleQuickLogin);
    }
    
    // === NAVIGATION EVENTS ===
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');
            if (targetPage) {
                showPage(targetPage);
                updatePageTitle(targetPage);
                
                // Load screenshots when navigating to screenshots page
                if (targetPage === 'screenshots') {
                    setTimeout(loadRecentScreenshots, 100);
                }
            }
        });
    });
    
    // === TRACKING CONTROL EVENTS ===
    // Dashboard controls
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (startBtn) startBtn.addEventListener('click', startTracking);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTracking);
    if (stopBtn) stopBtn.addEventListener('click', stopTracking);
    
    // Time Tracker page controls
    const trackerStartBtn = document.getElementById('trackerStartBtn');
    const trackerPauseBtn = document.getElementById('trackerPauseBtn');
    const trackerStopBtn = document.getElementById('trackerStopBtn');
    
    if (trackerStartBtn) trackerStartBtn.addEventListener('click', startTracking);
    if (trackerPauseBtn) trackerPauseBtn.addEventListener('click', pauseTracking);
    if (trackerStopBtn) trackerStopBtn.addEventListener('click', stopTracking);
    
    // === LOGOUT EVENT ===
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    console.log('✅ Event listeners set up successfully');
}

// === IPC LISTENERS ===
function setupIpcListeners() {
    console.log('🔧 Setting up IPC listeners...');
    
    // Activity updates from main process
    ipcRenderer.on('activity-update', (event, data) => {
        updateActivityStats(data);
    });
    
    // Session updates from main process
    ipcRenderer.on('session-update', (event, data) => {
        updateSessionDisplay(data);
    });
    
    // Notifications from main process
    ipcRenderer.on('notification', (event, message, type = 'info') => {
        showNotification(message, type);
    });
    
    // Screenshot events
    ipcRenderer.on('screenshot-captured', (event, data) => {
        showNotification('Screenshot captured', 'info');
        // Refresh screenshots if on screenshots page
        const screenshotsPage = document.getElementById('screenshotsPage');
        if (screenshotsPage && screenshotsPage.classList.contains('active')) {
            setTimeout(loadRecentScreenshots, 1000);
        }
    });
    
    console.log('✅ IPC listeners set up successfully');
}

// === LOGIN FUNCTIONALITY ===
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginLoader = document.getElementById('loginLoader');
    const errorDiv = document.getElementById('loginError');

    console.log('🔐 Attempting login for:', email);

    // Reset error state
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }

    // Show loading state
    loginBtn.disabled = true;
    if (loginBtnText) loginBtnText.style.display = 'none';
    if (loginLoader) loginLoader.classList.remove('hidden');

    try {
        // Authenticate with Supabase
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) {
            throw new Error(authError.message);
        }

        console.log('✅ Authentication successful');

        // Get user details from users table
        const { data: userDetails, error: userError } = await supabaseClient
            .from('users')
            .select('id, email, full_name, role')
            .eq('id', authData.user.id)
            .single();

        if (userError) {
            console.warn('⚠️ User details lookup failed:', userError);
        }

        // Set current user
        currentUser = {
            id: authData.user.id,
            email: authData.user.email,
            name: userDetails ? userDetails.full_name : email.split('@')[0],
            role: userDetails ? userDetails.role : 'employee'
        };

        console.log('👤 User set:', currentUser);

        // Save user to localStorage
        localStorage.setItem('timeflow_user', JSON.stringify(currentUser));

        // Notify main process about user login
        await ipcRenderer.invoke('user-logged-in', currentUser);

        // Show main app
        showMainApp();
        showNotification('Welcome back! Login successful.', 'success');
        
    } catch (error) {
        console.error('❌ Login error:', error);
        
        if (errorDiv) {
            let errorMessage = 'Authentication failed. Please check your credentials.';
            
            if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'Invalid email or password. Please try again.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Please confirm your email before signing in.';
            } else if (error.message.includes('Too many requests')) {
                errorMessage = 'Too many login attempts. Please wait a moment and try again.';
            }
            
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
        }
        
        showNotification('Login failed', 'error');
        
    } finally {
        // Reset button state
        loginBtn.disabled = false;
        if (loginBtnText) loginBtnText.style.display = 'inline';
        if (loginLoader) loginLoader.classList.add('hidden');
    }
}

async function handleQuickLogin() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const quickLoginBtn = document.getElementById('quickLoginBtn');
    const errorDiv = document.getElementById('loginError');

    console.log('🚀 Quick login initiated');

    // Reset error state
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }

    // Set demo credentials (already pre-filled, but ensure they're correct)
    emailInput.value = 'employee@timeflow.com';
    passwordInput.value = 'employee123456';

    // Show loading state
    quickLoginBtn.disabled = true;
    const originalText = quickLoginBtn.textContent;
    quickLoginBtn.textContent = '🔄 Signing in...';

    try {
        // Authenticate with Supabase using demo credentials
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: 'employee@timeflow.com',
            password: 'employee123456'
        });

        if (authError) {
            throw new Error(authError.message);
        }

        console.log('✅ Quick login successful');

        // Get user details
        const { data: userDetails, error: userError } = await supabaseClient
            .from('users')
            .select('id, email, full_name, role')
            .eq('id', authData.user.id)
            .single();

        // Set current user
        currentUser = {
            id: authData.user.id,
            email: authData.user.email,
            name: userDetails ? userDetails.full_name : 'John Employee',
            role: userDetails ? userDetails.role : 'employee'
        };

        console.log('👤 Quick login user set:', currentUser);

        // Save user to localStorage
        localStorage.setItem('timeflow_user', JSON.stringify(currentUser));

        // Notify main process
        await ipcRenderer.invoke('user-logged-in', currentUser);

        // Show main app
        showMainApp();
        showNotification('🚀 Welcome to TimeFlow! Ready to track your time.', 'success');
        
    } catch (error) {
        console.error('❌ Quick login error:', error);
        
        if (errorDiv) {
            errorDiv.textContent = 'Quick login failed. Please try manual login.';
            errorDiv.style.display = 'block';
        }
        
        showNotification('Quick login failed', 'error');
        
    } finally {
        // Reset button state
        quickLoginBtn.disabled = false;
        quickLoginBtn.textContent = originalText;
    }
}

// === UI STATE MANAGEMENT ===
function showLogin() {
    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.getElementById('appContainer');
    
    if (loginContainer) loginContainer.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    
    console.log('📱 Showing login screen');
}

function showMainApp() {
    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.getElementById('appContainer');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'grid';
    
    // Update user info in sidebar
    updateUserInfo();
    
    // Initialize dashboard as default page
    showPage('dashboard');
    updatePageTitle('dashboard');
    
    // Initialize tracking button states
    updateTrackingButtons();
    updateTrackingStatus();
    
    console.log('📱 Showing main application');
}

function updateUserInfo() {
    if (!currentUser) return;
    
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) {
        userName.textContent = currentUser.name || currentUser.email.split('@')[0];
    }
    
    if (userRole) {
        const roleMap = {
            'admin': 'Administrator', 
            'manager': 'Manager',
            'employee': 'Team Member'
        };
        userRole.textContent = roleMap[currentUser.role] || 'Team Member';
    }
    
    if (userAvatar) {
        const initials = (currentUser.name || currentUser.email)
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        userAvatar.textContent = initials;
    }
    
    console.log('👤 User info updated');
}

function updatePageTitle(pageId) {
    const pageTitle = document.getElementById('pageTitle');
    if (!pageTitle) return;
    
    const pageTitles = {
        'dashboard': 'Dashboard',
        'timetracker': 'Time Tracker', 
        'screenshots': 'Screenshots',
        'reports': 'My Reports'
    };
    
    pageTitle.textContent = pageTitles[pageId] || 'Dashboard';
}

function showPage(pageId) {
    // Hide all page sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active state from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Add active state to corresponding nav item
    const navItem = document.querySelector(`[data-page="${pageId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    console.log('📄 Switched to page:', pageId);
}

// === TIME TRACKING FUNCTIONALITY ===
async function startTracking() {
    if (!currentUser) {
        showNotification('Please log in first', 'error');
        return;
    }
    
    console.log('▶️ Starting time tracking...');
    
    try {
        isTracking = true;
        trackingStatus = 'active';
        sessionStartTime = new Date();
        
        // Update UI immediately
        updateTrackingButtons();
        updateTrackingStatus();
        
        // Start session timer
        startSessionTimer();
        
        // Notify main process
        const result = await ipcRenderer.invoke('start-tracking', currentUser.id);
        
        if (result && result.success) {
            showNotification('⏱️ Time tracking started!', 'success');
        } else {
            showNotification(result ? result.message : 'Failed to start tracking', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error starting tracking:', error);
        showNotification('Failed to start tracking', 'error');
        
        // Reset state on error
        isTracking = false;
        trackingStatus = 'stopped';
        updateTrackingButtons();
        updateTrackingStatus();
    }
}

async function pauseTracking() {
    console.log('⏸️ Pausing time tracking...');
    
    try {
        isTracking = false;
        trackingStatus = 'paused';
        
        // Update UI
        updateTrackingButtons();
        updateTrackingStatus();
        
        // Stop session timer but keep start time
        if (sessionTimer) {
            clearInterval(sessionTimer);
            sessionTimer = null;
        }
        
        // Notify main process
        const result = await ipcRenderer.invoke('pause-tracking');
        
        if (result && result.success) {
            showNotification('⏸️ Time tracking paused', 'info');
        } else {
            showNotification(result ? result.message : 'Failed to pause tracking', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error pausing tracking:', error);
        showNotification('Failed to pause tracking', 'error');
    }
}

async function stopTracking() {
    console.log('⏹️ Stopping time tracking...');
    
    try {
        isTracking = false;
        trackingStatus = 'stopped';
        sessionStartTime = null;
        
        // Update UI
        updateTrackingButtons();
        updateTrackingStatus();
        updateSessionTime('--:--:--');
        
        // Stop session timer
        if (sessionTimer) {
            clearInterval(sessionTimer);
            sessionTimer = null;
        }
        
        // Notify main process
        const result = await ipcRenderer.invoke('stop-tracking');
        
        if (result && result.success) {
            showNotification('⏹️ Time tracking stopped', 'info');
        } else {
            showNotification(result ? result.message : 'Failed to stop tracking', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error stopping tracking:', error);
        showNotification('Failed to stop tracking', 'error');
    }
}

// === UI UPDATES ===
function updateTrackingButtons() {
    // Dashboard buttons
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    // Time Tracker page buttons
    const trackerStartBtn = document.getElementById('trackerStartBtn');
    const trackerPauseBtn = document.getElementById('trackerPauseBtn');
    const trackerStopBtn = document.getElementById('trackerStopBtn');
    
    if (trackingStatus === 'active') {
        // Active state
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i data-lucide="clock" style="width: 20px; height: 20px;"></i><span>Tracking...</span>';
        }
        if (pauseBtn) pauseBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = false;
        
        if (trackerStartBtn) {
            trackerStartBtn.disabled = true;
            trackerStartBtn.innerHTML = '<i data-lucide="clock" style="width: 20px; height: 20px;"></i><span>Tracking...</span>';
        }
        if (trackerPauseBtn) trackerPauseBtn.disabled = false;
        if (trackerStopBtn) trackerStopBtn.disabled = false;
        
    } else if (trackingStatus === 'paused') {
        // Paused state
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i data-lucide="play" style="width: 20px; height: 20px;"></i><span>Resume</span>';
        }
        if (pauseBtn) pauseBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        
        if (trackerStartBtn) {
            trackerStartBtn.disabled = false;
            trackerStartBtn.innerHTML = '<i data-lucide="play" style="width: 20px; height: 20px;"></i><span>Resume</span>';
        }
        if (trackerPauseBtn) trackerPauseBtn.disabled = true;
        if (trackerStopBtn) trackerStopBtn.disabled = false;
        
    } else {
        // Stopped state
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i data-lucide="play" style="width: 20px; height: 20px;"></i><span>Start Tracking</span>';
        }
        if (pauseBtn) pauseBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = true;
        
        if (trackerStartBtn) {
            trackerStartBtn.disabled = false;
            trackerStartBtn.innerHTML = '<i data-lucide="play" style="width: 20px; height: 20px;"></i><span>Start</span>';
        }
        if (trackerPauseBtn) trackerPauseBtn.disabled = true;
        if (trackerStopBtn) trackerStopBtn.disabled = true;
    }
    
    // Re-create icons after updating innerHTML
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function updateTrackingStatus() {
    const trackingStatusEl = document.getElementById('trackingStatus');
    const sessionStatusEl = document.getElementById('sessionStatus');
    const trackerStatusEl = document.getElementById('trackerStatus');
    
    const statusMap = {
        'active': { text: 'Tracking', class: 'active' },
        'paused': { text: 'Paused', class: 'paused' },
        'stopped': { text: 'Not Tracking', class: 'stopped' }
    };
    
    const status = statusMap[trackingStatus] || statusMap['stopped'];
    
    if (trackingStatusEl) {
        trackingStatusEl.className = `tracking-status ${status.class}`;
        trackingStatusEl.innerHTML = `<div class="status-dot"></div><span>${status.text}</span>`;
    }
    
    if (sessionStatusEl) {
        sessionStatusEl.textContent = trackingStatus === 'active' ? 'Session active' : 
                                     trackingStatus === 'paused' ? 'Session paused' : 'Ready to start';
    }
    
    if (trackerStatusEl) {
        trackerStatusEl.textContent = trackingStatus === 'active' ? 'Currently tracking time' : 
                                     trackingStatus === 'paused' ? 'Session paused' : 'Ready to start tracking';
    }
}

function startSessionTimer() {
    if (sessionTimer) {
        clearInterval(sessionTimer);
    }
    
    sessionTimer = setInterval(() => {
        if (isTracking && sessionStartTime) {
            const elapsed = Date.now() - sessionStartTime.getTime();
            const timeString = formatElapsedTime(elapsed);
            updateSessionTime(timeString);
        }
    }, 1000);
}

function updateSessionTime(timeString) {
    const sessionTimeEl = document.getElementById('sessionTime');
    const trackerTimeEl = document.getElementById('trackerTime');
    
    if (sessionTimeEl) sessionTimeEl.textContent = timeString;
    if (trackerTimeEl) trackerTimeEl.textContent = timeString;
}

function formatElapsedTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// === ACTIVITY STATS ===
function updateActivityStats(data) {
    if (!data) return;
    
    Object.assign(activityStats, data);
    
    // Update any activity displays if they exist
    const activityElements = {
        mouseClicks: document.getElementById('mouseClicks'),
        keystrokes: document.getElementById('keystrokes'),
        activityPercent: document.getElementById('activityPercent')
    };
    
    Object.entries(activityElements).forEach(([key, element]) => {
        if (element && activityStats[key] !== undefined) {
            element.textContent = key === 'activityPercent' ? 
                Math.round(activityStats[key]) + '%' : 
                activityStats[key];
        }
    });
}

// === SCREENSHOT FUNCTIONALITY ===
async function loadRecentScreenshots() {
    const screenshotDate = document.getElementById('screenshotDate');
    const selectedDate = screenshotDate ? screenshotDate.value : new Date().toISOString().split('T')[0];
    
    try {
        showNotification('Loading screenshots...', 'info');
        
        if (!currentUser) {
            showNotification('Please log in to view screenshots', 'error');
            return;
        }

        // Fetch screenshots from main process
        const screenshots = await ipcRenderer.invoke('fetch-screenshots', {
            user_id: currentUser.id,
            date: selectedDate,
            limit: 20
        });

        displayScreenshots(screenshots);
        
        if (screenshots && screenshots.length > 0) {
            showNotification(`Loaded ${screenshots.length} screenshots`, 'success');
        } else {
            showNotification('No screenshots found for selected date', 'info');
        }
        
    } catch (error) {
        console.error('❌ Error loading screenshots:', error);
        showNotification('Failed to load screenshots', 'error');
        displayScreenshots([]);
    }
}

function displayScreenshots(screenshots) {
    const screenshotsPage = document.getElementById('screenshotsPage');
    if (!screenshotsPage) return;

    if (!screenshots || screenshots.length === 0) {
        screenshotsPage.innerHTML = `
            <div class="control-section">
                <div class="control-header">
                    <div class="control-title">Screenshots</div>
                    <div class="control-subtitle">View your recent activity screenshots</div>
                </div>
                
                <div style="text-align: center; padding: 60px 40px;">
                    <i data-lucide="camera" style="width: 64px; height: 64px; color: #94a3b8; margin-bottom: 24px;"></i>
                    <h3 style="color: #64748b; margin-bottom: 12px; font-size: 18px;">No screenshots found</h3>
                    <p style="color: #94a3b8; font-size: 14px;">Screenshots will appear here during active tracking sessions</p>
                </div>
            </div>
        `;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        return;
    }

    // Build screenshot grid
    let screenshotHTML = `
        <div class="control-section">
            <div class="control-header">
                <div class="control-title">Screenshots</div>
                <div class="control-subtitle">Recent activity captures (${screenshots.length} found)</div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 24px;">
    `;
    
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
            <div class="screenshot-item" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; transition: all 0.2s; cursor: pointer;" 
                 onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.1)'" 
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                 onclick="openScreenshot('${screenshot.image_url}')">
                <div style="width: 100%; height: 120px; background: #f1f5f9; border-radius: 8px; overflow: hidden; margin-bottom: 12px;">
                    <img src="${screenshot.image_url}" 
                         alt="Screenshot ${index + 1}" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div style=\\'display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 24px;\\'>📸</div>';">
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 13px; color: #64748b; font-weight: 500;">${timeString}</div>
                    <div style="font-size: 12px; color: #10b981; font-weight: 600;">${activityPercent}% active</div>
                </div>
            </div>
        `;
    });

    screenshotHTML += `
            </div>
        </div>
    `;

    screenshotsPage.innerHTML = screenshotHTML;
}

function openScreenshot(imageUrl) {
    if (imageUrl) {
        window.open(imageUrl, '_blank');
    }
}

// === NOTIFICATION SYSTEM ===
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    
    if (!notification || !notificationMessage) {
        console.log('📢', message);
        return;
    }

    // Set message and type
    notificationMessage.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show notification with animation
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
    
    console.log(`📢 [${type.toUpperCase()}] ${message}`);
}

function showError(message) {
    showNotification(message, 'error');
}

// === LOGOUT FUNCTIONALITY ===
async function logout() {
    console.log('👋 Logging out...');
    
    try {
        // Stop tracking if active
        if (isTracking) {
            await stopTracking();
        }
        
        // Clear session timer
        if (sessionTimer) {
            clearInterval(sessionTimer);
            sessionTimer = null;
        }
        
        // Clear user data
        localStorage.removeItem('timeflow_user');
        currentUser = null;
        isTracking = false;
        trackingStatus = 'stopped';
        sessionStartTime = null;
        
        // Sign out from Supabase
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        
        // Notify main process
        await ipcRenderer.invoke('user-logged-out');
        
        // Show login screen
        showLogin();
        showNotification('Logged out successfully', 'info');
        
        console.log('✅ Logout successful');
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        showNotification('Error during logout', 'error');
    }
}

// === UTILITY FUNCTIONS ===
function updateCurrentDate() {
    const dateElements = document.querySelectorAll('.current-date');
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    dateElements.forEach(element => {
        element.textContent = currentDate;
    });
}

// === ERROR HANDLING ===
window.addEventListener('error', (event) => {
    console.error('❌ UI Error:', event.error);
    showNotification('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled Promise Rejection:', event.reason);
    showNotification('An unexpected error occurred', 'error');
});

// === CLEANUP ===
window.addEventListener('beforeunload', () => {
    if (sessionTimer) {
        clearInterval(sessionTimer);
    }
});

console.log('📱 TimeFlow Desktop Agent Renderer loaded successfully');

// === MANUAL TESTING FUNCTIONS ===
async function testScreenshotCapture() {
    console.log('🧪 Testing screenshot capture manually...');
    showNotification('Testing screenshot capture...', 'info');
    
    try {
        const result = await ipcRenderer.invoke('test-screenshot');
        if (result && result.success) {
            showNotification('✅ Screenshot test successful!', 'success');
            console.log('✅ Screenshot test result:', result);
        } else {
            showNotification('❌ Screenshot test failed', 'error');
            console.error('❌ Screenshot test failed:', result);
        }
    } catch (error) {
        showNotification('❌ Screenshot test error: ' + error.message, 'error');
        console.error('❌ Screenshot test error:', error);
    }
}

async function triggerManualScreenshot() {
    console.log('📸 Triggering manual screenshot...');
    showNotification('Capturing screenshot...', 'info');
    
    try {
        const result = await ipcRenderer.invoke('manual-screenshot');
        if (result && result.success) {
            showNotification('✅ Manual screenshot captured!', 'success');
            console.log('✅ Manual screenshot result:', result);
            updateScreenshotGallery(); // Refresh gallery
        } else {
            showNotification('❌ Manual screenshot failed', 'error');
            console.error('❌ Manual screenshot failed:', result);
        }
    } catch (error) {
        showNotification('❌ Manual screenshot error: ' + error.message, 'error');
        console.error('❌ Manual screenshot error:', error);
    }
}

function addTestButtons() {
    // Add test buttons to the dashboard for debugging
    const dashboard = document.getElementById('dashboard');
    if (dashboard && currentUser) {
        const testButtonsHTML = `
            <div class="test-buttons" style="margin-top: 20px; padding: 15px; border: 2px dashed #4f46e5; border-radius: 8px; background: rgba(79, 70, 229, 0.05);">
                <h4 style="margin: 0 0 10px 0; color: #4f46e5; font-size: 14px;">🧪 Debug Tools</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="testScreenshotBtn" class="btn-secondary" style="font-size: 12px; padding: 6px 12px;">
                        🖼️ Test Screenshot
                    </button>
                    <button id="manualScreenshotBtn" class="btn-secondary" style="font-size: 12px; padding: 6px 12px;">
                        📸 Manual Screenshot
                    </button>
                    <button id="refreshGalleryBtn" class="btn-secondary" style="font-size: 12px; padding: 6px 12px;">
                        🔄 Refresh Gallery
                    </button>
                </div>
            </div>
        `;
        
        // Insert test buttons before screenshot gallery
        const screenshotSection = dashboard.querySelector('.screenshot-section');
        if (screenshotSection) {
            screenshotSection.insertAdjacentHTML('beforebegin', testButtonsHTML);
            
            // Add event listeners
            document.getElementById('testScreenshotBtn')?.addEventListener('click', testScreenshotCapture);
            document.getElementById('manualScreenshotBtn')?.addEventListener('click', triggerManualScreenshot);
            document.getElementById('refreshGalleryBtn')?.addEventListener('click', updateScreenshotGallery);
        }
    }
}

// Add this function after setupIpcListeners
function checkMacPermissions() {
    if (navigator.platform.includes('Mac')) {
        console.log('🍎 macOS detected - checking screen recording permissions...');
        
        // Add a permission check button for Mac users
        const settingsContent = document.querySelector('#settingsPage .grid');
        if (settingsContent) {
            const permissionCard = document.createElement('div');
            permissionCard.className = 'bg-white rounded-lg shadow p-6';
            permissionCard.innerHTML = `
                <h3 class="font-semibold text-gray-900 mb-2">🔒 macOS Permissions</h3>
                <p class="text-sm text-gray-600 mb-4">
                    On macOS, TimeFlow needs Screen Recording permission to capture screenshots.
                </p>
                <button id="checkPermissionsBtn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    Check Permissions
                </button>
                <div id="permissionStatus" class="mt-3 text-sm"></div>
            `;
            
            settingsContent.appendChild(permissionCard);
            
            // Add click handler
            document.getElementById('checkPermissionsBtn').addEventListener('click', async () => {
                const statusDiv = document.getElementById('permissionStatus');
                statusDiv.innerHTML = '<span class="text-blue-600">Checking permissions...</span>';
                
                try {
                    const result = await ipcRenderer.invoke('check-mac-permissions');
                    if (result.hasPermission) {
                        statusDiv.innerHTML = '<span class="text-green-600">✅ Screen Recording permission granted</span>';
                    } else {
                        statusDiv.innerHTML = `
                            <span class="text-red-600">❌ Screen Recording permission needed</span>
                            <br><span class="text-sm text-gray-600">
                                Please go to System Preferences > Security & Privacy > Privacy > Screen Recording
                                and enable TimeFlow
                            </span>
                        `;
                    }
                } catch (error) {
                    statusDiv.innerHTML = '<span class="text-red-600">❌ Permission check failed</span>';
                }
            });
        }
    }
}
