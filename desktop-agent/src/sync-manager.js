const fs = require('fs');
const path = require('path');

class SyncManager {
  constructor(config) {
    this.config = config;
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.retryQueue = [];
    this.maxRetries = 3;
    this.syncInterval = 30000; // 30 seconds
    this.batchSize = 10;
    this.lastSyncTime = null;
    
    // Local storage paths
    this.dataDir = path.join(__dirname, '..', 'data');
    this.queueFile = path.join(this.dataDir, 'sync-queue.json');
    this.cacheFile = path.join(this.dataDir, 'data-cache.json');
    this.screenshotsDir = path.join(this.dataDir, 'screenshots');
    
    this.ensureDirectories();
    this.loadQueues();
    this.setupEventListeners();
    this.startSyncLoop();
  }

  ensureDirectories() {
    const dirs = [this.dataDir, this.screenshotsDir];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadQueues() {
    try {
      if (fs.existsSync(this.queueFile)) {
        const data = JSON.parse(fs.readFileSync(this.queueFile, 'utf8'));
        this.syncQueue = data.syncQueue || [];
        this.retryQueue = data.retryQueue || [];
        this.lastSyncTime = data.lastSyncTime || null;
      }
    } catch (error) {
      console.error('Failed to load sync queues:', error);
      this.syncQueue = [];
      this.retryQueue = [];
    }
  }

  saveQueues() {
    try {
      const data = {
        syncQueue: this.syncQueue,
        retryQueue: this.retryQueue,
        lastSyncTime: this.lastSyncTime
      };
      fs.writeFileSync(this.queueFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save sync queues:', error);
    }
  }

  setupEventListeners() {
    // Network status monitoring
    window.addEventListener('online', () => {
      console.log('📡 Connection restored - starting sync');
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost - queuing data locally');
      this.isOnline = false;
    });
  }

  startSyncLoop() {
    setInterval(() => {
      if (this.isOnline) {
        this.processQueue();
        this.pullLatestData();
      }
    }, this.syncInterval);
  }

  // === PUSH DATA METHODS ===

  async addTimeLog(timeLogData) {
    const item = {
      id: this.generateId(),
      type: 'time_log',
      data: {
        ...timeLogData,
        user_id: this.config.user_id,
        project_id: this.config.project_id,
        timestamp: new Date().toISOString()
      },
      timestamp: Date.now(),
      retries: 0
    };

    this.syncQueue.push(item);
    this.saveQueues();

    if (this.isOnline) {
      await this.processQueue();
    }

    return item.id;
  }

  async addAppLogs(appLogsArray) {
    const item = {
      id: this.generateId(),
      type: 'app_logs_batch',
      data: appLogsArray.map(log => ({
        ...log,
        user_id: this.config.user_id,
        project_id: this.config.project_id
      })),
      timestamp: Date.now(),
      retries: 0
    };

    this.syncQueue.push(item);
    this.saveQueues();

    if (this.isOnline) {
      await this.processQueue();
    }

    return item.id;
  }

  async addUrlLogs(urlLogsArray) {
    const item = {
      id: this.generateId(),
      type: 'url_logs_batch',
      data: urlLogsArray.map(log => ({
        ...log,
        user_id: this.config.user_id,
        project_id: this.config.project_id
      })),
      timestamp: Date.now(),
      retries: 0
    };

    this.syncQueue.push(item);
    this.saveQueues();

    if (this.isOnline) {
      await this.processQueue();
    }

    return item.id;
  }

  async addScreenshot(screenshotBuffer, metadata = {}) {
    // Save screenshot locally first
    const fileName = `screenshot_${Date.now()}.png`;
    const localPath = path.join(this.screenshotsDir, fileName);
    
    try {
      fs.writeFileSync(localPath, screenshotBuffer);
    } catch (error) {
      console.error('Failed to save screenshot locally:', error);
      throw error;
    }

    const item = {
      id: this.generateId(),
      type: 'screenshot',
      data: {
        fileName,
        localPath,
        user_id: this.config.user_id,
        project_id: this.config.project_id,
        captured_at: new Date().toISOString(),
        ...metadata
      },
      timestamp: Date.now(),
      retries: 0
    };

    this.syncQueue.push(item);
    this.saveQueues();

    if (this.isOnline) {
      await this.processQueue();
    }

    return item.id;
  }

  async addScreenshotBatch(screenshots) {
    const savedScreenshots = [];

    // Save all screenshots locally first
    for (const screenshot of screenshots) {
      const fileName = `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
      const localPath = path.join(this.screenshotsDir, fileName);
      
      try {
        fs.writeFileSync(localPath, screenshot.buffer);
        savedScreenshots.push({
          fileName,
          localPath,
          ...screenshot.metadata
        });
      } catch (error) {
        console.error('Failed to save screenshot locally:', error);
      }
    }

    const item = {
      id: this.generateId(),
      type: 'screenshot_batch',
      data: {
        screenshots: savedScreenshots,
        user_id: this.config.user_id,
        project_id: this.config.project_id
      },
      timestamp: Date.now(),
      retries: 0
    };

    this.syncQueue.push(item);
    this.saveQueues();

    if (this.isOnline) {
      await this.processQueue();
    }

    return item.id;
  }

  // === PULL DATA METHODS ===

  async pullLatestData() {
    if (!this.isOnline) return;

    try {
      await Promise.all([
        this.pullDashboardData(),
        this.pullUserSettings(),
        this.pullProjectData()
      ]);
    } catch (error) {
      console.error('Failed to pull latest data:', error);
    }
  }

  async pullDashboardData() {
    try {
      const response = await this.apiRequest('GET', '/api/dashboard');
      
      if (response.ok) {
        const dashboardData = await response.json();
        this.saveToCache('dashboard', dashboardData);
        this.notifyDataUpdate('dashboard', dashboardData);
      }
    } catch (error) {
      console.error('Failed to pull dashboard data:', error);
    }
  }

  async pullUserSettings() {
    try {
      const response = await this.apiRequest('GET', '/api/users/settings');
      
      if (response.ok) {
        const settings = await response.json();
        this.saveToCache('settings', settings);
        this.notifyDataUpdate('settings', settings);
      }
    } catch (error) {
      console.error('Failed to pull user settings:', error);
    }
  }

  async pullProjectData() {
    try {
      const response = await this.apiRequest('GET', `/api/projects/${this.config.project_id}`);
      
      if (response.ok) {
        const projectData = await response.json();
        this.saveToCache('project', projectData);
        this.notifyDataUpdate('project', projectData);
      }
    } catch (error) {
      console.error('Failed to pull project data:', error);
    }
  }

  // === QUEUE PROCESSING ===

  async processQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    console.log(`🔄 Processing ${this.syncQueue.length} items in sync queue`);

    // Process items in batches
    const batch = this.syncQueue.splice(0, this.batchSize);
    
    for (const item of batch) {
      try {
        await this.syncItem(item);
        console.log(`✅ Synced ${item.type} (${item.id})`);
      } catch (error) {
        console.error(`❌ Failed to sync ${item.type} (${item.id}):`, error);
        
        // Add to retry queue if not exceeded max retries
        if (item.retries < this.maxRetries) {
          item.retries++;
          item.lastError = error.message;
          item.nextRetry = Date.now() + (item.retries * 30000); // Exponential backoff
          this.retryQueue.push(item);
        } else {
          console.error(`🚫 Max retries exceeded for ${item.type} (${item.id})`);
        }
      }
    }

    this.lastSyncTime = Date.now();
    this.saveQueues();

    // Process retry queue
    await this.processRetryQueue();

    // Continue processing if there are more items
    if (this.syncQueue.length > 0) {
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  async processRetryQueue() {
    const now = Date.now();
    const readyToRetry = this.retryQueue.filter(item => item.nextRetry <= now);
    
    if (readyToRetry.length === 0) return;

    console.log(`🔁 Retrying ${readyToRetry.length} failed items`);

    this.retryQueue = this.retryQueue.filter(item => item.nextRetry > now);

    for (const item of readyToRetry) {
      try {
        await this.syncItem(item);
        console.log(`✅ Retry successful for ${item.type} (${item.id})`);
      } catch (error) {
        console.error(`❌ Retry failed for ${item.type} (${item.id}):`, error);
        
        if (item.retries < this.maxRetries) {
          item.retries++;
          item.lastError = error.message;
          item.nextRetry = Date.now() + (item.retries * 30000);
          this.retryQueue.push(item);
        } else {
          console.error(`🚫 Max retries exceeded for ${item.type} (${item.id})`);
        }
      }
    }

    this.saveQueues();
  }

  async syncItem(item) {
    switch (item.type) {
      case 'time_log':
        return await this.syncTimeLog(item.data);
      
      case 'app_logs_batch':
        return await this.syncAppLogsBatch(item.data);
      
      case 'url_logs_batch':
        return await this.syncUrlLogsBatch(item.data);
      
      case 'screenshot':
        return await this.syncScreenshot(item.data);
      
      case 'screenshot_batch':
        return await this.syncScreenshotBatch(item.data);
      
      default:
        throw new Error(`Unknown sync item type: ${item.type}`);
    }
  }

  // === INDIVIDUAL SYNC METHODS ===

  async syncTimeLog(data) {
    if (data.action === 'start') {
      const response = await this.apiRequest('POST', '/api/time/start', data);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } else if (data.action === 'stop') {
      const response = await this.apiRequest('POST', '/api/time/stop', data);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
  }

  async syncAppLogsBatch(data) {
    const response = await this.apiRequest('POST', '/api/apps', data);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  async syncUrlLogsBatch(data) {
    const response = await this.apiRequest('POST', '/api/urls', data);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  async syncScreenshot(data) {
    try {
      const imageBuffer = fs.readFileSync(data.localPath);
      
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      formData.append('screenshots', blob, data.fileName);

      const response = await fetch(`${this.getApiUrl()}/api/screenshots/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.auth_token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Delete local file after successful upload
      fs.unlinkSync(data.localPath);
    } catch (error) {
      throw error;
    }
  }

  async syncScreenshotBatch(data) {
    try {
      const formData = new FormData();
      
      for (const screenshot of data.screenshots) {
        const imageBuffer = fs.readFileSync(screenshot.localPath);
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        formData.append('screenshots', blob, screenshot.fileName);
      }

      const response = await fetch(`${this.getApiUrl()}/api/screenshots/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.auth_token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Delete local files after successful upload
      for (const screenshot of data.screenshots) {
        fs.unlinkSync(screenshot.localPath);
      }
    } catch (error) {
      throw error;
    }
  }

  // === UTILITY METHODS ===

  async apiRequest(method, endpoint, data = null) {
    const url = `${this.getApiUrl()}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.auth_token}`,
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    return fetch(url, options);
  }

  getApiUrl() {
    return this.config.backend_url || 'http://localhost:3000';
  }

  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  saveToCache(key, data) {
    try {
      let cache = {};
      if (fs.existsSync(this.cacheFile)) {
        cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      }
      
      cache[key] = {
        data,
        timestamp: Date.now()
      };
      
      fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }

  loadFromCache(key) {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        return cache[key]?.data || null;
      }
    } catch (error) {
      console.error('Failed to load from cache:', error);
    }
    return null;
  }

  notifyDataUpdate(type, data) {
    // Emit custom events for UI updates
    window.dispatchEvent(new CustomEvent('dataUpdate', {
      detail: { type, data }
    }));
  }

  // === STATUS METHODS ===

  getStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      retryQueueLength: this.retryQueue.length,
      lastSyncTime: this.lastSyncTime,
      lastSyncAgo: this.lastSyncTime ? Date.now() - this.lastSyncTime : null
    };
  }

  async forceSync() {
    if (!this.isOnline) {
      throw new Error('Cannot force sync while offline');
    }
    
    console.log('🚀 Force sync initiated');
    await this.processQueue();
    await this.pullLatestData();
  }

  clearQueues() {
    this.syncQueue = [];
    this.retryQueue = [];
    this.saveQueues();
    console.log('🗑️ Sync queues cleared');
  }

  async healthCheck() {
    try {
      const response = await this.apiRequest('GET', '/api/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

module.exports = SyncManager; 