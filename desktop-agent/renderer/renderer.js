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

// === UI PERFORMANCE OPTIMIZATION - CACHE DOM ELEMENTS ===
let cachedElements = null;

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Ebdaa Work Time Agent initializing...');
        
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
        console.log('🚀 Ebdaa Work Time Agent initializing...');
        
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
                    localStorage.setItem('ebdaa_user', JSON.stringify(currentUser));
                    localStorage.setItem('ebdaa_remember_email', currentUser.email);
                    localStorage.setItem('ebdaa_remember_me', 'true');
                    
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
    
    // === NAVIGATION EVENTS - PERFORMANCE OPTIMIZED ===
    const navItems = document.querySelectorAll('.nav-item');
    
    // Debounce function to prevent rapid tab switching
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Safe request idle callback with fallback
    function safeRequestIdleCallback(callback) {
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(callback);
        } else {
            // Fallback to setTimeout for compatibility
            setTimeout(callback, 100);
        }
    }
    
    // Optimized navigation handler with debouncing
    const handleNavigation = debounce((targetPage) => {
        console.time('navClick');
        
        showPage(targetPage);
        updatePageTitle(targetPage);
        
        // Lazy load heavy content only when needed (with fallback)
        safeRequestIdleCallback(() => {
            if (targetPage === 'screenshots') {
                loadRecentScreenshots();
            } else if (targetPage === 'reports') {
                loadEmployeeReports();
            }
        });
        
        console.timeEnd('navClick');
    }, 50); // 50ms debounce - more responsive while still preventing issues
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = item.getAttribute('data-page');
            if (targetPage) {
                handleNavigation(targetPage);
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
    
    // Add performance monitoring for tab switching
    addPerformanceMonitoring();
}

// === PERFORMANCE MONITORING ===
function addPerformanceMonitoring() {
    let tabSwitchTimes = [];
    
    // Override console.time and console.timeEnd to track performance
    const originalTimeEnd = console.timeEnd;
    console.timeEnd = function(label) {
        if (label === 'showPage' || label === 'navClick') {
            const endTime = performance.now();
            
            // Calculate duration manually since we can't access the original timer
            if (label === 'showPage') {
                tabSwitchTimes.push(endTime);
                if (tabSwitchTimes.length > 10) {
                    tabSwitchTimes.shift(); // Keep only last 10 measurements
                }
                
                // Show performance stats every 5 tab switches
                if (tabSwitchTimes.length % 5 === 0) {
                    const avgTime = tabSwitchTimes.reduce((a, b) => a + b, 0) / tabSwitchTimes.length;
                    console.log(`🚀 Tab Switch Performance: Recent switches averaged ${avgTime.toFixed(1)}ms`);
                }
            }
        }
        
        return originalTimeEnd.call(this, label);
    };
    
    // Add keyboard shortcuts for tab switching
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Number for quick tab switching
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const tabMap = {
                '1': 'dashboard',
                '2': 'timetracker', 
                '3': 'screenshots',
                '4': 'reports'
            };
            
            const targetPage = tabMap[e.key];
            if (targetPage) {
                showPage(targetPage);
                updatePageTitle(targetPage);
                console.log(`⌨️ Quick switch to ${targetPage} via keyboard`);
            }
        }
    });
    
    console.log('📊 Performance monitoring enabled - Tab switching times will be logged');
    console.log('⌨️ Keyboard shortcuts enabled: Ctrl/Cmd + 1-4 for quick tab switching');
}

