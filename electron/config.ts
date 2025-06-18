// Professional configuration system with encrypted credentials
import dotenv from 'dotenv';
import { getSupabaseCredentials, getAppConfiguration } from './secure-config';

// Load environment variables first
dotenv.config();

console.log('🔧 TimeFlow: Initializing professional configuration system...');

let configInitialized = false;
let credentials: { url: string; key: string } | null = null;

export async function initializeConfig(): Promise<void> {
  if (configInitialized) {
    console.log('🔧 Configuration already initialized');
    return;
  }

  try {
    console.log('⚙️ Initializing secure configuration...');
    
    // Get encrypted credentials
    credentials = getSupabaseCredentials();
    
    configInitialized = true;
    console.log('✅ Configuration initialized successfully');
  } catch (error) {
    console.error('❌ Configuration initialization failed:', error);
    throw error;
  }
}

export function SUPABASE_URL(): string {
  if (!configInitialized || !credentials) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return credentials.url;
}

export function SUPABASE_PUBLISHABLE_KEY(): string {
  if (!configInitialized || !credentials) {
    throw new Error('Configuration not initialized. Call initializeConfig() first.');
  }
  return credentials.key;
}

// Enhanced configuration getters with safe defaults
export const idleTimeoutMinutes = () => 1;
export const screenshotIntervalSeconds = () => 300;
export const maxLaptopClosedHours = () => 1;
export const mandatoryScreenshotIntervalMinutes = () => 15;
export const maxConsecutiveScreenshotFailures = () => 3;
export const screenshotFailureWarningMinutes = () => 12;
export const notificationFrequencySeconds = () => 120;
export const suspiciousActivityThreshold = () => 10;
export const patternDetectionWindowMinutes = () => 15;
export const minimumMouseDistance = () => 50;
export const keyboardDiversityThreshold = () => 5;
export const enableScreenshotBlur = () => false;
export const enableAntiCheat = () => true;
export const enableActivityTracking = () => true;
export const enableIdleDetection = () => true;
export const enableScreenshots = () => true;
export const trackUrls = () => true;
export const trackApplications = () => true;
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isProduction = () => process.env.NODE_ENV === 'production';

// Helper function for creating user config (if needed for future use)
export const createUserConfig = (config: Record<string, string>) => {
  console.log('ℹ️ User config creation not needed - using encrypted credentials');
  return 'Built-in encrypted configuration active';
}; 