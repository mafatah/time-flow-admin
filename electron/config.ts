// In Node.js environment, we can safely use dotenv
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables first
dotenv.config();

// Enhanced configuration with environment variables only - no hardcoded fallbacks

// Attempt to load embedded configuration (generated during packaging)
let embeddedConfig: Record<string, string> = {};
try {
  // env-config.js will be placed in the same folder as the compiled config file
  /* eslint-disable @typescript-eslint/no-var-requires */
  embeddedConfig = require('./env-config');
  /* eslint-enable @typescript-eslint/no-var-requires */
  console.log('📦 Loaded embedded Supabase configuration');
} catch {
  // No embedded config available (likely development mode)
}

// Attempt to load desktop-agent fallback configuration (packaged alongside the app)
let desktopConfig: Record<string, string> = {};
try {
  // In the compiled output this resolves to build/desktop-agent/config.json
  const desktopConfigPath = path.join(__dirname, '../../desktop-agent/config.json');
  if (fs.existsSync(desktopConfigPath)) {
    desktopConfig = JSON.parse(fs.readFileSync(desktopConfigPath, 'utf8'));
    console.log('🖥️ Loaded Supabase configuration from desktop-agent/config.json');
  }
} catch (error) {
  console.log('⚠️ Could not load desktop-agent/config.json:', error);
}

// Get configuration from environment variables first, then fallbacks
export const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  embeddedConfig.VITE_SUPABASE_URL ||
  embeddedConfig.SUPABASE_URL ||
  (desktopConfig as any).supabase_url;

export const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  embeddedConfig.SUPABASE_SERVICE_ROLE_KEY ||
  (desktopConfig as any).supabase_service_key;

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  embeddedConfig.VITE_SUPABASE_ANON_KEY ||
  embeddedConfig.SUPABASE_ANON_KEY ||
  (desktopConfig as any).supabase_key;

// Strict validation with helpful error messages
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ CRITICAL: Missing Supabase configuration!');
  console.error('   Checked sources in the following priority:');
  console.error('   1. Environment variables');
  console.error('   2. Embedded env-config.js');
  console.error('   3. desktop-agent/config.json');
  console.error('   Please ensure one of these sources provides VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  throw new Error('Missing required Supabase environment variables');
} else {
  console.log('✅ Supabase configuration loaded successfully');
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
