const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SyncManager {
  constructor(config) {
    this.config = config;
    this.supabase = createClient(config.supabase_url, config.supabase_key);
    // Use service role for database operations if available
    this.supabaseService = config.supabase_service_key ? 
      createClient(config.supabase_url, config.supabase_service_key) : 
      this.supabase;
    this.isOnline = true;
    this.syncInterval = null;
    this.queuePath = path.join(__dirname, '..', 'offline-queue.json');
    
    // Initialize offline queue
    this.queue = this.loadQueue();
    
    // Clean up any old URL logs with is_active field
    this.cleanBadUrlLogs();
    
    // Start sync process
    this.startSyncProcess();
    
    // Monitor connection
    this.monitorConnection();
  }

  // === QUEUE MANAGEMENT ===
  loadQueue() {
    try {
      if (fs.existsSync(this.queuePath)) {
        const data = fs.readFileSync(this.queuePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('❌ Failed to load queue:', error);
    }
    
    return {
      screenshots: [],
      appLogs: [],
      urlLogs: [],
      idleLogs: [],
      timeLogs: [],
      fraudAlerts: []
    };
  }

  saveQueue() {
    try {
      fs.writeFileSync(this.queuePath, JSON.stringify(this.queue, null, 2));
    } catch (error) {
      console.error('❌ Failed to save queue:', error);
    }
  }

  // === SCREENSHOT HANDLING ===
  async addScreenshot(imageBuffer, metadata) {
    const screenshotData = {
      id: `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imageBuffer: imageBuffer.toString('base64'),
      metadata: metadata,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    if (this.isOnline) {
      try {
        await this.uploadScreenshot(screenshotData);
        console.log('✅ Screenshot uploaded immediately');
        return;
      } catch (error) {
        console.log('⚠️ Screenshot upload failed, queuing for later');
      }
    }

    // Add to queue
    this.queue.screenshots.push(screenshotData);
    this.saveQueue();
    console.log(`📦 Screenshot queued (${this.queue.screenshots.length} pending)`);
  }

  async uploadScreenshot(screenshotData) {
    const { imageBuffer, metadata } = screenshotData;
    const buffer = Buffer.from(imageBuffer, 'base64');
    
    // Upload to storage
    const fileName = `${metadata.user_id}/${Date.now()}.png`;
    const { error: uploadError } = await this.supabase.storage
      .from('screenshots')
      .upload(fileName, buffer, { 
        contentType: 'image/png',
        upsert: true 
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicUrl } = this.supabase.storage
      .from('screenshots')
      .getPublicUrl(fileName);

    // Save to database - use correct column names based on actual schema
    const { error: dbError } = await this.supabaseService
      .from('screenshots')
      .insert({
        user_id: metadata.user_id,
        project_id: metadata.project_id, // Use project_id instead of time_log_id based on actual schema
        image_url: publicUrl.publicUrl,
        activity_percent: metadata.activity_percent,
        focus_percent: metadata.focus_percent,
        captured_at: metadata.captured_at,
        file_path: publicUrl.publicUrl, // Add file_path which seems to be required
        classification: metadata.activity_percent > 50 ? 'productive' : 'idle'
      });

    if (dbError) throw dbError;
  }

  // === APP LOGS HANDLING ===
  async addAppLogs(appLogs) {
    const logData = {
      id: `app_logs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      logs: appLogs,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    if (this.isOnline) {
      try {
        await this.uploadAppLogs(logData);
        console.log('✅ App logs uploaded immediately');
        return;
      } catch (error) {
        console.log('⚠️ App logs upload failed, queuing for later');
      }
    }

    // Add to queue
    this.queue.appLogs.push(logData);
    this.saveQueue();
    console.log(`📦 App logs queued (${this.queue.appLogs.length} pending)`);
  }

  async uploadAppLogs(logData) {
    const { error } = await this.supabaseService
      .from('app_logs')
      .insert(logData.logs);

    if (error) throw error;
  }

  // === URL LOGS HANDLING ===
  async addUrlLogs(urlLogs) {
    const logData = {
      id: `url_logs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      logs: urlLogs,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    if (this.isOnline) {
      try {
        await this.uploadUrlLogs(logData);
        console.log('✅ URL logs uploaded immediately');
        return;
      } catch (error) {
        console.log('⚠️ URL logs upload failed, queuing for later');
      }
    }

    // Add to queue
    this.queue.urlLogs.push(logData);
    this.saveQueue();
    console.log(`📦 URL logs queued (${this.queue.urlLogs.length} pending)`);
  }

  async uploadUrlLogs(logData) {
    const { error } = await this.supabaseService
      .from('url_logs')
      .insert(logData.logs);

    if (error) throw error;
  }

  // === IDLE LOGS HANDLING ===
  async addIdleLog(idleLog) {
    const logData = {
      id: `idle_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      log: idleLog,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    if (this.isOnline) {
      try {
        await this.uploadIdleLog(logData);
        console.log('✅ Idle log uploaded immediately');
        return;
      } catch (error) {
        console.log('⚠️ Idle log upload failed, queuing for later');
      }
    }

    // Add to queue
    this.queue.idleLogs.push(logData);
    this.saveQueue();
    console.log(`📦 Idle log queued (${this.queue.idleLogs.length} pending)`);
  }

  async uploadIdleLog(logData) {
    const { error } = await this.supabaseService
      .from('idle_logs')
      .insert(logData.log);

    if (error) throw error;
  }

  // === TIME LOGS HANDLING ===
  async addTimeLog(timeLog) {
    const logData = {
      id: crypto.randomUUID(), // Use proper UUID format
      log: timeLog,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    if (this.isOnline) {
      try {
        await this.uploadTimeLog(logData);
        console.log('✅ Time log uploaded immediately');
        return;
      } catch (error) {
        console.log('⚠️ Time log upload failed, queuing for later');
      }
    }

    // Add to queue
    this.queue.timeLogs.push(logData);
    this.saveQueue();
    console.log(`📦 Time log queued (${this.queue.timeLogs.length} pending)`);
  }

  async uploadTimeLog(logData) {
    if (logData.log.action === 'update_idle') {
      const { error } = await this.supabaseService
        .from('time_logs')
        .update(logData.log.data)
        .eq('id', logData.log.id);

      if (error) throw error;
    } else {
      const { error } = await this.supabaseService
        .from('time_logs')
        .insert(logData.log);

      if (error) throw error;
    }
  }

  // === FRAUD ALERTS HANDLING ===
  async addFraudAlert(fraudAlert) {
    const alertData = {
      id: `fraud_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alert: fraudAlert,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    if (this.isOnline) {
      try {
        await this.uploadFraudAlert(alertData);
        console.log('✅ Fraud alert uploaded immediately');
        return;
      } catch (error) {
        console.log('⚠️ Fraud alert upload failed, queuing for later');
      }
    }

    // Add to queue
    this.queue.fraudAlerts.push(alertData);
    this.saveQueue();
    console.log(`📦 Fraud alert queued (${this.queue.fraudAlerts.length} pending)`);
  }

  async uploadFraudAlert(alertData) {
    const { alert } = alertData;
    
    // Transform the alert data to match database schema
    const fraudAlertRecord = {
      user_id: alert.userId,
      time_log_id: alert.timeLogId || null,
      alert_type: alert.type,
      severity: alert.severity || 'HIGH',
      risk_score: (alert.riskScore * 100), // Convert to percentage
      confidence: (alert.confidence * 100) || 0,
      suspicious_patterns: alert.suspiciousPatterns || [],
      detection_details: alert.details || {},
      behavior_analysis: alert.behaviorAnalysis || {},
      screenshot_context: alert.screenshotContext || {},
      activity_context: alert.activityContext || {},
      system_context: alert.systemContext || {},
      detected_at: new Date(alert.timestamp).toISOString()
    };

    const { error } = await this.supabaseService
      .from('fraud_alerts')
      .insert(fraudAlertRecord);

    if (error) throw error;
  }

  // === SYNC PROCESS ===
  startSyncProcess() {
    // Sync every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncQueue();
    }, 30000);

    // Initial sync after 5 seconds
    setTimeout(() => this.syncQueue(), 5000);
  }

  async syncQueue() {
    if (!this.isOnline) return;

    const totalItems = Object.values(this.queue).reduce((sum, arr) => sum + arr.length, 0);
    if (totalItems === 0) return;

    console.log(`🔄 Syncing ${totalItems} queued items...`);

    // Sync screenshots
    await this.syncScreenshots();
    
    // Sync app logs
    await this.syncAppLogs();
    
    // Sync URL logs
    await this.syncUrlLogs();
    
    // Sync idle logs
    await this.syncIdleLogs();
    
    // Sync time logs
    await this.syncTimeLogs();
    
    // Sync fraud alerts
    await this.syncFraudAlerts();

    this.saveQueue();
  }

  async syncScreenshots() {
    const screenshots = [...this.queue.screenshots];
    
    for (let i = screenshots.length - 1; i >= 0; i--) {
      const screenshot = screenshots[i];
      
      try {
        await this.uploadScreenshot(screenshot);
        this.queue.screenshots.splice(i, 1);
        console.log('✅ Screenshot synced');
      } catch (error) {
        screenshot.retries++;
        console.error(`❌ Screenshot sync failed (retry ${screenshot.retries}):`, error.message);
        
        // Remove after 5 failed attempts
        if (screenshot.retries >= 5) {
          this.queue.screenshots.splice(i, 1);
          console.log('🗑️ Screenshot removed after 5 failed attempts');
        }
      }
    }
  }

  async syncAppLogs() {
    const appLogs = [...this.queue.appLogs];
    
    for (let i = appLogs.length - 1; i >= 0; i--) {
      const logData = appLogs[i];
      
      try {
        await this.uploadAppLogs(logData);
        this.queue.appLogs.splice(i, 1);
        console.log('✅ App logs synced');
      } catch (error) {
        logData.retries++;
        console.error(`❌ App logs sync failed (retry ${logData.retries}):`, error.message);
        
        if (logData.retries >= 5) {
          this.queue.appLogs.splice(i, 1);
          console.log('🗑️ App logs removed after 5 failed attempts');
        }
      }
    }
  }

  async syncUrlLogs() {
    const urlLogs = [...this.queue.urlLogs];
    
    for (let i = urlLogs.length - 1; i >= 0; i--) {
      const logData = urlLogs[i];
      
      try {
        await this.uploadUrlLogs(logData);
        this.queue.urlLogs.splice(i, 1);
        console.log('✅ URL logs synced');
      } catch (error) {
        logData.retries++;
        console.error(`❌ URL logs sync failed (retry ${logData.retries}):`, error.message);
        
        if (logData.retries >= 5) {
          this.queue.urlLogs.splice(i, 1);
          console.log('🗑️ URL logs removed after 5 failed attempts');
        }
      }
    }
  }

  async syncIdleLogs() {
    const idleLogs = [...this.queue.idleLogs];
    
    for (let i = idleLogs.length - 1; i >= 0; i--) {
      const logData = idleLogs[i];
      
      try {
        await this.uploadIdleLog(logData);
        this.queue.idleLogs.splice(i, 1);
        console.log('✅ Idle log synced');
      } catch (error) {
        logData.retries++;
        console.error(`❌ Idle log sync failed (retry ${logData.retries}):`, error.message);
        
        if (logData.retries >= 5) {
          this.queue.idleLogs.splice(i, 1);
          console.log('🗑️ Idle log removed after 5 failed attempts');
        }
      }
    }
  }

  async syncTimeLogs() {
    const timeLogs = [...this.queue.timeLogs];
    
    for (let i = timeLogs.length - 1; i >= 0; i--) {
      const logData = timeLogs[i];
      
      try {
        await this.uploadTimeLog(logData);
        this.queue.timeLogs.splice(i, 1);
        console.log('✅ Time log synced');
      } catch (error) {
        logData.retries++;
        console.error(`❌ Time log sync failed (retry ${logData.retries}):`, error.message);
        
        if (logData.retries >= 5) {
          this.queue.timeLogs.splice(i, 1);
          console.log('🗑️ Time log removed after 5 failed attempts');
        }
      }
    }
  }

  async syncFraudAlerts() {
    const fraudAlerts = [...this.queue.fraudAlerts];
    
    for (let i = fraudAlerts.length - 1; i >= 0; i--) {
      const alertData = fraudAlerts[i];
      
      try {
        await this.uploadFraudAlert(alertData);
        this.queue.fraudAlerts.splice(i, 1);
        console.log('✅ Fraud alert synced');
      } catch (error) {
        alertData.retries++;
        console.error(`❌ Fraud alert sync failed (retry ${alertData.retries}):`, error.message);
        
        if (alertData.retries >= 5) {
          this.queue.fraudAlerts.splice(i, 1);
          console.log('🗑️ Fraud alert removed after 5 failed attempts');
        }
      }
    }
  }

  // === CONNECTION MONITORING ===
  monitorConnection() {
    setInterval(async () => {
      try {
        // Simple connectivity test
        const { data, error } = await this.supabase
          .from('users')
          .select('id')
          .limit(1);

        const wasOnline = this.isOnline;
        this.isOnline = !error;

        if (!wasOnline && this.isOnline) {
          console.log('🌐 Connection restored - starting sync');
          this.syncQueue();
        } else if (wasOnline && !this.isOnline) {
          console.log('📡 Connection lost - switching to offline mode');
        }

      } catch (error) {
        this.isOnline = false;
      }
    }, 60000); // Check every minute
  }

  // === UTILITY METHODS ===
  getQueueStatus() {
    return {
      screenshots: this.queue.screenshots.length,
      appLogs: this.queue.appLogs.length,
      urlLogs: this.queue.urlLogs.length,
      idleLogs: this.queue.idleLogs.length,
      timeLogs: this.queue.timeLogs.length,
      fraudAlerts: this.queue.fraudAlerts.length,
      total: Object.values(this.queue).reduce((sum, arr) => sum + arr.length, 0),
      isOnline: this.isOnline
    };
  }

  cleanBadUrlLogs() {
    const originalCount = this.queue.urlLogs.length;
    
    // Remove URL logs that contain is_active field (old format causing database errors)
    this.queue.urlLogs = this.queue.urlLogs.filter(urlLog => {
      const hasInvalidField = urlLog.logs && urlLog.logs.some(log => 
        log.hasOwnProperty('is_active')
      );
      return !hasInvalidField;
    });
    
    const removedCount = originalCount - this.queue.urlLogs.length;
    if (removedCount > 0) {
      this.saveQueue();
      console.log(`🧹 Cleaned ${removedCount} bad URL logs from queue (had is_active field)`);
    }
  }

  clearQueue() {
    this.queue = {
      screenshots: [],
      appLogs: [],
      urlLogs: [],
      idleLogs: [],
      timeLogs: []
    };
    this.saveQueue();
    console.log('🗑️ Queue cleared');
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

module.exports = SyncManager; 