// === IPC LISTENERS ===
function setupIpcListeners() {
    console.log('🔧 Setting up IPC listeners...');
    
    // Listen for tracking status updates from main process
    ipcRenderer.on('tracking-status-changed', (event, data) => {
        console.log('📊 Tracking status changed:', data);
        isTracking = data.isTracking;
        updateTrackingStatus();
        updateTrackingButtons();
    });
    
    // Listen for activity updates from main process
    ipcRenderer.on('activity-update', (event, data) => {
        console.log('📊 Activity update received:', data);
        updateActivityStats(data);
    });
    
    // Listen for screenshot capture events
    ipcRenderer.on('screenshot-captured', (event, data) => {
        console.log('📸 Screenshot captured:', data);
        showNotification('Screenshot captured', 'success');
    });
    
    // Listen for app updates
    ipcRenderer.on('update-available', (event, data) => {
        console.log('🔄 Update available:', data);
        showNotification('Update available! Check the tray menu to download.', 'info');
    });
    
    // DISABLED: System check trigger to prevent duplicate dialogs
    // The simple permission dialog in main process handles all permission checks
    // ipcRenderer.on('trigger-system-check-after-login', (event, data) => {
    //     console.log('🔍 System check trigger received:', data);
    //     if (data.autoShow) {
    //         setTimeout(() => {
    //             showSystemCheckPrompt();
    //         }, 2000);
    //     }
    // });
    
    console.log('✅ IPC listeners set up');
}

// === REMEMBER ME FUNCTIONALITY ===
function loadRememberedLoginData() {
    const rememberedEmail = localStorage.getItem('ebdaa_remember_email');
    const rememberMeChecked = localStorage.getItem('ebdaa_remember_me') === 'true';
    
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
        localStorage.setItem('ebdaa_user', JSON.stringify(currentUser));

        // Handle remember me functionality - save to localStorage for UI
        if (rememberMe) {
            localStorage.setItem('ebdaa_remember_email', email);
            localStorage.setItem('ebdaa_remember_me', 'true');
            console.log('💾 Login credentials remembered in localStorage');
        } else {
            localStorage.removeItem('ebdaa_remember_email');
            localStorage.removeItem('ebdaa_remember_me');
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

    // Get credentials from form inputs
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        showNotification('Please enter both email and password', 'error');
        return;
    }

    if (rememberMeCheckbox) {
        rememberMeCheckbox.checked = true;
    }

    // Show loading state
    quickLoginBtn.disabled = true;
    const originalText = quickLoginBtn.textContent;
    quickLoginBtn.textContent = '🔄 Signing in...';

    try {
        // Authenticate with Supabase using form credentials
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
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
        localStorage.setItem('ebdaa_user', JSON.stringify(currentUser));

        // Save remember me for quick login
        localStorage.setItem('ebdaa_remember_email', email);
        localStorage.setItem('ebdaa_remember_me', 'true');

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
        showNotification('🚀 Welcome to Ebdaa Work Time! Ready to track your time.', 'success');
        
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

// === UI STATE MANAGEMENT - PERFORMANCE OPTIMIZED ===

function validateCache() {
    if (!cachedElements) return false;
    
    // Check if cached elements still exist in DOM
    for (const [pageId, element] of Object.entries(cachedElements.pages)) {
        if (!document.contains(element)) {
            console.warn(`🔄 Cache stale for ${pageId}, reinitializing...`);
            cachedElements = null; // Force reinit
            return false;
        }
    }
    return true;
}

function initializeUICache() {
    if (cachedElements && validateCache()) return cachedElements;
    
    console.log('🚀 Initializing UI element cache for better performance...');
    
    cachedElements = {
        pages: {},
        navItems: {},
        currentActivePage: null,
        currentActiveNav: null
    };
    
    // Cache all page sections
    document.querySelectorAll('.page-section').forEach(section => {
        const pageId = section.id.replace('Page', '');
        cachedElements.pages[pageId] = section;
        
        // Track currently active page
        if (section.classList.contains('active')) {
            cachedElements.currentActivePage = section;
        }
    });
    
    // Cache all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        const pageId = item.getAttribute('data-page');
        if (pageId) {
            cachedElements.navItems[pageId] = item;
            
            // Track currently active nav
            if (item.classList.contains('active')) {
                cachedElements.currentActiveNav = item;
            }
        }
    });
    
    console.log('✅ UI cache initialized:', {
        pages: Object.keys(cachedElements.pages).length,
        navItems: Object.keys(cachedElements.navItems).length
    });
    
    return cachedElements;
}

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
    
    // Initialize UI cache for performance
    initializeUICache();
    
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

