// In Node.js environment, we can safely use dotenv
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Define hardcoded Supabase values
export const SUPABASE_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
// Use service role key for Electron backend to bypass RLS
export const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzgzODg4MiwiZXhwIjoyMDYzNDE0ODgyfQ.x7vI4QwpKQb8xq6yj_LMn1K7vJ-gfnEKJgKx0uqkT7g';
export const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

// Enhanced configuration with anti-cheat settings
export const idleTimeoutMinutes = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 1); // 1 minute for faster detection
export const screenshotIntervalSeconds = Number(process.env.SCREENSHOT_INTERVAL_SECONDS ?? 30); // 30 seconds for better monitoring

// Anti-cheat detection settings
export const antiCheatEnabled = process.env.ANTI_CHEAT_ENABLED !== 'false'; // Default enabled
export const suspiciousActivityThreshold = Number(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD ?? 10);
export const patternDetectionWindowMinutes = Number(process.env.PATTERN_DETECTION_WINDOW_MINUTES ?? 15);

// Activity detection thresholds
export const minimumMouseDistance = Number(process.env.MINIMUM_MOUSE_DISTANCE ?? 50); // pixels
export const keyboardDiversityThreshold = Number(process.env.KEYBOARD_DIVERSITY_THRESHOLD ?? 5); // unique keys
export const maxIdleTimeMinutes = Number(process.env.MAX_IDLE_TIME_MINUTES ?? 40); // 40 minutes max idle

console.log('🔧 Electron Config Loaded:', {
  idleTimeoutMinutes,
  screenshotIntervalSeconds,
  antiCheatEnabled,
  suspiciousActivityThreshold,
  patternDetectionWindowMinutes
});
