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
        
        // Get config from main process via IPC
        console.log('🔄 Desktop agent requesting config from main process...');
        
        const config = await ipcRenderer.invoke('get-config');
        
        console.log('✅ Config received from main process:', {
            hasUrl: !!config.supabase_url,
            hasKey: !!config.supabase_key,
            urlLength: config.supabase_url?.length || 0,
            keyLength: config.supabase_key?.length || 0,
            actualUrl: config.supabase_url,
            urlType: typeof config.supabase_url
        });
        
        // Validate config before creating client
        if (!config.supabase_url || !config.supabase_key) {
            throw new Error('Missing Supabase configuration from main process');
        }
        
        if (typeof config.supabase_url !== 'string' || !config.supabase_url.startsWith('http')) {
            throw new Error(`Invalid Supabase URL: ${config.supabase_url}`);
        }
        
        // Initialize Supabase client with validated config
        supabaseClient = supabase.createClient(config.supabase_url, config.supabase_key);
        console.log('✅ Supabase client initialized with main process config');
        
        // Test Supabase client configuration
        console.log('🔧 Supabase client configuration test:', {
            hasUrl: !!config.supabase_url,
            hasKey: !!config.supabase_key,
            urlLength: config.supabase_url?.length || 0,
            keyLength: config.supabase_key?.length || 0,
            clientMethods: {
                hasAuth: !!supabaseClient.auth,
                hasFrom: !!supabaseClient.from,
                hasSignInWithPassword: !!supabaseClient.auth?.signInWithPassword
            }
        });
        
        // Initialize the app
        initializeApp();
        setupEventListeners();
        setupIpcListeners();
        
        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Load remembered login data
        loadRememberedLoginData();
        
        // Update section moved to tray menu for cleaner interface
        
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
        
        // Skip Supabase client initialization if already created
        if (!supabaseClient) {
            console.log('✅ Using existing Supabase client from main initialization');
        } else {
            console.log('✅ Using existing Supabase client');
        }
        
        // Load remembered login data for form auto-fill
        loadRememberedLoginData();
        
        // Try to load saved user session first for auto-login
        const savedUserSession = await ipcRenderer.invoke('load-user-session');
        if (savedUserSession && savedUserSession.remember_me) {
            console.log('📂 Found saved user session, attempting auto-login...', {
                email: savedUserSession.email,
                remember_me: savedUserSession.remember_me
            });
            
            try {
                // Restore Supabase session with proper error handling
                const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
                    access_token: savedUserSession.access_token,
                    refresh_token: savedUserSession.refresh_token
                });
                
                if (!sessionError && sessionData.session && sessionData.user) {
                    // Get fresh user details from database
                    const { data: userDetails, error: userError } = await supabaseClient
                        .from('users')
                        .select('id, email, full_name, role')
                        .eq('id', sessionData.user.id)
                        .single();
                    
                    // Set current user from saved session
                    currentUser = {
                        id: sessionData.user.id,
                        email: sessionData.user.email,
                        name: userDetails ? userDetails.full_name : sessionData.user.email.split('@')[0],
                        role: userDetails ? userDetails.role : 'employee'
                    };
                    
                    console.log('👤 User restored from saved session:', currentUser);
                    
                    // Update localStorage for UI consistency
                    localStorage.setItem('timeflow_user', JSON.stringify(currentUser));
                    localStorage.setItem('timeflow_remember_email', currentUser.email);
                    localStorage.setItem('timeflow_remember_me', 'true');
                    
                    // Auto-login successful - go directly to main app
                    showMainApp();
                    showNotification('Welcome back! Automatically signed in.', 'success');
                    
                    console.log('✅ Auto-login successful');
                } else {
                    console.log('⚠️ Failed to restore session:', sessionError);
                    // Clear invalid session
                    await ipcRenderer.invoke('user-logged-out');
                    showLogin();
                }
            } catch (error) {
                console.error('❌ Auto-login error:', error);
                // Clear invalid session and show login
                await ipcRenderer.invoke('user-logged-out');
                showLogin();
            }
        } else {
            console.log('ℹ️ No saved user session found or remember me disabled, showing login form');
            showLogin();
        }
        
        // Add Mac permission check
        checkMacPermissions();
        
        console.log('✅ App initialization complete');
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showNotification('Failed to initialize app: ' + error.message, 'error');
        showLogin();
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
                
                // Load reports when navigating to reports page
                if (targetPage === 'reports') {
                    setTimeout(loadEmployeeReports, 100);
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
    
    // === PROJECT SELECTION EVENTS ===
    const projectSelect = document.getElementById('projectSelect');
    if (projectSelect) {
        projectSelect.addEventListener('change', handleProjectSelection);
    }
    
    const dashboardProjectSelect = document.getElementById('dashboardProjectSelect');
    if (dashboardProjectSelect) {
        dashboardProjectSelect.addEventListener('change', handleDashboardProjectSelection);
    }
    
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
    
    // Tracking state events from main process
    ipcRenderer.on('tracking-stopped', (event, data) => {
        console.log('🛑 [RENDERER] Tracking stopped event received from main process');
        isTracking = false;
        trackingStatus = 'stopped';
        sessionStartTime = null;
        
        // Update UI immediately
        updateTrackingButtons();
        updateTrackingStatus();
        updateSessionTime('--:--:--');
        
        // Stop session timer
        if (sessionTimer) {
            clearInterval(sessionTimer);
            sessionTimer = null;
            console.log('⏰ [RENDERER] Session timer stopped');
        }
        
        showNotification('Time tracking stopped', 'info');
    });
    
    ipcRenderer.on('tracking-paused', (event, data) => {
        console.log('⏸️ [RENDERER] Tracking paused event received from main process');
        isTracking = false;
        trackingStatus = 'paused';
        
        // Update UI
        updateTrackingButtons();
        updateTrackingStatus();
        
        // Stop session timer but keep start time
        if (sessionTimer) {
            clearInterval(sessionTimer);
            sessionTimer = null;
            console.log('⏰ [RENDERER] Session timer paused');
        }
        
        showNotification(`Time tracking paused${data?.reason ? ` (${data.reason})` : ''}`, 'info');
    });
    
    ipcRenderer.on('tracking-resumed', (event, data) => {
        console.log('▶️ [RENDERER] Tracking resumed event received from main process');
        isTracking = true;
        trackingStatus = 'active';
        
        // Update UI
        updateTrackingButtons();
        updateTrackingStatus();
        
        // Restart session timer
        startSessionTimer();
        
        showNotification('Time tracking resumed', 'success');
    });
    
    console.log('✅ IPC listeners set up successfully');
}

