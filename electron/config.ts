import 'dotenv/config';

export const idleTimeoutMinutes = Number(process.env.IDLE_TIMEOUT_MINUTES ?? 5);
export const screenshotIntervalSeconds = Number(process.env.SCREENSHOT_INTERVAL_SECONDS ?? 60);