// PERFORMANCE OPTIMIZED: Fast tab switching with cached elements
function showPage(pageId) {
    console.time('showPage');
    
    // Initialize cache if not already done and validate it
    const cache = initializeUICache();
    
    // Validate cache before proceeding
    if (!validateCache()) {
        console.log('🔄 Cache validation failed, reinitializing...');
        initializeUICache();
    }
    
    // Early return if already on the target page
    if (cache.currentActivePage && cache.currentActivePage.id === pageId + 'Page') {
        console.log('📄 Already on page:', pageId);
        console.timeEnd('showPage');
        return;
    }
    
    // Hide current active page (single operation instead of looping through all)
    if (cache.currentActivePage) {
        cache.currentActivePage.classList.remove('active');
    }
    
    // Remove active state from current nav item (single operation)
    if (cache.currentActiveNav) {
        cache.currentActiveNav.classList.remove('active');
    }
    
    // Show target page using cached element
    const targetPage = cache.pages[pageId];
    if (targetPage) {
        targetPage.classList.add('active');
        cache.currentActivePage = targetPage;
    } else {
        console.warn('⚠️ Page not found in cache:', pageId);
        // Fallback to original method
        const fallbackPage = document.getElementById(pageId + 'Page');
        if (fallbackPage) {
            fallbackPage.classList.add('active');
            cache.currentActivePage = fallbackPage;
            cache.pages[pageId] = fallbackPage; // Update cache
        }
    }
    
    // Add active state to corresponding nav item using cached element
    const navItem = cache.navItems[pageId];
    if (navItem) {
        navItem.classList.add('active');
        cache.currentActiveNav = navItem;
    } else {
        console.warn('⚠️ Nav item not found in cache:', pageId);
        // Fallback to original method
        const fallbackNav = document.querySelector(`[data-page="${pageId}"]`);
        if (fallbackNav) {
            fallbackNav.classList.add('active');
            cache.currentActiveNav = fallbackNav;
            cache.navItems[pageId] = fallbackNav; // Update cache
        }
    }
    
    console.log('📄 Switched to page:', pageId);
    console.timeEnd('showPage');
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

// === TIME TRACKING FUNCTIONALITY ===
async function startTracking() {
    console.log('🎯 [RENDERER] startTracking() function called');
    
    if (!currentUser) {
        console.log('❌ [RENDERER] No current user, cannot start tracking');
        showNotification('Please log in first', 'error');
        return;
    }

    // === STEP 1: FRIENDLY HEALTH CHECK ===
    console.log('🏥 [HEALTH-CHECK] Starting comprehensive system health check...');
    
    // Show welcome health check notification
    showNotification('👋 Welcome to TimeFlow! Running system health check...', 'info');
    
    try {
        // Show health check modal
        showHealthCheckModal();
        
        const healthCheckResult = await performComprehensiveHealthCheck();
        
        if (!healthCheckResult.canStartTimer) {
            showNotification('⛔ Timer start blocked due to critical system failures. Please check system status.', 'error');
            hideHealthCheckModal();
            return;
        }
        
        if (healthCheckResult.isHealthy) {
            showNotification('🎉 All Systems Healthy! ✅ Screenshots ✅ URL Tracking ✅ App Detection ✅ Database - Ready to track!', 'success');
        } else {
            showNotification(`🟡 Timer starting with ${healthCheckResult.failedFeatures.length} warnings - some features may be limited`, 'info');
        }
        
        // Modal will be hidden by the health check function itself after showing results
        
        // Brief delay to show success message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
    } catch (error) {
        console.error('❌ [HEALTH-CHECK] Health check failed:', error);
        showNotification('⚠️ Health check failed - some features may not work properly', 'error');
        // Modal will be hidden by the health check function itself after showing error
    }
    
    // INSTANT: Skip delay - IPC handlers are ready immediately after health check
    console.log('⚡ [RENDERER] IPC handlers ready, proceeding immediately...');
    
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
    console.log('🔄 [RENDERER] Calling main process to start tracking...');
    
    try {
        // Notify main process with the selected project ID
        const result = await ipcRenderer.invoke('start-tracking', selectedProjectId);
        
        console.log('✅ [RENDERER] IPC call completed, result:', result);
        
        if (result && result.success) {
            // ✅ Only mark tracking active after success
            isTracking = true;
            trackingStatus = 'active';
            sessionStartTime = new Date();

            // Update UI
            updateTrackingButtons();
            updateTrackingStatus();
            startSessionTimer();
            console.log('🎉 [RENDERER] Tracking started successfully!');
            showNotification('⏱️ Time tracking started!', 'success');
        } else {
            console.log('❌ [RENDERER] Tracking start failed:', result);
            showNotification(result ? result.message : 'Failed to start tracking', 'error');

            // 🔄 Revert UI/state because tracking actually failed
            isTracking = false;
            trackingStatus = 'stopped';
            sessionStartTime = null;
            if (sessionTimer) {
              clearInterval(sessionTimer);
              sessionTimer = null;
            }
            updateTrackingButtons();
            updateTrackingStatus();
            updateSessionTime('--:--:--');
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
    // Always clear any existing timer first
    if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
    }
    
    // Only start if we're actually tracking and have a start time
    if (!isTracking || !sessionStartTime) {
        console.log('⚠️ Skipping timer start - not tracking or no start time');
        return;
    }
    
    console.log('⏰ Starting session timer with start time:', sessionStartTime);
    
    sessionTimer = setInterval(() => {
        if (isTracking && sessionStartTime) {
            const elapsed = Date.now() - sessionStartTime.getTime();
            const timeString = formatElapsedTime(elapsed);
            updateSessionTime(timeString);
        } else {
            // Stop timer if tracking stopped
            clearInterval(sessionTimer);
            sessionTimer = null;
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
        localStorage.removeItem('ebdaa_user');
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

// === SYSTEM CHECK FUNCTIONALITY ===
function showSystemCheckPrompt() {
    console.log('🔧 Showing system check prompt for desktop agent');
    
    // Create system check popup overlay
    const overlay = document.createElement('div');
    overlay.id = 'systemCheckOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
    `;
    
    // Create popup content
    const popup = document.createElement('div');
    popup.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: fadeInScale 0.3s ease-out;
    `;
    
    popup.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">🔧</div>
        <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
            System Check Recommended
        </h2>
        <p style="color: #64748b; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            Welcome to Ebdaa Work Time! Let's verify that all tracking components are working properly before you start your session.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="runSystemCheckBtn" style="
                background: #3b82f6;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.2s;
            ">
                Run System Check
            </button>
            <button id="skipSystemCheckBtn" style="
                background: #f1f5f9;
                color: #64748b;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.2s;
            ">
                Skip for Now
            </button>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 16px; margin-bottom: 0;">
            This will open the Debug Console to test all tracking components
        </p>
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInScale {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        #runSystemCheckBtn:hover {
            background: #2563eb !important;
        }
        #skipSystemCheckBtn:hover {
            background: #e2e8f0 !important;
        }
    `;
    document.head.appendChild(style);
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Handle button clicks
    document.getElementById('runSystemCheckBtn').addEventListener('click', () => {
        console.log('🔬 User chose to run system check');
        
        // Mark as checked to start cooldown
        localStorage.setItem('ebdaa_system_check_desktop', Date.now().toString());
        
        // Open debug console
        ipcRenderer.invoke('open-debug-console').then(() => {
            showNotification('Debug Console opened! Check all system components.', 'success');
        }).catch(error => {
            console.error('Failed to open debug console:', error);
            showNotification('Could not open Debug Console. Try Cmd+Shift+D manually.', 'error');
        });
        
        // Close popup
        document.body.removeChild(overlay);
    });
    
    document.getElementById('skipSystemCheckBtn').addEventListener('click', () => {
        console.log('⏭️ User chose to skip system check');
        
        // Mark as checked to start cooldown (shorter for skip)
        localStorage.setItem('ebdaa_system_check_desktop', Date.now().toString());
        
        showNotification('System check skipped. You can access it anytime via Cmd+Shift+D', 'info');
        
        // Close popup
        document.body.removeChild(overlay);
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
}

console.log('📱 Ebdaa Work Time Agent Renderer loaded successfully');

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
                    On macOS, Ebdaa Work Time needs Screen Recording permission to capture screenshots.
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
                                and enable Ebdaa Work Time
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

// === HEALTH CHECK SYSTEM ===
async function performComprehensiveHealthCheck() {
    console.log('🏥 [HEALTH-CHECK] Starting comprehensive feature verification...');
    
    const healthStatus = {
        screenshots: false,
        urlDetection: false,
        appDetection: false,
        fraudDetection: false,
        databaseConnection: false,
        lastCheck: new Date(),
        errorDetails: {}
    };
    
    const failedFeatures = [];
    
    try {
        // Start all tests in parallel for faster execution
        updateHealthCheckProgress('Running comprehensive system tests...', 50);
        
        // Set all features to testing state
        updateHealthCheckFeatureStatus('screenshot', 'testing');
        updateHealthCheckFeatureStatus('url', 'testing');
        updateHealthCheckFeatureStatus('app', 'testing');
        updateHealthCheckFeatureStatus('fraud', 'testing');
        updateHealthCheckFeatureStatus('database', 'testing');
        
        // Run all tests simultaneously
        const [screenshotTest, urlTest, appTest, fraudTest, dbTest] = await Promise.all([
            ipcRenderer.invoke('test-screenshot-capability').catch(err => ({ success: false, error: err.message })),
            ipcRenderer.invoke('test-url-detection').catch(err => ({ success: false, error: err.message })),
            ipcRenderer.invoke('test-app-detection').catch(err => ({ success: false, error: err.message })),
            ipcRenderer.invoke('test-fraud-detection').catch(err => ({ success: false, error: err.message })),
            ipcRenderer.invoke('test-database-connection').catch(err => ({ success: false, error: err.message }))
        ]);
        
        // Process results
        const tests = [
            { name: 'screenshots', test: screenshotTest, id: 'screenshot', icon: '📸' },
            { name: 'urlDetection', test: urlTest, id: 'url', icon: '🌐' },
            { name: 'appDetection', test: appTest, id: 'app', icon: '🖥️' },
            { name: 'fraudDetection', test: fraudTest, id: 'fraud', icon: '🛡️' },
            { name: 'databaseConnection', test: dbTest, id: 'database', icon: '💾' }
        ];
        
        tests.forEach(({ name, test, id, icon }) => {
            healthStatus[name] = test.success;
            if (!test.success) {
                failedFeatures.push(name);
                healthStatus.errorDetails[name] = test.error || `${name} test failed`;
                updateHealthCheckFeatureStatus(id, 'fail', test.error);
            } else {
                updateHealthCheckFeatureStatus(id, 'pass');
            }
            console.log(`${icon} [HEALTH-CHECK] ${name} test:`, test.success ? '✅ PASS' : '❌ FAIL');
        });
        
        const isHealthy = failedFeatures.length === 0;
        const criticalFeatures = ['databaseConnection'];
        const canStartTimer = !failedFeatures.some(feature => criticalFeatures.includes(feature));
        
        // Show errors if any
        const errors = Object.entries(healthStatus.errorDetails).map(([feature, error]) => 
            `${feature}: ${error}`
        );
        
        if (errors.length > 0) {
            showHealthCheckErrors(errors);
        }
        
        console.log('🏥 [HEALTH-CHECK] Results:', {
            isHealthy,
            failedFeatures,
            canStartTimer,
            errorCount: Object.keys(healthStatus.errorDetails).length
        });
        
        // Show final results - quick display
        updateHealthCheckProgress(
            isHealthy ? 
                '✅ All systems working perfectly!' : 
                `⚠️ ${failedFeatures.length} issues found. ${canStartTimer ? 'Timer can still start.' : 'Timer blocked due to critical issues.'}`,
            100
        );
        
        // Quick display of results before closing
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Close modal after showing results
        hideHealthCheckModal();
        
        return {
            isHealthy,
            failedFeatures,
            details: healthStatus,
            canStartTimer
        };
        
    } catch (error) {
        console.error('❌ [HEALTH-CHECK] Comprehensive check failed:', error);
        updateHealthCheckProgress('❌ Health check system failed: ' + error.message, 100);
        
        // Brief display of error before closing
        await new Promise(resolve => setTimeout(resolve, 1000));
        hideHealthCheckModal();
        
        return {
            isHealthy: false,
            failedFeatures: ['healthCheckSystem'],
            details: healthStatus,
            canStartTimer: false
        };
    }
}

// === ENHANCED HEALTH CHECK MODAL WITH BETTER VISIBILITY ===
function showHealthCheckModal() {
    console.log('🏥 [HEALTH-CHECK] Creating health check modal...');
    
    // Remove existing modal if any
    const existingModal = document.getElementById('healthCheckModal');
    if (existingModal) {
        existingModal.remove();
        console.log('🗑️ [HEALTH-CHECK] Removed existing modal');
    }
    
    // Create modal with enhanced styling
    const modal = document.createElement('div');
    modal.id = 'healthCheckModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        backdrop-filter: blur(4px);
        animation: fadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div class="health-check-modal" style="
            background: white;
            border-radius: 16px;
            padding: 24px;
            max-width: 700px;
            width: 90%;
            max-height: 70vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease-out;
            position: relative;
        ">
            <div class="health-check-header" style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 32px; margin-bottom: 12px;">🏥</div>
                <h3 style="margin: 0 0 6px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
                    System Health Check
                </h3>
                <p style="color: #64748b; margin: 0; font-size: 13px;">
                    Verifying all features before starting timer...
                </p>
            </div>
            
            <div class="health-check-content">
                <div class="health-check-progress" style="margin-bottom: 16px;">
                    <div class="progress-bar" style="
                        width: 100%;
                        height: 6px;
                        background: #e2e8f0;
                        border-radius: 3px;
                        overflow: hidden;
                        margin-bottom: 8px;
                    ">
                        <div class="progress-fill" id="healthProgressFill" style="
                            height: 100%;
                            background: linear-gradient(90deg, #3b82f6, #06b6d4);
                            border-radius: 3px;
                            width: 0%;
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                    <div class="progress-text" id="healthProgressText" style="
                        color: #64748b;
                        font-size: 12px;
                        text-align: center;
                    ">Initializing health check...</div>
                </div>
                
                <div class="health-check-features" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div class="feature-item" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 16px;
                        background: #f8fafc;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                        transition: all 0.2s ease;
                    ">
                        <div style="
                            width: 48px;
                            height: 48px;
                            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            flex-shrink: 0;
                        ">📸</div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; color: #1e293b; font-size: 14px; margin-bottom: 2px;">Screenshot Capture</div>
                            <div id="screenshotStatusText" style="font-size: 12px; color: #64748b;">Checking...</div>
                        </div>
                        <span class="feature-status" id="screenshotStatus" style="font-size: 18px;">⏳</span>
                    </div>
                    
                    <div class="feature-item" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 16px;
                        background: #f8fafc;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                        transition: all 0.2s ease;
                    ">
                        <div style="
                            width: 48px;
                            height: 48px;
                            background: linear-gradient(135deg, #10b981, #059669);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            flex-shrink: 0;
                        ">🌐</div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; color: #1e293b; font-size: 14px; margin-bottom: 2px;">URL Detection</div>
                            <div id="urlStatusText" style="font-size: 12px; color: #64748b;">Checking...</div>
                        </div>
                        <span class="feature-status" id="urlStatus" style="font-size: 18px;">⏳</span>
                    </div>
                    
                    <div class="feature-item" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 16px;
                        background: #f8fafc;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                        transition: all 0.2s ease;
                    ">
                        <div style="
                            width: 48px;
                            height: 48px;
                            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            flex-shrink: 0;
                        ">🖥️</div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; color: #1e293b; font-size: 14px; margin-bottom: 2px;">App Detection</div>
                            <div id="appStatusText" style="font-size: 12px; color: #64748b;">Checking...</div>
                        </div>
                        <span class="feature-status" id="appStatus" style="font-size: 18px;">⏳</span>
                    </div>
                    
                    <div class="feature-item" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 16px;
                        background: #f8fafc;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                        transition: all 0.2s ease;
                    ">
                        <div style="
                            width: 48px;
                            height: 48px;
                            background: linear-gradient(135deg, #ef4444, #dc2626);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            flex-shrink: 0;
                        ">🛡️</div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; color: #1e293b; font-size: 14px; margin-bottom: 2px;">Fraud Detection</div>
                            <div id="fraudStatusText" style="font-size: 12px; color: #64748b;">Checking...</div>
                        </div>
                        <span class="feature-status" id="fraudStatus" style="font-size: 18px;">⏳</span>
                    </div>
                    
                    <div class="feature-item" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 16px;
                        background: #f8fafc;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                        transition: all 0.2s ease;
                    ">
                        <div style="
                            width: 48px;
                            height: 48px;
                            background: linear-gradient(135deg, #f59e0b, #d97706);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            flex-shrink: 0;
                        ">💾</div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; color: #1e293b; font-size: 14px; margin-bottom: 2px;">Database Connection</div>
                            <div id="databaseStatusText" style="font-size: 12px; color: #64748b;">Checking...</div>
                        </div>
                        <span class="feature-status" id="databaseStatus" style="font-size: 18px;">⏳</span>
                    </div>
                </div>
                
                <div id="healthCheckErrors" style="
                    margin-top: 20px;
                    padding: 16px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    display: none;
                ">
                    <h4 style="margin: 0 0 12px 0; color: #dc2626; font-size: 16px; font-weight: 600;">
                        ⚠️ Issues Detected
                    </h4>
                    <div id="healthCheckErrorList" style="color: #dc2626; font-size: 14px;"></div>
                    <div style="margin-top: 12px;">
                        <button id="showPermissionHelp" style="
                            background: #dc2626;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            font-size: 14px;
                            cursor: pointer;
                            margin-right: 8px;
                        ">Fix Permissions</button>
                        <button id="continueAnyway" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 6px;
                            font-size: 14px;
                            cursor: pointer;
                        ">Continue Anyway</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { 
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            to { 
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    console.log('✅ [HEALTH-CHECK] Health check modal created and displayed');
    
    // Add event listeners for error handling buttons
    const showPermissionHelp = document.getElementById('showPermissionHelp');
    const continueAnyway = document.getElementById('continueAnyway');
    
    if (showPermissionHelp) {
        showPermissionHelp.addEventListener('click', () => {
            console.log('🔧 [HEALTH-CHECK] User requested permission help');
            hideHealthCheckModal();
            showPermissionFixDialog();
        });
    }
    
    if (continueAnyway) {
        continueAnyway.addEventListener('click', () => {
            console.log('⚠️ [HEALTH-CHECK] User chose to continue anyway');
            hideHealthCheckModal();
            showNotification('⚠️ Continuing with limited functionality', 'info');
        });
    }
}

function updateHealthCheckProgress(text, percentage) {
    const progressFill = document.getElementById('healthProgressFill');
    const progressText = document.getElementById('healthProgressText');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = text;
    }
    
    console.log(`🏥 [HEALTH-CHECK] Progress: ${percentage}% - ${text}`);
}

function updateHealthCheckFeatureStatus(featureId, status, errorMessage = null) {
    const statusElement = document.getElementById(`${featureId}Status`);
    const statusTextElement = document.getElementById(`${featureId}StatusText`);
    
    if (!statusElement) return;
    
    switch (status) {
        case 'pass':
            statusElement.textContent = '✅';
            statusElement.title = 'Working correctly';
            if (statusTextElement) statusTextElement.textContent = '✅ Working perfectly';
            break;
        case 'fail':
            statusElement.textContent = '❌';
            statusElement.title = errorMessage || 'Not working';
            if (statusTextElement) statusTextElement.textContent = `❌ ${errorMessage || 'Failed'}`;
            break;
        case 'warning':
            statusElement.textContent = '⚠️';
            statusElement.title = errorMessage || 'Limited functionality';
            if (statusTextElement) statusTextElement.textContent = `⚠️ ${errorMessage || 'Warning'}`;
            break;
        default:
            statusElement.textContent = '⏳';
            statusElement.title = 'Testing...';
            if (statusTextElement) statusTextElement.textContent = 'Testing...';
    }
    
    console.log(`🏥 [HEALTH-CHECK] Feature ${featureId}: ${status} ${errorMessage ? `(${errorMessage})` : ''}`);
}

function showHealthCheckErrors(errors) {
    const errorsContainer = document.getElementById('healthCheckErrors');
    const errorsList = document.getElementById('healthCheckErrorList');
    
    if (!errorsContainer || !errorsList || errors.length === 0) return;
    
    errorsList.innerHTML = errors.map(error => `<div>• ${error}</div>`).join('');
    errorsContainer.style.display = 'block';
    
    console.log('🚨 [HEALTH-CHECK] Showing errors:', errors);
}

function hideHealthCheckModal() {
    const modal = document.getElementById('healthCheckModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
            console.log('✅ [HEALTH-CHECK] Health check modal hidden');
        }, 300);
    }
}

function showPermissionFixDialog() {
    console.log('🔧 [PERMISSION-FIX] Showing permission fix dialog');
    
    const dialog = document.createElement('div');
    dialog.id = 'permissionFixDialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        backdrop-filter: blur(4px);
    `;
    
    dialog.innerHTML = `
        <div style="
            background: white;
            border-radius: 16px;
            padding: 32px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
        ">
            <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
            <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
                Permissions Required
            </h3>
            <p style="color: #64748b; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                Ebdaa Work Time needs additional permissions to track apps and URLs. Please follow these steps:
            </p>
            <div style="text-align: left; background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <div style="margin-bottom: 12px;">
                    <strong>1. Screen Recording Permission:</strong><br>
                    <span style="color: #64748b;">System Preferences → Privacy & Security → Screen Recording</span>
                </div>
                <div>
                    <strong>2. Accessibility Permission:</strong><br>
                    <span style="color: #64748b;">System Preferences → Privacy & Security → Accessibility</span>
                </div>
            </div>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="openSystemPrefs" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                ">Open System Preferences</button>
                <button id="closePermissionDialog" style="
                    background: #f1f5f9;
                    color: #64748b;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                ">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add event listeners
    document.getElementById('openSystemPrefs').addEventListener('click', () => {
        ipcRenderer.invoke('open-system-preferences').catch(console.error);
        dialog.remove();
    });
    
    document.getElementById('closePermissionDialog').addEventListener('click', () => {
        dialog.remove();
    });
}
