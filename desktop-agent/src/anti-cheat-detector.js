// Removed robotjs dependency - using simplified detection
// const robot = require('robotjs');
const { powerMonitor } = require('electron');

class AntiCheatDetector {
  constructor(config, syncManager = null) {
    this.config = config;
    this.syncManager = syncManager;
    this.activityHistory = [];
    this.mousePositions = [];
    this.keystrokes = [];
    this.suspiciousPatterns = [];
    this.lastScreenshotActivity = null;
    this.repetitivePatternCount = 0;
    this.isMonitoring = false;
    
    // Detection thresholds
    this.REPETITIVE_THRESHOLD = config.suspicious_activity_threshold || 10;
    this.PATTERN_WINDOW = (config.pattern_detection_window_minutes || 15) * 60 * 1000; // 15 minutes
    this.MIN_MOUSE_DISTANCE = config.minimum_mouse_distance || 50; // pixels
    this.KEYBOARD_DIVERSITY_THRESHOLD = config.keyboard_diversity_threshold || 5;
    
    // Pattern detection arrays
    this.recentMouseMoves = [];
    this.recentKeyPresses = [];
    this.mouseClickTimestamps = [];
    this.keyboardTimestamps = [];
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    console.log('🕵️  Starting anti-cheat detection...');
    this.isMonitoring = true;
    
    // Monitor every 2 seconds for suspicious patterns
    this.monitoringInterval = setInterval(() => {
      this.analyzeActivity();
    }, 2000);
    
    // Deep analysis every 30 seconds
    this.deepAnalysisInterval = setInterval(() => {
      this.performDeepAnalysis();
    }, 30000);
    
    // Clean old data every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 5 * 60 * 1000);
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    console.log('🛑 Stopping anti-cheat detection...');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    if (this.deepAnalysisInterval) clearInterval(this.deepAnalysisInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  recordActivity(type, data) {
    const timestamp = Date.now();
    const activity = { type, data, timestamp };
    
    this.activityHistory.push(activity);
    
    switch (type) {
      case 'mouse_move':
        this.recordMouseMove(data, timestamp);
        break;
      case 'mouse_click':
        this.recordMouseClick(data, timestamp);
        break;
      case 'keyboard':
        this.recordKeyboard(data, timestamp);
        break;
      case 'screenshot':
        this.lastScreenshotActivity = timestamp;
        break;
    }
  }

  recordMouseMove(position, timestamp) {
    this.mousePositions.push({ ...position, timestamp });
    this.recentMouseMoves.push({ ...position, timestamp });
    
    // Keep only recent moves (last 2 minutes)
    const cutoff = timestamp - 2 * 60 * 1000;
    this.recentMouseMoves = this.recentMouseMoves.filter(move => move.timestamp > cutoff);
  }

  recordMouseClick(data, timestamp) {
    this.mouseClickTimestamps.push(timestamp);
    
    // Keep only recent clicks (last 10 minutes)
    const cutoff = timestamp - 10 * 60 * 1000;
    this.mouseClickTimestamps = this.mouseClickTimestamps.filter(click => click > cutoff);
  }

  recordKeyboard(data, timestamp) {
    this.keystrokes.push({ ...data, timestamp });
    this.recentKeyPresses.push({ ...data, timestamp });
    this.keyboardTimestamps.push(timestamp);
    
    // Keep only recent keystrokes (last 5 minutes)
    const cutoff = timestamp - 5 * 60 * 1000;
    this.recentKeyPresses = this.recentKeyPresses.filter(key => key.timestamp > cutoff);
    this.keyboardTimestamps = this.keyboardTimestamps.filter(time => time > cutoff);
  }

  analyzeActivity() {
    if (!this.isMonitoring) return;
    
    const suspiciousActivities = [];
    
    // 1. Check for repetitive mouse movements (mouse jigglers)
    const mouseJiggleDetection = this.detectMouseJiggling();
    if (mouseJiggleDetection.suspicious) {
      suspiciousActivities.push({
        type: 'mouse_jiggling',
        severity: 'HIGH',
        details: mouseJiggleDetection,
        timestamp: Date.now()
      });
    }
    
    // 2. Check for repetitive keyboard patterns (auto-clickers)
    const keyboardPatternDetection = this.detectKeyboardPatterns();
    if (keyboardPatternDetection.suspicious) {
      suspiciousActivities.push({
        type: 'keyboard_patterns',
        severity: 'HIGH',
        details: keyboardPatternDetection,
        timestamp: Date.now()
      });
    }
    
    // 3. Check for periodic click patterns (auto-clickers)
    const clickPatternDetection = this.detectClickPatterns();
    if (clickPatternDetection.suspicious) {
      suspiciousActivities.push({
        type: 'click_patterns',
        severity: 'MEDIUM',
        details: clickPatternDetection,
        timestamp: Date.now()
      });
    }
    
    // 4. Check for activity during screenshots (screenshot evasion)
    const screenshotEvasion = this.detectScreenshotEvasion();
    if (screenshotEvasion.suspicious) {
      suspiciousActivities.push({
        type: 'screenshot_evasion',
        severity: 'HIGH',
        details: screenshotEvasion,
        timestamp: Date.now()
      });
    }
    
    // Log suspicious activities
    if (suspiciousActivities.length > 0) {
      this.logSuspiciousActivities(suspiciousActivities);
    }
    
    return suspiciousActivities;
  }

  detectMouseJiggling() {
    if (this.recentMouseMoves.length < 10) return { suspicious: false };
    
    const moves = this.recentMouseMoves.slice(-20); // Last 20 moves
    const distances = [];
    const directions = [];
    
    for (let i = 1; i < moves.length; i++) {
      const prev = moves[i - 1];
      const curr = moves[i];
      
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      distances.push(distance);
      
      const direction = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      directions.push(direction);
    }
    
    // Check for very small movements (jiggling)
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const smallMovements = distances.filter(d => d < 10).length;
    
    // Check for repetitive patterns
    const directionVariance = this.calculateVariance(directions);
    const timeIntervals = moves.map((move, i) => i > 0 ? move.timestamp - moves[i-1].timestamp : 0).slice(1);
    const intervalVariance = this.calculateVariance(timeIntervals);
    
    const suspicious = (
      avgDistance < 20 && // Very small average movement
      smallMovements > 15 && // Many tiny movements
      directionVariance < 0.5 && // Low direction variance (repetitive)
      intervalVariance < 1000 // Consistent timing (robotic)
    );
    
    return {
      suspicious,
      avgDistance,
      smallMovementRatio: smallMovements / distances.length,
      directionVariance,
      intervalVariance,
      confidence: suspicious ? this.calculateConfidence([avgDistance < 20, smallMovements > 15, directionVariance < 0.5]) : 0
    };
  }

  detectKeyboardPatterns() {
    if (this.recentKeyPresses.length < 10) return { suspicious: false };
    
    const keys = this.recentKeyPresses.slice(-50); // Last 50 keystrokes
    const keySequences = keys.map(k => k.key || k.code).filter(Boolean);
    const timeIntervals = keys.map((key, i) => i > 0 ? key.timestamp - keys[i-1].timestamp : 0).slice(1);
    
    // Check for repetitive key sequences
    const keyDiversity = new Set(keySequences).size;
    const avgInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
    const intervalVariance = this.calculateVariance(timeIntervals);
    
    // Check for common fake activity patterns
    const commonPatterns = ['space', 'shift', 'ctrl', 'alt'];
    const patternKeys = keySequences.filter(key => 
      commonPatterns.some(pattern => key.toLowerCase().includes(pattern))
    ).length;
    
    const suspicious = (
      keyDiversity < this.KEYBOARD_DIVERSITY_THRESHOLD && // Low key diversity
      intervalVariance < 500 && // Very consistent timing
      avgInterval < 200 && // Very fast typing
      patternKeys > keySequences.length * 0.7 // Mostly modifier keys
    );
    
    return {
      suspicious,
      keyDiversity,
      avgInterval,
      intervalVariance,
      patternKeyRatio: patternKeys / keySequences.length,
      confidence: suspicious ? this.calculateConfidence([keyDiversity < 5, intervalVariance < 500, avgInterval < 200]) : 0
    };
  }

  detectClickPatterns() {
    if (this.mouseClickTimestamps.length < 5) return { suspicious: false };
    
    const clicks = this.mouseClickTimestamps.slice(-20); // Last 20 clicks
    const intervals = clicks.map((click, i) => i > 0 ? click - clicks[i-1] : 0).slice(1);
    
    if (intervals.length < 3) return { suspicious: false };
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = this.calculateVariance(intervals);
    
    // Check for very regular clicking patterns (auto-clickers)
    const suspicious = (
      intervalVariance < 100 && // Very consistent timing
      avgInterval < 5000 && // Clicks every 5 seconds or less
      intervals.length > 10 // Sustained pattern
    );
    
    return {
      suspicious,
      avgInterval,
      intervalVariance,
      clickCount: clicks.length,
      confidence: suspicious ? this.calculateConfidence([intervalVariance < 100, avgInterval < 5000]) : 0
    };
  }

  detectScreenshotEvasion() {
    if (!this.lastScreenshotActivity) return { suspicious: false };
    
    const now = Date.now();
    const timeSinceScreenshot = now - this.lastScreenshotActivity;
    
    // Check for activity that coincides with screenshot timing
    const recentActivity = this.activityHistory.filter(activity => 
      Math.abs(activity.timestamp - this.lastScreenshotActivity) < 5000 // Within 5 seconds
    );
    
    const activityDuringScreenshot = recentActivity.length;
    const suspicious = activityDuringScreenshot > 10; // Too much activity during screenshot
    
    return {
      suspicious,
      activityDuringScreenshot,
      timeSinceScreenshot,
      confidence: suspicious ? 0.8 : 0
    };
  }

  // Add missing analyzeScreenshotTiming method
  analyzeScreenshotTiming() {
    return this.detectScreenshotEvasion();
  }
  
  // Add missing analyzeScreenshot method
  async analyzeScreenshot(imageBuffer, context = {}) {
    try {
      const analysis = {
        suspicious: false,
        confidence: 0,
        details: {},
        timestamp: Date.now()
      };
      
      // Record screenshot activity
      this.recordActivity('screenshot', { timestamp: Date.now() });
      
      // Analyze activity patterns during screenshot capture
      const screenshotEvasion = this.detectScreenshotEvasion();
      if (screenshotEvasion.suspicious) {
        analysis.suspicious = true;
        analysis.confidence = Math.max(analysis.confidence, screenshotEvasion.confidence);
        analysis.details.screenshotEvasion = screenshotEvasion;
      }
      
      // Analyze current activity levels
      const currentActivityLevel = this.calculateActivityLevel();
      const recentPatterns = this.analyzeActivity();
      
      if (recentPatterns && Array.isArray(recentPatterns) && recentPatterns.length > 0) {
        analysis.suspicious = true;
        analysis.confidence = Math.max(analysis.confidence, 0.7);
        analysis.details.suspiciousPatterns = recentPatterns;
      }
      
      // Factor in context from screenshot capture
      if (context.activityPercent !== undefined && context.focusPercent !== undefined) {
        // Very low activity with very high focus might be suspicious
        if (context.activityPercent < 10 && context.focusPercent > 95) {
          analysis.suspicious = true;
          analysis.confidence = Math.max(analysis.confidence, 0.5);
          analysis.details.staticActivity = {
            activityPercent: context.activityPercent,
            focusPercent: context.focusPercent
          };
        }
        
        // Extremely high activity might indicate automation
        if (context.activityPercent > 90 && (context.mouseClicks > 100 || context.keystrokes > 200)) {
          analysis.suspicious = true;
          analysis.confidence = Math.max(analysis.confidence, 0.6);
          analysis.details.excessiveActivity = {
            activityPercent: context.activityPercent,
            mouseClicks: context.mouseClicks,
            keystrokes: context.keystrokes
          };
        }
      }
      
      return analysis;
      
    } catch (error) {
      console.log('⚠️ Screenshot analysis failed:', error.message);
      return {
        suspicious: false,
        confidence: 0,
        error: error.message
      };
    }
  }

  performDeepAnalysis() {
    console.log('🔍 Performing deep anti-cheat analysis...');
    
    const analysis = {
      timestamp: Date.now(),
      totalSuspiciousEvents: this.suspiciousPatterns.length,
      recentActivityLevel: this.calculateActivityLevel(),
      behaviorProfile: this.generateBehaviorProfile(),
      riskScore: 0
    };
    
    // Calculate overall risk score
    analysis.riskScore = this.calculateRiskScore(analysis);
    
    if (analysis.riskScore > 0.7) {
      console.log('🚨 HIGH RISK: Potential fraudulent activity detected!');
      this.triggerHighRiskAlert(analysis);
    } else if (analysis.riskScore > 0.4) {
      console.log('⚠️  MEDIUM RISK: Suspicious patterns detected');
    }
    
    return analysis;
  }

  calculateActivityLevel() {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;
    
    const recentActivity = this.activityHistory.filter(activity => activity.timestamp > lastHour);
    
    return {
      mouseMovements: recentActivity.filter(a => a.type === 'mouse_move').length,
      mouseClicks: recentActivity.filter(a => a.type === 'mouse_click').length,
      keystrokes: recentActivity.filter(a => a.type === 'keyboard').length,
      totalEvents: recentActivity.length
    };
  }

  generateBehaviorProfile() {
    const mouseData = this.mousePositions.slice(-100);
    const keyData = this.keystrokes.slice(-100);
    
    return {
      mousePatterns: {
        avgSpeed: this.calculateAverageMouseSpeed(mouseData),
        movementVariance: this.calculateMouseMovementVariance(mouseData),
        clickFrequency: this.mouseClickTimestamps.length
      },
      keyboardPatterns: {
        typingSpeed: this.calculateTypingSpeed(keyData),
        keyDiversity: new Set(keyData.map(k => k.key)).size,
        typingRhythm: this.calculateTypingRhythm(keyData)
      }
    };
  }

  calculateRiskScore(analysis) {
    let score = 0;
    
    // Factor in suspicious events (reduced sensitivity)
    score += Math.min(analysis.totalSuspiciousEvents * 0.05, 0.3); // Reduced from 0.1 and 0.5
    
    // Factor in activity patterns (more lenient thresholds)
    const activityLevel = analysis.recentActivityLevel;
    if (activityLevel.totalEvents < 5) score += 0.15; // Reduced from 10 events and 0.3 penalty
    if (activityLevel.totalEvents > 2000) score += 0.1; // Increased threshold from 1000
    
    // Factor in behavior profile (more lenient)
    const behavior = analysis.behaviorProfile;
    if (behavior.mousePatterns.movementVariance < 0.05) score += 0.1; // Reduced from 0.1 and 0.2
    if (behavior.keyboardPatterns.keyDiversity < 3) score += 0.15; // Reduced from 5 keys and 0.3
    
    // CRITICAL FIX: Cap maximum risk score to prevent constant HIGH alerts
    const maxAllowedScore = 0.6; // Never exceed 60% risk for normal operation
    
    return Math.min(score, maxAllowedScore);
  }

  triggerHighRiskAlert(analysis) {
    const alert = {
      type: 'HIGH_RISK_FRAUD_DETECTION',
      timestamp: Date.now(),
      userId: this.config.user_id,
      riskScore: analysis.riskScore,
      confidence: analysis.confidence || 0,
      details: analysis,
      suspiciousPatterns: this.suspiciousPatterns.slice(-10), // Last 10 patterns
      severity: analysis.riskScore > 0.7 ? 'CRITICAL' : 'HIGH',
      behaviorAnalysis: analysis.behaviorProfile,
      activityContext: {
        totalEvents: this.activityHistory.length,
        recentMouseMoves: this.recentMouseMoves.length,
        recentKeyPresses: this.recentKeyPresses.length,
        mouseClickCount: this.mouseClickTimestamps.length
      },
      systemContext: {
        isMonitoring: this.isMonitoring,
        patternWindow: this.PATTERN_WINDOW,
        detectionThreshold: this.REPETITIVE_THRESHOLD
      }
    };
    
    // Log for debugging
    console.log('🚨🚨🚨 FRAUD ALERT:', JSON.stringify(alert, null, 2));
    
    // Send to monitoring service via sync manager
    if (this.syncManager) {
      this.syncManager.addFraudAlert(alert);
    } else {
      console.warn('⚠️ Sync manager not available - fraud alert not transmitted');
    }
  }

  logSuspiciousActivities(activities) {
    activities.forEach(activity => {
      this.suspiciousPatterns.push(activity);
      console.log(`🚨 Suspicious ${activity.type} detected (${activity.severity}):`, activity.details);
      
      // Send high and critical severity activities as fraud alerts
      if (activity.severity === 'HIGH' || activity.severity === 'CRITICAL') {
        const fraudAlert = {
          type: activity.type,
          timestamp: activity.timestamp,
          userId: this.config.user_id,
          riskScore: activity.details.riskScore || 0.5,
          confidence: activity.details.confidence || 0,
          details: activity.details,
          suspiciousPatterns: [activity],
          severity: activity.severity,
          behaviorAnalysis: {},
          activityContext: {
            totalEvents: this.activityHistory.length,
            recentMouseMoves: this.recentMouseMoves.length,
            recentKeyPresses: this.recentKeyPresses.length,
            mouseClickCount: this.mouseClickTimestamps.length
          },
          systemContext: {
            isMonitoring: this.isMonitoring,
            patternWindow: this.PATTERN_WINDOW,
            detectionThreshold: this.REPETITIVE_THRESHOLD
          }
        };
        
        // Send to monitoring service via sync manager
        if (this.syncManager) {
          this.syncManager.addFraudAlert(fraudAlert);
        }
      }
    });
    
    // Keep only recent patterns
    const cutoff = Date.now() - this.PATTERN_WINDOW;
    this.suspiciousPatterns = this.suspiciousPatterns.filter(pattern => pattern.timestamp > cutoff);
  }

  // Utility functions
  calculateVariance(numbers) {
    if (numbers.length < 2) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  calculateConfidence(conditions) {
    const trueConditions = conditions.filter(Boolean).length;
    return trueConditions / conditions.length;
  }

  calculateAverageMouseSpeed(mouseData) {
    if (mouseData.length < 2) return 0;
    
    let totalDistance = 0;
    let totalTime = 0;
    
    for (let i = 1; i < mouseData.length; i++) {
      const prev = mouseData[i - 1];
      const curr = mouseData[i];
      
      const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
      const time = curr.timestamp - prev.timestamp;
      
      totalDistance += distance;
      totalTime += time;
    }
    
    return totalTime > 0 ? totalDistance / totalTime : 0;
  }

  calculateMouseMovementVariance(mouseData) {
    if (mouseData.length < 3) return 0;
    
    const speeds = [];
    for (let i = 1; i < mouseData.length; i++) {
      const prev = mouseData[i - 1];
      const curr = mouseData[i];
      const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
      const time = curr.timestamp - prev.timestamp;
      speeds.push(time > 0 ? distance / time : 0);
    }
    
    return this.calculateVariance(speeds);
  }

  calculateTypingSpeed(keyData) {
    if (keyData.length < 2) return 0;
    
    const timeSpan = keyData[keyData.length - 1].timestamp - keyData[0].timestamp;
    return timeSpan > 0 ? (keyData.length / timeSpan) * 60000 : 0; // WPM approximation
  }

  calculateTypingRhythm(keyData) {
    if (keyData.length < 3) return 0;
    
    const intervals = [];
    for (let i = 1; i < keyData.length; i++) {
      intervals.push(keyData[i].timestamp - keyData[i - 1].timestamp);
    }
    
    return this.calculateVariance(intervals);
  }

  cleanupOldData() {
    const cutoff = Date.now() - this.PATTERN_WINDOW;
    
    // AGGRESSIVE MEMORY LEAK PREVENTION
    const MAX_ITEMS = 1000; // Maximum items to keep in memory
    
    this.activityHistory = this.activityHistory
      .filter(activity => activity.timestamp > cutoff)
      .slice(-MAX_ITEMS); // Keep only latest items
      
    this.mousePositions = this.mousePositions
      .filter(pos => pos.timestamp > cutoff)
      .slice(-MAX_ITEMS);
      
    this.keystrokes = this.keystrokes
      .filter(key => key.timestamp > cutoff)
      .slice(-MAX_ITEMS);
      
    this.suspiciousPatterns = this.suspiciousPatterns
      .filter(pattern => pattern.timestamp > cutoff)
      .slice(-MAX_ITEMS);
    
    // Also limit real-time arrays
    this.recentMouseMoves = this.recentMouseMoves.slice(-50);
    this.recentKeyPresses = this.recentKeyPresses.slice(-50);
    this.mouseClickTimestamps = this.mouseClickTimestamps.slice(-50);
    this.keyboardTimestamps = this.keyboardTimestamps.slice(-50);
    
    console.log('🧹 Aggressive cleanup completed - memory usage reduced');
  }

  // Generate comprehensive report for debug screen
  generateReport() {
    const now = Date.now();
    const recentPatterns = this.suspiciousPatterns.slice(-10);
    const activityLevel = this.calculateActivityLevel();
    const behaviorProfile = this.generateBehaviorProfile();
    
    return {
      timestamp: now,
      isMonitoring: this.isMonitoring,
      suspicious_activities: recentPatterns,
      patterns: recentPatterns.map(pattern => ({
        type: pattern.type,
        severity: pattern.severity,
        confidence: pattern.details.confidence || 0,
        timestamp: pattern.timestamp
      })),
      overall_confidence: recentPatterns.length > 0 ? 
        Math.max(...recentPatterns.map(p => p.details.confidence || 0)) : 0,
      activity_summary: {
        total_events: this.activityHistory.length,
        recent_events: activityLevel.totalEvents,
        mouse_movements: activityLevel.mouseMovements,
        mouse_clicks: activityLevel.mouseClicks,
        keystrokes: activityLevel.keystrokes
      },
      behavior_analysis: behaviorProfile,
      risk_assessment: {
        level: this.suspiciousPatterns.length > 5 ? 'HIGH' : 
               this.suspiciousPatterns.length > 2 ? 'MEDIUM' : 'LOW',
        score: this.calculateRiskScore({
          totalSuspiciousEvents: this.suspiciousPatterns.length,
          recentActivityLevel: activityLevel,
          behaviorProfile: behaviorProfile
        }),
        details: `${this.suspiciousPatterns.length} suspicious patterns detected in the last ${this.PATTERN_WINDOW / 60000} minutes`
      }
    };
  }

  getDetectionReport() {
    return {
      isMonitoring: this.isMonitoring,
      totalSuspiciousEvents: this.suspiciousPatterns.length,
      recentActivity: this.activityHistory.slice(-20),
      currentRiskLevel: this.suspiciousPatterns.length > 5 ? 'HIGH' : 
                       this.suspiciousPatterns.length > 2 ? 'MEDIUM' : 'LOW'
    };
  }
}

module.exports = AntiCheatDetector; 