// === REMEMBER ME FUNCTIONALITY ===
function loadRememberedLoginData() {
    const rememberedEmail = localStorage.getItem('timeflow_remember_email');
    const rememberMeChecked = localStorage.getItem('timeflow_remember_me') === 'true';
    
    const emailInput = document.getElementById('loginEmail');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    
    if (emailInput && rememberedEmail && rememberMeChecked) {
        emailInput.value = rememberedEmail;
        console.log('📧 Auto-filled email from localStorage:', rememberedEmail);
    }
    
    if (rememberMeCheckbox && rememberMeChecked) {
        rememberMeCheckbox.checked = true;
        console.log('✅ Remember me checkbox restored');
    }
}

// === LOGIN FUNCTIONALITY ===
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginLoader = document.getElementById('loginLoader');
    const errorDiv = document.getElementById('loginError');

    console.log('🔐 Starting Supabase authentication...');
    console.log('📊 Login attempt details:', {
        email: email,
        passwordLength: password.length,
        supabaseClientExists: !!supabaseClient,
        rememberMe: rememberMe
    });

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

        console.log('📥 Supabase auth response:', {
            hasData: !!authData,
            hasError: !!authError,
            errorDetails: authError ? {
                message: authError.message,
                status: authError.status,
                code: authError.code,
                details: authError.details
            } : null,
            userData: authData ? {
                hasUser: !!authData.user,
                hasSession: !!authData.session,
                userId: authData.user?.id,
                userEmail: authData.user?.email
            } : null
        });

        if (authError) {
            console.error('🚨 Supabase authentication error details:', {
                message: authError.message,
                status: authError.status,
                code: authError.code,
                details: authError.details,
                stack: authError.stack
            });
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

        // Handle remember me functionality - save to localStorage for UI
        if (rememberMe) {
            localStorage.setItem('timeflow_remember_email', email);
            localStorage.setItem('timeflow_remember_me', 'true');
            console.log('💾 Login credentials remembered in localStorage');
        } else {
            localStorage.removeItem('timeflow_remember_email');
            localStorage.removeItem('timeflow_remember_me');
            console.log('🗑️ Login credentials cleared from localStorage');
        }

        // Prepare session data with complete user information
        const sessionData = {
            ...currentUser,
            session: {
                access_token: authData.session.access_token,
                refresh_token: authData.session.refresh_token,
                expires_at: authData.session.expires_at,
                user: authData.user
            },
            remember_me: rememberMe
        };

        console.log('📤 Sending user login data to main process:', {
            email: sessionData.email,
            remember_me: sessionData.remember_me,
            has_session: !!sessionData.session
        });

        // Notify main process about user login with session data
        const result = await ipcRenderer.invoke('user-logged-in', sessionData);
        console.log('✅ User login result:', result);

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
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const quickLoginBtn = document.getElementById('quickLoginBtn');
    const errorDiv = document.getElementById('loginError');

    console.log('🚀 Quick login initiated');

    // Reset error state
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }

    // Set demo credentials and enable remember me by default for quick login
    emailInput.value = 'employee@timeflow.com';
                    // Auto-fill removed for security
    if (rememberMeCheckbox) {
        rememberMeCheckbox.checked = true;
    }

    // Show loading state
    quickLoginBtn.disabled = true;
    const originalText = quickLoginBtn.textContent;
    quickLoginBtn.textContent = '🔄 Signing in...';

    try {
        // Authenticate with Supabase using demo credentials
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: 'employee@timeflow.com',
            password: '' // Password removed for security
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

        // Save remember me for quick login
        localStorage.setItem('timeflow_remember_email', 'employee@timeflow.com');
        localStorage.setItem('timeflow_remember_me', 'true');

        // Prepare session data for quick login with remember me enabled
        const sessionData = {
            ...currentUser,
            session: {
                access_token: authData.session.access_token,
                refresh_token: authData.session.refresh_token,
                expires_at: authData.session.expires_at,
                user: authData.user
            },
            remember_me: true // Quick login always remembers
        };

        console.log('📤 Sending quick login data to main process');

        // Notify main process
        const result = await ipcRenderer.invoke('user-logged-in', sessionData);
        console.log('✅ Quick login result:', result);

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
    
    // Load user projects for selection
    loadProjects();
    
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
    console.log('🎯 [RENDERER] startTracking() function called');
    
    if (!currentUser) {
        console.log('❌ [RENDERER] No current user, cannot start tracking');
        showNotification('Please log in first', 'error');
        return;
    }
    
    console.log('👤 [RENDERER] Current user:', currentUser);
    
    // Check if we're on the Time Tracker page and if a project is selected
    const currentPage = document.querySelector('.page-section.active');
    const isTimeTrackerPage = currentPage && currentPage.id === 'timetrackerPage';
    const isDashboardPage = currentPage && currentPage.id === 'dashboardPage';
    
    console.log('📄 [RENDERER] Current page check:', {
        currentPageId: currentPage?.id,
        isTimeTrackerPage,
        isDashboardPage
    });
    
    let selectedProjectId = null;
    
    if (isTimeTrackerPage) {
        const projectSelect = document.getElementById('projectSelect');
        const projectSelectError = document.getElementById('projectSelectError');
        
        console.log('🔍 [RENDERER] Time Tracker page - checking project selection');
        console.log('📋 [RENDERER] Project select element:', projectSelect);
        console.log('📋 [RENDERER] Project select value:', projectSelect?.value);
        
        if (!projectSelect || !projectSelect.value) {
            console.log('❌ [RENDERER] No project selected on Time Tracker page');
            // Show error message
            if (projectSelectError) {
                projectSelectError.style.display = 'block';
            }
            showNotification('Please select a project before starting tracking', 'error');
            return;
        }
        
        selectedProjectId = projectSelect.value;
        console.log('✅ [RENDERER] Time Tracker project selected:', selectedProjectId);
        
        // Hide error message if visible
        if (projectSelectError) {
            projectSelectError.style.display = 'none';
        }
    }
    
    if (isDashboardPage) {
        const dashboardProjectSelect = document.getElementById('dashboardProjectSelect');
        const dashboardProjectSelectError = document.getElementById('dashboardProjectSelectError');
        
        console.log('🔍 [RENDERER] Dashboard page - checking project selection');
        console.log('📋 [RENDERER] Dashboard project select element:', dashboardProjectSelect);
        console.log('📋 [RENDERER] Dashboard project select value:', dashboardProjectSelect?.value);
        
        if (!dashboardProjectSelect || !dashboardProjectSelect.value) {
            console.log('❌ [RENDERER] No project selected on Dashboard page');
            // Show error message
            if (dashboardProjectSelectError) {
                dashboardProjectSelectError.style.display = 'block';
            }
            showNotification('Please select a project before starting tracking', 'error');
            return;
        }
        
        selectedProjectId = dashboardProjectSelect.value;
        console.log('✅ [RENDERER] Dashboard project selected:', selectedProjectId);
        
        // Hide error message if visible
        if (dashboardProjectSelectError) {
            dashboardProjectSelectError.style.display = 'none';
        }
    }
    
    console.log('🎯 [RENDERER] Final selected project ID:', selectedProjectId);
    console.log('▶️ [RENDERER] Starting time tracking with project:', selectedProjectId);
    
    try {
        isTracking = true;
        trackingStatus = 'active';
        sessionStartTime = new Date();
        
        console.log('🔄 [RENDERER] Local state updated, calling main process...');
        
        // Update UI immediately
        updateTrackingButtons();
        updateTrackingStatus();
        
        // Start session timer
        startSessionTimer();
        
        console.log('📡 [RENDERER] About to call ipcRenderer.invoke with:', {
            method: 'start-tracking',
            projectId: selectedProjectId
        });
        
        // Notify main process with the selected project ID
        const result = await ipcRenderer.invoke('start-tracking', selectedProjectId);
        
        console.log('✅ [RENDERER] IPC call completed, result:', result);
        
        if (result && result.success) {
            console.log('🎉 [RENDERER] Tracking started successfully!');
            showNotification('⏱️ Time tracking started!', 'success');
        } else {
            console.log('❌ [RENDERER] Tracking start failed:', result);
            showNotification(result ? result.message : 'Failed to start tracking', 'error');
        }
        
    } catch (error) {
        console.error('❌ [RENDERER] Error starting tracking:', error);
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
        
        // For dashboard start button, check if project is selected
        const dashboardProjectSelect = document.getElementById('dashboardProjectSelect');
        const hasDashboardProjectSelected = dashboardProjectSelect && dashboardProjectSelect.value;
        
        if (startBtn) {
            startBtn.disabled = !hasDashboardProjectSelected;
            startBtn.innerHTML = '<i data-lucide="play" style="width: 20px; height: 20px;"></i><span>Start Tracking</span>';
            startBtn.title = hasDashboardProjectSelected ? '' : 'Select a project first';
        }
        if (pauseBtn) pauseBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = true;
        
        // For tracker start button, check if project is selected
        const projectSelect = document.getElementById('projectSelect');
        const hasProjectSelected = projectSelect && projectSelect.value;
        
        if (trackerStartBtn) {
            trackerStartBtn.disabled = !hasProjectSelected;
            trackerStartBtn.innerHTML = '<i data-lucide="play" style="width: 20px; height: 20px;"></i><span>Start</span>';
            trackerStartBtn.title = hasProjectSelected ? '' : 'Select a project first';
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
        const response = await ipcRenderer.invoke('fetch-screenshots', {
            user_id: currentUser.id,
            date: selectedDate,
            limit: 20
        });

        // Handle the new response format: { success: true, screenshots: [...] }
        const screenshots = response && response.success ? response.screenshots : [];
        
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

// Test buttons functionality removed for cleaner interface

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

// === PROJECT SELECTION FUNCTIONALITY ===
async function loadProjects() {
    if (!currentUser || !supabaseClient) {
        console.log('⚠️ Cannot load projects: user not logged in or Supabase not available');
        return;
    }
    
    console.log('🔄 Loading projects for user:', currentUser.id);
    
    try {
        // Query projects from employee_project_assignments
        const { data: assignments, error: assignmentError } = await supabaseClient
            .from('employee_project_assignments')
            .select(`
                project_id,
                projects (
                    id,
                    name,
                    description
                )
            `)
            .eq('user_id', currentUser.id);

        if (assignmentError) {
            console.error('❌ Error loading project assignments:', assignmentError);
            showNotification('Failed to load projects', 'error');
            return;
        }

        console.log('✅ Project assignments loaded:', assignments);
        
        const projectSelect = document.getElementById('projectSelect');
        const dashboardProjectSelect = document.getElementById('dashboardProjectSelect');
        
        // Clear existing options for both dropdowns
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">Choose a project to track time...</option>';
        }
        if (dashboardProjectSelect) {
            dashboardProjectSelect.innerHTML = '<option value="">Choose a project to track time...</option>';
        }
        
        if (!assignments || assignments.length === 0) {
            const noProjectsOption = '<option value="" disabled>No projects assigned</option>';
            if (projectSelect) projectSelect.innerHTML += noProjectsOption;
            if (dashboardProjectSelect) dashboardProjectSelect.innerHTML += noProjectsOption;
            showNotification('No projects assigned to your account', 'info');
            return;
        }
        
        // Add projects to both dropdowns
        assignments.forEach(assignment => {
            if (assignment.projects) {
                // Add to Time Tracker dropdown
                if (projectSelect) {
                    const option = document.createElement('option');
                    option.value = assignment.project_id;
                    option.textContent = assignment.projects.name;
                    projectSelect.appendChild(option);
                }
                
                // Add to Dashboard dropdown
                if (dashboardProjectSelect) {
                    const option = document.createElement('option');
                    option.value = assignment.project_id;
                    option.textContent = assignment.projects.name;
                    dashboardProjectSelect.appendChild(option);
                }
            }
        });
        
        console.log(`✅ Added ${assignments.length} projects to both dropdowns`);
        
    } catch (error) {
        console.error('❌ Error loading projects:', error);
        showNotification('Failed to load projects: ' + error.message, 'error');
    }
}

async function handleProjectSelection() {
    const projectSelect = document.getElementById('projectSelect');
    const projectSelectError = document.getElementById('projectSelectError');
    const selectedProjectInfo = document.getElementById('selectedProjectInfo');
    const selectedProjectName = document.getElementById('selectedProjectName');
    const trackerStartBtn = document.getElementById('trackerStartBtn');
    const trackerStatus = document.getElementById('trackerStatus');
    
    if (!projectSelect) return;
    
    const selectedProjectId = projectSelect.value;
    
    // Hide error message
    if (projectSelectError) {
        projectSelectError.style.display = 'none';
    }
    
    if (!selectedProjectId) {
        // No project selected
        if (selectedProjectInfo) {
            selectedProjectInfo.style.display = 'none';
        }
        if (trackerStartBtn) {
            trackerStartBtn.disabled = true;
            trackerStartBtn.title = 'Select a project first';
        }
        if (trackerStatus) {
            trackerStatus.textContent = 'Select a project to start tracking';
        }
        
        // Notify main process to clear project ID
        await ipcRenderer.invoke('set-project-id', null);
        return;
    }
    
    // Project selected
    const selectedOption = projectSelect.selectedOptions[0];
    const projectName = selectedOption.textContent;
    
    console.log('📋 Project selected:', { id: selectedProjectId, name: projectName });
    
    // Show selected project info
    if (selectedProjectInfo && selectedProjectName) {
        selectedProjectName.textContent = projectName;
        selectedProjectInfo.style.display = 'block';
    }
    
    // Enable start button if not tracking
    if (trackerStartBtn && trackingStatus === 'stopped') {
        trackerStartBtn.disabled = false;
        trackerStartBtn.title = '';
    }
    
    // Update status
    if (trackerStatus) {
        trackerStatus.textContent = trackingStatus === 'stopped' ? 
            'Ready to start tracking' : 
            trackingStatus === 'active' ? 'Currently tracking time' : 'Session paused';
    }
    
    // Notify main process about project selection
    try {
        await ipcRenderer.invoke('set-project-id', selectedProjectId);
        console.log('✅ Project ID sent to main process:', selectedProjectId);
        showNotification(`Project "${projectName}" selected`, 'success');
    } catch (error) {
        console.error('❌ Error setting project ID:', error);
        showNotification('Failed to set project', 'error');
    }
}

async function handleDashboardProjectSelection() {
    const dashboardProjectSelect = document.getElementById('dashboardProjectSelect');
    const dashboardProjectSelectError = document.getElementById('dashboardProjectSelectError');
    const dashboardSelectedProjectInfo = document.getElementById('dashboardSelectedProjectInfo');
    const dashboardSelectedProjectName = document.getElementById('dashboardSelectedProjectName');
    const startBtn = document.getElementById('startBtn');
    
    if (!dashboardProjectSelect) return;
    
    const selectedProjectId = dashboardProjectSelect.value;
    
    // Hide error message
    if (dashboardProjectSelectError) {
        dashboardProjectSelectError.style.display = 'none';
    }
    
    if (!selectedProjectId) {
        // No project selected
        if (dashboardSelectedProjectInfo) {
            dashboardSelectedProjectInfo.style.display = 'none';
        }
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.title = 'Select a project first';
        }
        
        // Notify main process to clear project ID
        await ipcRenderer.invoke('set-project-id', null);
        return;
    }
    
    // Project selected
    const selectedOption = dashboardProjectSelect.selectedOptions[0];
    const projectName = selectedOption.textContent;
    
    console.log('📋 Dashboard project selected:', { id: selectedProjectId, name: projectName });
    
    // Show selected project info
    if (dashboardSelectedProjectInfo && dashboardSelectedProjectName) {
        dashboardSelectedProjectName.textContent = projectName;
        dashboardSelectedProjectInfo.style.display = 'block';
    }
    
    // Enable start button if not tracking
    if (startBtn && trackingStatus === 'stopped') {
        startBtn.disabled = false;
        startBtn.title = '';
    }
    
    // Notify main process about project selection
    try {
        await ipcRenderer.invoke('set-project-id', selectedProjectId);
        console.log('✅ Dashboard project ID sent to main process:', selectedProjectId);
        showNotification(`Project "${projectName}" selected`, 'success');
    } catch (error) {
        console.error('❌ Error setting dashboard project ID:', error);
        showNotification('Failed to set project', 'error');
    }
}

// Debug functions removed - cleaner interface

// === REPORTS FUNCTIONALITY ===
async function loadEmployeeReports() {
    if (!currentUser) {
        console.log('⚠️ No user logged in, cannot load reports');
        return;
    }

    try {
        console.log('📊 Loading employee reports...');
        
        // Calculate date ranges
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const startOfMonth = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        // Get time logs for different periods
        const [todayLogs, weekLogs, monthLogs] = await Promise.all([
            getTimeLogsForPeriod(startOfToday, now),
            getTimeLogsForPeriod(startOfWeek, now),
            getTimeLogsForPeriod(startOfMonth, now)
        ]);

        // Get activity data (screenshots with activity metrics)
        const activityData = await getActivityData(startOfWeek, now);

        // Calculate totals
        const todayHours = calculateTotalHours(todayLogs);
        const weekHours = calculateTotalHours(weekLogs);
        const monthHours = calculateTotalHours(monthLogs);

        // Calculate average activity score
        const avgActivityScore = activityData.length > 0 
            ? Math.round(activityData.reduce((sum, activity) => sum + (activity.activity_percent || 0), 0) / activityData.length)
            : 0;

        // Update the reports page UI
        updateReportsDisplay({
            todayHours,
            weekHours,
            monthHours,
            avgActivityScore,
            todayLogs,
            weekLogs,
            activityData
        });

    } catch (error) {
        console.error('❌ Failed to load employee reports:', error);
        showNotification('Failed to load reports: ' + error.message, 'error');
    }
}

async function getTimeLogsForPeriod(startDate, endDate) {
    const { data, error } = await supabaseClient
        .from('time_logs')
        .select(`
            id,
            start_time,
            end_time,
            user_id,
            project_id,
            projects (name)
        `)
        .eq('user_id', currentUser.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: false });

    if (error) {
        console.error('Error fetching time logs:', error);
        return [];
    }

    return data || [];
}

