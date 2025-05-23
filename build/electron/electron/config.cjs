"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.screenshotIntervalSeconds = exports.idleTimeoutMinutes = exports.SUPABASE_PUBLISHABLE_KEY = exports.SUPABASE_URL = void 0;
// In Node.js environment, we can safely use dotenv
const dotenv_1 = __importDefault(require("dotenv"));
// Define hardcoded Supabase values
exports.SUPABASE_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
exports.SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';
// Load environment variables from .env file
dotenv_1.default.config();
exports.idleTimeoutMinutes = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 1); // 1 minute for testing
exports.screenshotIntervalSeconds = Number(process.env.SCREENSHOT_INTERVAL_SECONDS ?? 20); // 20 seconds for testing
