// In Node.js environment, we can safely use dotenv
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Get configuration from environment variables with secure fallbacks
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
export const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing required Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

// Enhanced configuration with anti-cheat settings
export const idleTimeoutMinutes = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 1);
export const screenshotIntervalSeconds = Number(process.env.SCREENSHOT_INTERVAL_SECONDS ?? 300);

// Anti-cheat detection settings
export const antiCheatEnabled = process.env.ANTI_CHEAT_ENABLED !== 'false';
export const suspiciousActivityThreshold = Number(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD ?? 10);
export const patternDetectionWindowMinutes = Number(process.env.PATTERN_DETECTION_WINDOW_MINUTES ?? 15);

// Activity detection thresholds
export const minimumMouseDistance = Number(process.env.MINIMUM_MOUSE_DISTANCE ?? 50);
export const keyboardDiversityThreshold = Number(process.env.KEYBOARD_DIVERSITY_THRESHOLD ?? 5);
export const maxIdleTimeMinutes = Number(process.env.MAX_IDLE_TIME_MINUTES ?? 40);

console.log('🔧 Electron Config Loaded with environment variables');