async function getActivityData(startDate, endDate) {
    const { data, error } = await supabaseClient
        .from('screenshots')
        .select('activity_percent, focus_percent, captured_at, mouse_clicks, keystrokes, mouse_movements')
        .eq('user_id', currentUser.id)
        .gte('captured_at', startDate.toISOString())
        .lte('captured_at', endDate.toISOString())
        .order('captured_at', { ascending: false });

    if (error) {
        console.error('Error fetching activity data:', error);
        return [];
    }

    return data || [];
}

function calculateTotalHours(timeLogs) {
    let totalMs = 0;
    const now = new Date();
    
    timeLogs.forEach(log => {
        const start = new Date(log.start_time);
        // For active sessions (no end_time), use current time
        // For completed sessions, use the actual end_time
        const end = log.end_time ? new Date(log.end_time) : now;
        
        const duration = end.getTime() - start.getTime();
        
        // Only add positive durations and cap at 24 hours to avoid unrealistic values
        if (duration > 0) {
            const maxDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            totalMs += Math.min(duration, maxDuration);
        }
    });
    
    return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
}

function updateReportsDisplay(reportData) {
    const reportsPage = document.getElementById('reportsPage');
    if (!reportsPage) return;

    const { todayHours, weekHours, monthHours, avgActivityScore, todayLogs, weekLogs, activityData } = reportData;

    // Create comprehensive reports HTML
    reportsPage.innerHTML = `
        <div class="control-section">
            <div class="control-header">
                <div class="control-title">My Reports</div>
                <div class="control-subtitle">Your time tracking reports and productivity insights</div>
            </div>
            
            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 12px;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Today</div>
                    <div style="font-size: 28px; font-weight: 700;">${todayHours}h</div>
                    <div style="font-size: 12px; opacity: 0.8;">${todayLogs.length} sessions</div>
                </div>
                
                <div style="background: linear-gradient(135deg, #10b981, #047857); color: white; padding: 20px; border-radius: 12px;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">This Week</div>
                    <div style="font-size: 28px; font-weight: 700;">${weekHours}h</div>
                    <div style="font-size: 12px; opacity: 0.8;">${weekLogs.length} sessions</div>
                </div>
                
                <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px; border-radius: 12px;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">This Month</div>
                    <div style="font-size: 28px; font-weight: 700;">${monthHours}h</div>
                    <div style="font-size: 12px; opacity: 0.8;">Total tracked</div>
                </div>
                
                <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 12px;">
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Activity Score</div>
                    <div style="font-size: 28px; font-weight: 700;">${avgActivityScore}%</div>
                    <div style="font-size: 12px; opacity: 0.8;">Average activity</div>
                </div>
            </div>

            <!-- Recent Sessions -->
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1e293b;">Recent Sessions</h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <th style="text-align: left; padding: 12px 8px; font-size: 14px; color: #64748b; font-weight: 500;">Date</th>
                                <th style="text-align: left; padding: 12px 8px; font-size: 14px; color: #64748b; font-weight: 500;">Project</th>
                                <th style="text-align: left; padding: 12px 8px; font-size: 14px; color: #64748b; font-weight: 500;">Duration</th>
                                <th style="text-align: left; padding: 12px 8px; font-size: 14px; color: #64748b; font-weight: 500;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${generateSessionsTableRows(weekLogs.slice(0, 10))}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Activity Insights -->
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1e293b;">Activity Insights</h3>
                ${generateActivityInsights(activityData)}
            </div>
        </div>
    `;

    // Reinitialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function generateSessionsTableRows(timeLogs) {
    if (!timeLogs || timeLogs.length === 0) {
        return `
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">
                    No recent sessions found
                </td>
            </tr>
        `;
    }

    const now = new Date();
    
    return timeLogs.map(log => {
        const startTime = new Date(log.start_time);
        const endTime = log.end_time ? new Date(log.end_time) : null;
        
        // Calculate duration: if no end_time (active session), use current time
        const effectiveEndTime = endTime || now;
        const durationMs = effectiveEndTime.getTime() - startTime.getTime();
        
        // Convert to minutes and cap at reasonable values
        let duration = Math.round(durationMs / (1000 * 60));
        duration = Math.max(0, Math.min(duration, 24 * 60)); // Cap at 24 hours
        
        const projectName = log.projects?.name || 'Default Project';
        const status = log.end_time ? 'Completed' : 'Active';
        const statusColor = log.end_time ? '#10b981' : '#f59e0b';

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 8px; font-size: 14px; color: #1e293b;">
                    ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td style="padding: 12px 8px; font-size: 14px; color: #1e293b;">${projectName}</td>
                <td style="padding: 12px 8px; font-size: 14px; color: #1e293b;">
                    ${duration} min ${!log.end_time ? '(ongoing)' : ''}
                </td>
                <td style="padding: 12px 8px;">
                    <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500;">
                        ${status}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function generateActivityInsights(activityData) {
    if (!activityData || activityData.length === 0) {
        return `
            <div style="text-align: center; color: #64748b; padding: 20px;">
                No activity data available for this period
            </div>
        `;
    }

    const totalClicks = activityData.reduce((sum, activity) => sum + (activity.mouse_clicks || 0), 0);
    const totalKeystrokes = activityData.reduce((sum, activity) => sum + (activity.keystrokes || 0), 0);
    const totalMovements = activityData.reduce((sum, activity) => sum + (activity.mouse_movements || 0), 0);
    const avgFocusScore = Math.round(activityData.reduce((sum, activity) => sum + (activity.focus_percent || 0), 0) / activityData.length);

    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
            <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #3b82f6; margin-bottom: 4px;">${totalClicks.toLocaleString()}</div>
                <div style="font-size: 12px; color: #64748b;">Mouse Clicks</div>
            </div>
            
            <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #10b981; margin-bottom: 4px;">${totalKeystrokes.toLocaleString()}</div>
                <div style="font-size: 12px; color: #64748b;">Keystrokes</div>
            </div>
            
            <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #8b5cf6; margin-bottom: 4px;">${totalMovements.toLocaleString()}</div>
                <div style="font-size: 12px; color: #64748b;">Mouse Movements</div>
            </div>
            
            <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: 700; color: #f59e0b; margin-bottom: 4px;">${avgFocusScore}%</div>
                <div style="font-size: 12px; color: #64748b;">Avg Focus Score</div>
            </div>
        </div>
        
        <div style="margin-top: 20px; padding: 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
            <div style="color: #0369a1; font-size: 14px;">
                <strong>💡 Insight:</strong> 
                ${generateProductivityInsight(avgFocusScore, totalClicks, totalKeystrokes)}
            </div>
        </div>
    `;
}

function generateProductivityInsight(focusScore, clicks, keystrokes) {
    if (focusScore >= 80) {
        return "Excellent focus and productivity! Keep up the great work.";
    } else if (focusScore >= 60) {
        return "Good productivity levels. Consider taking short breaks to maintain focus.";
    } else if (focusScore >= 40) {
        return "Moderate activity detected. Try using productivity techniques like the Pomodoro method.";
    } else if (clicks > 0 || keystrokes > 0) {
        return "Some activity detected. Make sure you're actively working on important tasks.";
    } else {
        return "Low activity detected. Ensure you're actively using your computer during work sessions.";
    }
}

console.log('📱 TimeFlow Desktop Agent Renderer loaded successfully');
