// In Node.js environment, we can safely use dotenv
import dotenv from 'dotenv';

// Define hardcoded Supabase values
export const SUPABASE_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

// Load environment variables from .env file
dotenv.config();

export const idleTimeoutMinutes = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 5);
export const screenshotIntervalSeconds = Number(process.env.SCREENSHOT_INTERVAL_SECONDS ?? 600); // 6 times per hour = every 10 minutes (600 seconds)
