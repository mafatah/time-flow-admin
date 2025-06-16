"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProduction = exports.isDevelopment = exports.trackApplications = exports.trackUrls = exports.enableScreenshots = exports.enableIdleDetection = exports.enableActivityTracking = exports.enableAntiCheat = exports.enableScreenshotBlur = exports.keyboardDiversityThreshold = exports.minimumMouseDistance = exports.patternDetectionWindowMinutes = exports.suspiciousActivityThreshold = exports.notificationFrequencySeconds = exports.screenshotFailureWarningMinutes = exports.maxConsecutiveScreenshotFailures = exports.mandatoryScreenshotIntervalMinutes = exports.maxLaptopClosedHours = exports.screenshotIntervalSeconds = exports.idleTimeoutMinutes = exports.SUPABASE_PUBLISHABLE_KEY = exports.SUPABASE_SERVICE_KEY = exports.SUPABASE_URL = void 0;
// In Node.js environment, we can safely use dotenv
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables first
dotenv_1.default.config();
// Enhanced configuration with environment variables only - no hardcoded fallbacks
// Get configuration from environment variables only
exports.SUPABASE_URL = process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;
exports.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
exports.SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
// Strict validation with helpful error messages
if (!exports.SUPABASE_URL || !exports.SUPABASE_PUBLISHABLE_KEY) {
    console.error('❌ CRITICAL: Missing Supabase configuration!');
    console.error('   Please ensure your .env file contains:');
    console.error('   - VITE_SUPABASE_URL: Your Supabase project URL');
    console.error('   - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key');
    throw new Error('Missing required Supabase environment variables');
}
else {
    console.log('✅ Supabase configuration loaded successfully from environment variables');
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
