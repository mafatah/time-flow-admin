let screenshotInterval: ReturnType<typeof setInterval> | undefined;
let appInterval: ReturnType<typeof setInterval> | undefined;
let trackingActive = false;

export function startTracking() {
  if (trackingActive) return;
  trackingActive = true;

  if (!screenshotInterval) {
    screenshotInterval = setInterval(() => {
      // TODO: implement screenshot capture
    }, 1000);
  }

  if (!appInterval) {
    appInterval = setInterval(() => {
      // TODO: implement application tracking
    }, 1000);
  }
}

export function stopTracking() {
  if (!trackingActive) return;
  trackingActive = false;
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = undefined;
  }
  if (appInterval) {
    clearInterval(appInterval);
    appInterval = undefined;
  }
}
