
/**
 * Browser-compatible idle detection module
 */

// Store the timestamp of the last user activity
let lastActivity = Date.now();
const listeners: Array<(isIdle: boolean) => void> = [];
let idleCheckInterval: number | null = null;
let currentIdleStatus = false;

// Default idle timeout in minutes
const DEFAULT_IDLE_TIMEOUT = 5;

// Get idle timeout from environment or use default
const getIdleTimeoutMs = (): number => {
  const timeoutMinutes = process.env.IDLE_TIMEOUT_MINUTES 
    ? parseInt(process.env.IDLE_TIMEOUT_MINUTES, 10) 
    : DEFAULT_IDLE_TIMEOUT;
  return timeoutMinutes * 60 * 1000;
};

// Reset activity timestamp when user interacts with page
const resetActivity = (): void => {
  lastActivity = Date.now();
};

// Add event listeners for user activity
const setupActivityListeners = (): void => {
  const events = ['mousemove', 'mousedown', 'keypress', 'DOMMouseScroll', 'mousewheel', 
    'touchmove', 'MSPointerMove', 'scroll'];
  
  events.forEach(eventName => {
    window.addEventListener(eventName, resetActivity, true);
  });
};

// Remove all event listeners
const removeActivityListeners = (): void => {
  const events = ['mousemove', 'mousedown', 'keypress', 'DOMMouseScroll', 'mousewheel', 
    'touchmove', 'MSPointerMove', 'scroll'];
  
  events.forEach(eventName => {
    window.removeEventListener(eventName, resetActivity, true);
  });
};

// Check if user is idle
const checkIdleStatus = (): void => {
  const now = Date.now();
  const isIdle = now - lastActivity > getIdleTimeoutMs();
  
  if (isIdle !== currentIdleStatus) {
    currentIdleStatus = isIdle;
    // Notify all listeners about idle status change
    listeners.forEach(callback => callback(isIdle));
    console.log('Idle status changed:', isIdle);
  }
};

// Start idle monitoring
export const startIdleMonitoring = (onStatusChange: (isIdle: boolean) => void): void => {
  // Register callback
  listeners.push(onStatusChange);
  
  // Setup only if this is the first listener
  if (listeners.length === 1) {
    resetActivity(); // Reset initial activity timestamp
    setupActivityListeners();
    idleCheckInterval = window.setInterval(checkIdleStatus, 5000);
    console.log('Idle monitoring started');
  }
};

// Stop idle monitoring
export const stopIdleMonitoring = (onStatusChange?: (isIdle: boolean) => void): void => {
  if (onStatusChange) {
    // Remove specific callback
    const index = listeners.indexOf(onStatusChange);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  } else {
    // Remove all callbacks
    listeners.length = 0;
  }
  
  // If no more listeners, clean up completely
  if (listeners.length === 0 && idleCheckInterval !== null) {
    window.clearInterval(idleCheckInterval);
    idleCheckInterval = null;
    removeActivityListeners();
    currentIdleStatus = false;
    console.log('Idle monitoring stopped');
  }
};

// Get current idle status
export const isIdle = (): boolean => {
  return currentIdleStatus;
};
