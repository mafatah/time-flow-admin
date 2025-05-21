
// In Node.js environment, we can safely use dotenv
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const idleTimeoutMinutes = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 5);
export const screenshotIntervalSeconds = Number(process.env.SCREENSHOT_INTERVAL_SECONDS ?? 60);
