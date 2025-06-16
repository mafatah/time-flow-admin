"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProduction = exports.isDevelopment = exports.trackApplications = exports.trackUrls = exports.enableScreenshots = exports.enableIdleDetection = exports.enableActivityTracking = exports.enableAntiCheat = exports.enableScreenshotBlur = exports.keyboardDiversityThreshold = exports.minimumMouseDistance = exports.patternDetectionWindowMinutes = exports.suspiciousActivityThreshold = exports.notificationFrequencySeconds = exports.screenshotFailureWarningMinutes = exports.maxConsecutiveScreenshotFailures = exports.mandatoryScreenshotIntervalMinutes = exports.maxLaptopClosedHours = exports.screenshotIntervalSeconds = exports.idleTimeoutMinutes = exports.SUPABASE_PUBLISHABLE_KEY = exports.SUPABASE_SERVICE_KEY = exports.SUPABASE_URL = void 0;
// In Node.js environment, we can safely use dotenv
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load environment variables first
dotenv_1.default.config();
// Enhanced configuration with environment variables only - no hardcoded fallbacks
// Attempt to load embedded configuration (generated during packaging)
let embeddedConfig = {};
try {
    // env-config.js will be placed in the same folder as the compiled config file
    /* eslint-disable @typescript-eslint/no-var-requires */
    embeddedConfig = require('./env-config');
    /* eslint-enable @typescript-eslint/no-var-requires */
    console.log('📦 Loaded embedded Supabase configuration');
}
catch {
    // No embedded config available (likely development mode)
}
// Attempt to load desktop-agent fallback configuration (packaged alongside the app)
let desktopConfig = {};
try {
    // In the compiled output this resolves to build/desktop-agent/config.json
    const desktopConfigPath = path_1.default.join(__dirname, '../../desktop-agent/config.json');
    if (fs_1.default.existsSync(desktopConfigPath)) {
        desktopConfig = JSON.parse(fs_1.default.readFileSync(desktopConfigPath, 'utf8'));
        console.log('🖥️ Loaded Supabase configuration from desktop-agent/config.json');
    }
}
catch (error) {
    console.log('⚠️ Could not load desktop-agent/config.json:', error);
}
// Get configuration from environment variables first, then fallbacks
exports.SUPABASE_URL = process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    embeddedConfig.VITE_SUPABASE_URL ||
    embeddedConfig.SUPABASE_URL ||
    desktopConfig.supabase_url;
exports.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    embeddedConfig.SUPABASE_SERVICE_ROLE_KEY ||
    desktopConfig.supabase_service_key;
exports.SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    embeddedConfig.VITE_SUPABASE_ANON_KEY ||
    embeddedConfig.SUPABASE_ANON_KEY ||
    desktopConfig.supabase_key;
// Strict validation with helpful error messages
if (!exports.SUPABASE_URL || !exports.SUPABASE_PUBLISHABLE_KEY) {
    console.error('❌ CRITICAL: Missing Supabase configuration!');
    console.error('   Checked sources in the following priority:');
    console.error('   1. Environment variables');
    console.error('   2. Embedded env-config.js');
    console.error('   3. desktop-agent/config.json');
    console.error('   Please ensure one of these sources provides VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    throw new Error('Missing required Supabase environment variables');
}
else {
    console.log('✅ Supabase configuration loaded successfully');
}
// Enhanced configuration with anti-cheat settings
exports.idleTimeoutMinutes = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 1);
exports.screenshotIntervalSeconds = Number(process.env.SCREENSHOT_INTERVAL_SECONDS ?? 300);
exports.maxLaptopClosedHours = Number(process.env.MAX_LAPTOP_CLOSED_HOURS ?? 1);
exports.mandatoryScreenshotIntervalMinutes = Number(process.env.MANDATORY_SCREENSHOT_INTERVAL_MINUTES ?? 15);
exports.maxConsecutiveScreenshotFailures = Number(process.env.MAX_CONSECUTIVE_SCREENSHOT_FAILURES ?? 3);
exports.screenshotFailureWarningMinutes = Number(process.env.SCREENSHOT_FAILURE_WARNING_MINUTES ?? 12);
exports.notificationFrequencySeconds = Number(process.env.NOTIFICATION_FREQUENCY_SECONDS ?? 120);
exports.suspiciousActivityThreshold = Number(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD ?? 10);
exports.patternDetectionWindowMinutes = Number(process.env.PATTERN_DETECTION_WINDOW_MINUTES ?? 15);
exports.minimumMouseDistance = Number(process.env.MINIMUM_MOUSE_DISTANCE ?? 50);
exports.keyboardDiversityThreshold = Number(process.env.KEYBOARD_DIVERSITY_THRESHOLD ?? 5);
// Security settings
exports.enableScreenshotBlur = process.env.BLUR_SCREENSHOTS === 'true';
exports.enableAntiCheat = process.env.ENABLE_ANTI_CHEAT !== 'false'; // Default to enabled
exports.enableActivityTracking = process.env.ENABLE_ACTIVITY_TRACKING !== 'false';
exports.enableIdleDetection = process.env.ENABLE_IDLE_DETECTION !== 'false';
exports.enableScreenshots = process.env.ENABLE_SCREENSHOTS !== 'false';
exports.trackUrls = process.env.TRACK_URLS !== 'false';
exports.trackApplications = process.env.TRACK_APPLICATIONS !== 'false';
// Development settings
exports.isDevelopment = process.env.NODE_ENV === 'development';
exports.isProduction = process.env.NODE_ENV === 'production';
console.log('🔧 TimeFlow Configuration:');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Screenshots: ${exports.enableScreenshots ? 'enabled' : 'disabled'}`);
console.log(`   Anti-cheat: ${exports.enableAntiCheat ? 'enabled' : 'disabled'}`);
console.log(`   Activity tracking: ${exports.enableActivityTracking ? 'enabled' : 'disabled'}`);
console.log(`   Idle detection: ${exports.enableIdleDetection ? 'enabled' : 'disabled'}`);
console.log(`   Screenshot interval: ${exports.screenshotIntervalSeconds}s`);
console.log(`   Idle timeout: ${exports.idleTimeoutMinutes}min`);
