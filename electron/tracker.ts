
import { app, BrowserWindow, desktopCapturer, screen } from 'electron';
import { supabase } from '../src/lib/supabase';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import activeWin from 'active-win';

let screenshotInterval: ReturnType<typeof setInterval> | undefined;
let appInterval: ReturnType<typeof setInterval> | undefined;
let trackingActive = false;
let userId: string | null = null;
let currentTaskId: string | null = null;
let offlineData: {
  screenshots: Array<{ path: string; timestamp: number; taskId: string }>;
  activeWindows: Array<{ title: string; app: string; timestamp: number; taskId: string }>;
} = {
  screenshots: [],
  activeWindows: []
};

// Set the current user ID for tracking
export function setUserId(id: string) {
  userId = id;
}

// Set the current task ID for tracking
export function setTaskId(id: string) {
  currentTaskId = id;
}

// Start tracking activities
export function startTracking() {
  if (trackingActive) return;
  trackingActive = true;

  if (!screenshotInterval) {
    screenshotInterval = setInterval(async () => {
      // Implement screenshot capture
      try {
        if (!userId || !currentTaskId) {
          console.log('Cannot capture screenshot: missing user ID or task ID');
          return;
        }

        // Capture screenshot of the entire screen
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        
        const sources = await desktopCapturer.getSources({ 
          types: ['screen'], 
          thumbnailSize: { width, height } 
        });
        
        if (sources.length > 0) {
          const screenshot = sources[0].thumbnail.toPNG();
          
          // Generate a unique filename for the screenshot
          const filename = `screenshot_${nanoid()}.png`;
          const tempPath = path.join(app.getPath('temp'), filename);
          
          // Save screenshot to temporary file
          fs.writeFileSync(tempPath, screenshot);
          
          // Upload to Supabase if online
          try {
            // Try to upload to Supabase
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('screenshots')
              .upload(`${userId}/${filename}`, screenshot);
            
            if (uploadError) {
              console.error('Failed to upload screenshot:', uploadError);
              // Store locally for later upload
              offlineData.screenshots.push({
                path: tempPath,
                timestamp: Date.now(),
                taskId: currentTaskId
              });
              return;
            }
            
            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from('screenshots')
              .getPublicUrl(`${userId}/${filename}`);
              
            const imageUrl = publicUrlData.publicUrl;
            
            // Record screenshot in database
            const { error: dbError } = await supabase
              .from('screenshots')
              .insert({
                user_id: userId,
                task_id: currentTaskId,
                image_url: imageUrl,
                captured_at: new Date().toISOString()
              });
              
            if (dbError) {
              console.error('Failed to record screenshot in database:', dbError);
            }
            
            // Remove temporary file
            fs.unlink(tempPath, (err) => {
              if (err) console.error('Failed to remove temp file:', err);
            });
          } catch (e) {
            console.error('Failed to process screenshot:', e);
            // Store locally for later upload
            offlineData.screenshots.push({
              path: tempPath,
              timestamp: Date.now(),
              taskId: currentTaskId
            });
          }
        }
      } catch (error) {
        console.error('Error capturing screenshot:', error);
      }
    }, 60000); // Capture every minute
  }

  if (!appInterval) {
    appInterval = setInterval(async () => {
      // Implement application tracking
      try {
        if (!userId || !currentTaskId) {
          console.log('Cannot track application: missing user ID or task ID');
          return;
        }
        
        // Get active window information
        const activeWindow = await activeWin();
        
        if (activeWindow) {
          const windowData = {
            title: activeWindow.title,
            app: activeWindow.owner.name,
            timestamp: Date.now(),
            taskId: currentTaskId
          };
          
          // Try to log active window to server
          try {
            // Log active window to time_logs table or specialized table if available
            const { error: logError } = await supabase
              .from('time_logs')
              .insert({
                user_id: userId,
                task_id: currentTaskId,
                is_idle: false,
                // Add metadata about active window
                metadata: {
                  window_title: activeWindow.title,
                  application: activeWindow.owner.name
                }
              });
              
            if (logError) {
              console.error('Failed to log active window:', logError);
              offlineData.activeWindows.push(windowData);
            }
          } catch (e) {
            console.error('Error logging active window:', e);
            offlineData.activeWindows.push(windowData);
          }
        }
      } catch (error) {
        console.error('Error tracking application:', error);
      }
    }, 10000); // Track every 10 seconds
  }
}

// Stop tracking activities
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

// Sync offline data when online
export async function syncOfflineData() {
  if (!userId) return;
  
  // Sync screenshots
  for (const screenshot of offlineData.screenshots) {
    try {
      // Read the file
      const fileData = fs.readFileSync(screenshot.path);
      const filename = path.basename(screenshot.path);
      
      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(`${userId}/${filename}`, fileData);
      
      if (uploadError) {
        console.error('Failed to upload offline screenshot:', uploadError);
        continue;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('screenshots')
        .getPublicUrl(`${userId}/${filename}`);
      
      const imageUrl = publicUrlData.publicUrl;
      
      // Record screenshot in database
      const { error: dbError } = await supabase
        .from('screenshots')
        .insert({
          user_id: userId,
          task_id: screenshot.taskId,
          image_url: imageUrl,
          captured_at: new Date(screenshot.timestamp).toISOString()
        });
        
      if (!dbError) {
        // Remove from offline data
        offlineData.screenshots = offlineData.screenshots.filter(s => s.path !== screenshot.path);
        
        // Remove temporary file
        fs.unlink(screenshot.path, (err) => {
          if (err) console.error('Failed to remove temp file:', err);
        });
      }
    } catch (e) {
      console.error('Failed to sync offline screenshot:', e);
    }
  }
  
  // Sync active windows
  for (const window of offlineData.activeWindows) {
    try {
      // Log active window to time_logs table
      const { error: logError } = await supabase
        .from('time_logs')
        .insert({
          user_id: userId,
          task_id: window.taskId,
          is_idle: false,
          start_time: new Date(window.timestamp).toISOString(),
          metadata: {
            window_title: window.title,
            application: window.app
          }
        });
        
      if (!logError) {
        // Remove from offline data
        offlineData.activeWindows = offlineData.activeWindows.filter(w => 
          w.timestamp !== window.timestamp && w.title !== window.title);
      }
    } catch (e) {
      console.error('Failed to sync offline active window data:', e);
    }
  }
}
