"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserConfig = exports.isProduction = exports.isDevelopment = exports.trackApplications = exports.trackUrls = exports.enableScreenshots = exports.enableIdleDetection = exports.enableActivityTracking = exports.enableAntiCheat = exports.enableScreenshotBlur = exports.keyboardDiversityThreshold = exports.minimumMouseDistance = exports.patternDetectionWindowMinutes = exports.suspiciousActivityThreshold = exports.notificationFrequencySeconds = exports.screenshotFailureWarningMinutes = exports.maxConsecutiveScreenshotFailures = exports.mandatoryScreenshotIntervalMinutes = exports.maxLaptopClosedHours = exports.screenshotIntervalSeconds = exports.idleTimeoutMinutes = void 0;
exports.initializeConfig = initializeConfig;
exports.SUPABASE_URL = SUPABASE_URL;
exports.SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;
// Professional configuration system with encrypted credentials
const dotenv_1 = __importDefault(require("dotenv"));
const secure_config_1 = require("./secure-config.cjs");
// Load environment variables first
dotenv_1.default.config();
console.log('🔧 TimeFlow: Initializing professional configuration system...');
let configInitialized = false;
let credentials = null;
async function initializeConfig() {
    if (configInitialized) {
        console.log('🔧 Configuration already initialized');
        return;
    }
    try {
        console.log('⚙️ Initializing secure configuration...');
        // Get encrypted credentials
        credentials = (0, secure_config_1.getSupabaseCredentials)();
        configInitialized = true;
        console.log('✅ Configuration initialized successfully');
    }
    catch (error) {
        console.error('❌ Configuration initialization failed:', error);
        throw error;
    }
}
function SUPABASE_URL() {
    if (!configInitialized || !credentials) {
        throw new Error('Configuration not initialized. Call initializeConfig() first.');
    }
    return credentials.url;
}
function SUPABASE_PUBLISHABLE_KEY() {
    if (!configInitialized || !credentials) {
        throw new Error('Configuration not initialized. Call initializeConfig() first.');
    }
    return credentials.key;
}
// Enhanced configuration getters with safe defaults
const idleTimeoutMinutes = () => 1;
exports.idleTimeoutMinutes = idleTimeoutMinutes;
const screenshotIntervalSeconds = () => 300;
exports.screenshotIntervalSeconds = screenshotIntervalSeconds;
const maxLaptopClosedHours = () => 1;
exports.maxLaptopClosedHours = maxLaptopClosedHours;
const mandatoryScreenshotIntervalMinutes = () => 15;
exports.mandatoryScreenshotIntervalMinutes = mandatoryScreenshotIntervalMinutes;
const maxConsecutiveScreenshotFailures = () => 3;
exports.maxConsecutiveScreenshotFailures = maxConsecutiveScreenshotFailures;
const screenshotFailureWarningMinutes = () => 12;
exports.screenshotFailureWarningMinutes = screenshotFailureWarningMinutes;
const notificationFrequencySeconds = () => 120;
exports.notificationFrequencySeconds = notificationFrequencySeconds;
const suspiciousActivityThreshold = () => 10;
exports.suspiciousActivityThreshold = suspiciousActivityThreshold;
const patternDetectionWindowMinutes = () => 15;
exports.patternDetectionWindowMinutes = patternDetectionWindowMinutes;
const minimumMouseDistance = () => 50;
exports.minimumMouseDistance = minimumMouseDistance;
const keyboardDiversityThreshold = () => 5;
exports.keyboardDiversityThreshold = keyboardDiversityThreshold;
const enableScreenshotBlur = () => false;
exports.enableScreenshotBlur = enableScreenshotBlur;
const enableAntiCheat = () => true;
exports.enableAntiCheat = enableAntiCheat;
const enableActivityTracking = () => true;
exports.enableActivityTracking = enableActivityTracking;
const enableIdleDetection = () => true;
exports.enableIdleDetection = enableIdleDetection;
const enableScreenshots = () => true;
exports.enableScreenshots = enableScreenshots;
const trackUrls = () => true;
exports.trackUrls = trackUrls;
const trackApplications = () => true;
exports.trackApplications = trackApplications;
const isDevelopment = () => process.env.NODE_ENV === 'development';
exports.isDevelopment = isDevelopment;
const isProduction = () => process.env.NODE_ENV === 'production';
exports.isProduction = isProduction;
// Helper function for creating user config (if needed for future use)
const createUserConfig = (config) => {
    console.log('ℹ️ User config creation not needed - using encrypted credentials');
    return 'Built-in encrypted configuration active';
};
exports.createUserConfig = createUserConfig;
