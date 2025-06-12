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
// Get configuration from environment variables with your existing project as fallback
exports.SUPABASE_URL = process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://fkpiqcxkmrtaetvfgcli.supabase.co';
exports.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
exports.SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';
// Enhanced validation with helpful messages
if (!exports.SUPABASE_URL || !exports.SUPABASE_PUBLISHABLE_KEY) {
    console.error('❌ CRITICAL: Missing Supabase configuration!');
    console.error('   Using fallback credentials for existing project');
    console.error('   To use environment variables, set:');
    console.error('   - VITE_SUPABASE_URL: Your Supabase project URL');
    console.error('   - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key');
}
else {
    console.log('✅ Supabase configuration loaded successfully');
}
// Enhanced configuration with anti-cheat settings
exports.idleTimeoutMinutes = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 1);
exports.screenshotIntervalSeconds = Number(process.env.SCREENSHOT_INTERVAL_SECONDS ?? 300);
// Anti-cheat detection settings
exports.antiCheatEnabled = process.env.ANTI_CHEAT_ENABLED !== 'false';
exports.suspiciousActivityThreshold = Number(process.env.SUSPICIOUS_ACTIVITY_THRESHOLD ?? 10);
exports.patternDetectionWindowMinutes = Number(process.env.PATTERN_DETECTION_WINDOW_MINUTES ?? 15);
// Activity detection thresholds
exports.minimumMouseDistance = Number(process.env.MINIMUM_MOUSE_DISTANCE ?? 50);
exports.keyboardDiversityThreshold = Number(process.env.KEYBOARD_DIVERSITY_THRESHOLD ?? 5);
exports.maxIdleTimeMinutes = Number(process.env.MAX_IDLE_TIME_MINUTES ?? 40);
console.log('🔧 Electron Config Loaded with environment variables');
console.log('🔐 Security: Using existing project with secure fallbacks');
