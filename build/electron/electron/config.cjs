"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxIdleTimeMinutes = exports.keyboardDiversityThreshold = exports.minimumMouseDistance = exports.patternDetectionWindowMinutes = exports.suspiciousActivityThreshold = exports.antiCheatEnabled = exports.screenshotIntervalSeconds = exports.idleTimeoutMinutes = exports.SUPABASE_PUBLISHABLE_KEY = exports.SUPABASE_SERVICE_KEY = exports.SUPABASE_URL = void 0;
// In Node.js environment, we can safely use dotenv
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables first
dotenv_1.default.config();
// Define hardcoded Supabase values
exports.SUPABASE_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
// Use service role key for Electron backend to bypass RLS
exports.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzgzODg4MiwiZXhwIjoyMDYzNDE0ODgyfQ.x7vI4QwpKQb8xq6yj_LMn1K7vJ-gfnEKJgKx0uqkT7g';
exports.SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';
// Enhanced configuration with anti-cheat settings
exports.idleTimeoutMinutes = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 1); // 1 minute for faster detection
exports.screenshotIntervalSeconds = Number(process.env.SCREENSHOT_INTERVAL_SECONDS ?? 30); // 30 seconds for better monitoring
// Anti-cheat detection settings
exports.antiCheatEnabled = process.env.ANTI_CHEAT_ENABLED !== 'false'; // Default enabled
exports.suspiciousActivityThreshold = Number(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD ?? 10);
exports.patternDetectionWindowMinutes = Number(process.env.PATTERN_DETECTION_WINDOW_MINUTES ?? 15);
// Activity detection thresholds
exports.minimumMouseDistance = Number(process.env.MINIMUM_MOUSE_DISTANCE ?? 50); // pixels
exports.keyboardDiversityThreshold = Number(process.env.KEYBOARD_DIVERSITY_THRESHOLD ?? 5); // unique keys
exports.maxIdleTimeMinutes = Number(process.env.MAX_IDLE_TIME_MINUTES ?? 40); // 40 minutes max idle
console.log('🔧 Electron Config Loaded:', {
    idleTimeoutMinutes: exports.idleTimeoutMinutes,
    screenshotIntervalSeconds: exports.screenshotIntervalSeconds,
    antiCheatEnabled: exports.antiCheatEnabled,
    suspiciousActivityThreshold: exports.suspiciousActivityThreshold,
    patternDetectionWindowMinutes: exports.patternDetectionWindowMinutes
});
