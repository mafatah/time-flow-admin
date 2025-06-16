// In Node.js environment, we can safely use dotenv
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Enhanced configuration with environment variables only - no hardcoded fallbacks

// Get configuration from environment variables only
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 
  process.env.SUPABASE_URL;

export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_PUBLISHABLE_KEY;

// Strict validation with helpful error messages
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ CRITICAL: Missing Supabase configuration!');
  console.error('   Please ensure your .env file contains:');
  console.error('   - VITE_SUPABASE_URL: Your Supabase project URL');
  console.error('   - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key');
  throw new Error('Missing required Supabase environment variables');
} else {
  console.log('✅ Supabase configuration loaded successfully from environment variables');
}

// Enhanced configuration with anti-cheat settings
export const idleTimeoutMinutes = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 1);
export const screenshotIntervalSeconds = Number(process.env.SCREENSHOT_INTERVAL_SECONDS ?? 300);
export const maxLaptopClosedHours = Number(process.env.MAX_LAPTOP_CLOSED_HOURS ?? 1);
export const mandatoryScreenshotIntervalMinutes = Number(process.env.MANDATORY_SCREENSHOT_INTERVAL_MINUTES ?? 15);
export const maxConsecutiveScreenshotFailures = Number(process.env.MAX_CONSECUTIVE_SCREENSHOT_FAILURES ?? 3);
export const screenshotFailureWarningMinutes = Number(process.env.SCREENSHOT_FAILURE_WARNING_MINUTES ?? 12);
export const notificationFrequencySeconds = Number(process.env.NOTIFICATION_FREQUENCY_SECONDS ?? 120);
export const suspiciousActivityThreshold = Number(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD ?? 10);
export const patternDetectionWindowMinutes = Number(process.env.PATTERN_DETECTION_WINDOW_MINUTES ?? 15);
export const minimumMouseDistance = Number(process.env.MINIMUM_MOUSE_DISTANCE ?? 50);
export const keyboardDiversityThreshold = Number(process.env.KEYBOARD_DIVERSITY_THRESHOLD ?? 5);

// Security settings
export const enableScreenshotBlur = process.env.BLUR_SCREENSHOTS === 'true';
export const enableAntiCheat = process.env.ENABLE_ANTI_CHEAT !== 'false'; // Default to enabled
export const enableActivityTracking = process.env.ENABLE_ACTIVITY_TRACKING !== 'false';
export const enableIdleDetection = process.env.ENABLE_IDLE_DETECTION !== 'false';
export const enableScreenshots = process.env.ENABLE_SCREENSHOTS !== 'false';
export const trackUrls = process.env.TRACK_URLS !== 'false';
export const trackApplications = process.env.TRACK_APPLICATIONS !== 'false';

// Development settings
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

console.log('🔧 TimeFlow Configuration:');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Screenshots: ${enableScreenshots ? 'enabled' : 'disabled'}`);
console.log(`   Anti-cheat: ${enableAntiCheat ? 'enabled' : 'disabled'}`);
console.log(`   Activity tracking: ${enableActivityTracking ? 'enabled' : 'disabled'}`);
console.log(`   Idle detection: ${enableIdleDetection ? 'enabled' : 'disabled'}`);
console.log(`   Screenshot interval: ${screenshotIntervalSeconds}s`);
console.log(`   Idle timeout: ${idleTimeoutMinutes}min`);
