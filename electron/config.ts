// In Node.js environment, we can safely use dotenv
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Get configuration from environment variables with your existing project as fallback
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  'https://fkpiqcxkmrtaetvfgcli.supabase.co';

export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

// Enhanced validation with helpful messages
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ CRITICAL: Missing Supabase configuration!');
  console.error('   Using fallback credentials for existing project');
  console.error('   To use environment variables, set:');
  console.error('   - VITE_SUPABASE_URL: Your Supabase project URL');
  console.error('   - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key');
} else {
  console.log('✅ Supabase configuration loaded successfully');
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
console.log('🔐 Security: Using existing project with secure fallbacks');
