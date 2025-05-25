import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';
import { InsightsService } from '../insights/insights.service';

// Mock Cron decorator for now - in production you'd install @nestjs/schedule
const Cron = (expression: string) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  // Mock implementation
};

@Injectable()
export class AnalyticsWorker {
  private readonly logger = new Logger(AnalyticsWorker.name);

  constructor(
    private supabaseService: SupabaseService,
    private insightsService: InsightsService
  ) {}

  // ITEM 10: Activity Analyzer Job - Runs every 15 minutes
  @Cron('*/15 * * * *')
  async analyzeActivity() {
    this.logger.log('🔍 Starting activity analysis job...');
    
    try {
      const supabase = this.supabaseService.getClient();
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

      // Get recent activity data
      const { data: recentScreenshots } = await supabase
        .from('screenshots')
        .select('user_id, activity_percent, focus_percent, captured_at')
        .gte('captured_at', fifteenMinutesAgo.toISOString());

      const { data: recentAppLogs } = await supabase
        .from('app_logs')
        .select('user_id, app_name, timestamp')
        .gte('timestamp', fifteenMinutesAgo.toISOString());

      const { data: recentUrlLogs } = await supabase
        .from('url_logs')
        .select('user_id, domain, timestamp')
        .gte('timestamp', fifteenMinutesAgo.toISOString());

      // Analyze productivity patterns
      const userAnalytics = await this.calculateUserAnalytics(
        recentScreenshots || [],
        recentAppLogs || [],
        recentUrlLogs || []
      );

      // Store analytics results
      for (const analytics of userAnalytics) {
        await this.storeActivityAnalytics(analytics);
      }

      this.logger.log(`✅ Activity analysis completed for ${userAnalytics.length} users`);

    } catch (error) {
      this.logger.error('❌ Activity analysis job failed:', error);
    }
  }

  // ITEM 11: Unusual Activity Detector Job - Runs every 30 minutes
  @Cron('*/30 * * * *')
  async detectUnusualActivity() {
    this.logger.log('🚨 Starting unusual activity detection job...');
    
    try {
      const supabase = this.supabaseService.getClient();
      
      // Get all active users
      const { data: activeUsers } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('status', 'active');

      let totalDetections = 0;

      for (const user of activeUsers || []) {
        try {
          // Run detection for each user
          const detections = await this.insightsService.detectUnusualActivity(user.id);
          
          // Save significant detections
          for (const detection of detections) {
            if (detection.confidence >= 0.6) { // Only save medium+ confidence
              await this.saveUnusualActivityDetection(user.id, detection);
              
              // Create notification for high confidence detections
              if (detection.confidence >= 0.8) {
                await this.createUnusualActivityNotification(user, detection);
              }
              
              totalDetections++;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to detect unusual activity for user ${user.id}:`, error);
        }
      }

      this.logger.log(`✅ Unusual activity detection completed. Found ${totalDetections} detections`);

    } catch (error) {
      this.logger.error('❌ Unusual activity detection job failed:', error);
    }
  }

  // ITEM 12: Notification Pusher Job - Runs every 5 minutes
  @Cron('*/5 * * * *')
  async pushNotifications() {
    this.logger.log('🔔 Starting notification push job...');
    
    try {
      const supabase = this.supabaseService.getClient();
      const now = new Date();

      // Check for productivity alerts
      await this.checkProductivityAlerts();
      
      // Check for idle time alerts
      await this.checkIdleTimeAlerts();
      
      // Check for off-hours activity
      await this.checkOffHoursActivity();
      
      // Check for goal achievements
      await this.checkGoalAchievements();

      this.logger.log('✅ Notification push job completed');

    } catch (error) {
      this.logger.error('❌ Notification push job failed:', error);
    }
  }

  // Daily summary job - Runs at 6 PM every day
  @Cron('0 18 * * *')
  async generateDailySummaries() {
    this.logger.log('📊 Starting daily summary generation...');
    
    try {
      const supabase = this.supabaseService.getClient();
      const today = new Date().toISOString().split('T')[0];

      // Get all active users
      const { data: activeUsers } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('status', 'active');

      for (const user of activeUsers || []) {
        try {
          const summary = await this.generateUserDailySummary(user.id, today);
          await this.storeDailySummary(user.id, today, summary);
          
          // Send summary notification
          await this.insightsService.createNotification(
            user.id,
            'info',
            'Daily Summary Ready',
            `Your productivity summary for ${today} is ready to view.`
          );
        } catch (error) {
          this.logger.error(`Failed to generate daily summary for user ${user.id}:`, error);
        }
      }

      this.logger.log('✅ Daily summary generation completed');

    } catch (error) {
      this.logger.error('❌ Daily summary generation failed:', error);
    }
  }

  // Weekly report job - Runs every Monday at 9 AM
  @Cron('0 9 * * 1')
  async generateWeeklyReports() {
    this.logger.log('📈 Starting weekly report generation...');
    
    try {
      const supabase = this.supabaseService.getClient();
      
      // Get all managers and admins
      const { data: managers } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('role', ['admin', 'manager']);

      for (const manager of managers || []) {
        try {
          const report = await this.generateWeeklyReport(manager.id);
          
          // Send weekly report notification
          await this.insightsService.createNotification(
            manager.id,
            'info',
            'Weekly Report Available',
            'Your team\'s weekly productivity report is ready for review.'
          );
        } catch (error) {
          this.logger.error(`Failed to generate weekly report for manager ${manager.id}:`, error);
        }
      }

      this.logger.log('✅ Weekly report generation completed');

    } catch (error) {
      this.logger.error('❌ Weekly report generation failed:', error);
    }
  }

  // Helper Methods

  private async calculateUserAnalytics(screenshots: any[], appLogs: any[], urlLogs: any[]) {
    const userMap = new Map();

    // Process screenshots
    screenshots.forEach(screenshot => {
      if (!userMap.has(screenshot.user_id)) {
        userMap.set(screenshot.user_id, {
          user_id: screenshot.user_id,
          activity_scores: [],
          focus_scores: [],
          app_usage: new Map(),
          url_visits: new Map(),
          total_screenshots: 0
        });
      }
      
      const user = userMap.get(screenshot.user_id);
      user.activity_scores.push(screenshot.activity_percent || 0);
      user.focus_scores.push(screenshot.focus_percent || 0);
      user.total_screenshots++;
    });

    // Process app logs
    appLogs.forEach(log => {
      if (userMap.has(log.user_id)) {
        const user = userMap.get(log.user_id);
        const count = user.app_usage.get(log.app_name) || 0;
        user.app_usage.set(log.app_name, count + 1);
      }
    });

    // Process URL logs
    urlLogs.forEach(log => {
      if (userMap.has(log.user_id)) {
        const user = userMap.get(log.user_id);
        const count = user.url_visits.get(log.domain) || 0;
        user.url_visits.set(log.domain, count + 1);
      }
    });

    // Calculate analytics
    return Array.from(userMap.values()).map(user => ({
      user_id: user.user_id,
      avg_activity: user.activity_scores.length > 0 
        ? user.activity_scores.reduce((a, b) => a + b, 0) / user.activity_scores.length 
        : 0,
      avg_focus: user.focus_scores.length > 0 
        ? user.focus_scores.reduce((a, b) => a + b, 0) / user.focus_scores.length 
        : 0,
      total_screenshots: user.total_screenshots,
      unique_apps: user.app_usage.size,
      unique_domains: user.url_visits.size,
      most_used_app: this.getMostUsed(user.app_usage),
      most_visited_domain: this.getMostUsed(user.url_visits),
      timestamp: new Date().toISOString()
    }));
  }

  private getMostUsed(usageMap: Map<string, number>): string | null {
    let maxUsage = 0;
    let mostUsed = null;
    
    for (const [item, count] of usageMap.entries()) {
      if (count > maxUsage) {
        maxUsage = count;
        mostUsed = item;
      }
    }
    
    return mostUsed;
  }

  private async storeActivityAnalytics(analytics: any) {
    try {
      const supabase = this.supabaseService.getClient();
      
      await supabase
        .from('activity_analytics')
        .insert(analytics);
        
    } catch (error) {
      this.logger.error('Failed to store activity analytics:', error);
    }
  }

  private async saveUnusualActivityDetection(userId: string, detection: any) {
    try {
      const supabase = this.supabaseService.getClient();
      
      await supabase
        .from('unusual_activity')
        .insert({
          user_id: userId,
          rule_triggered: detection.rule_triggered,
          confidence: detection.confidence,
          duration_hm: detection.duration_hm,
          notes: detection.notes,
          detected_at: new Date().toISOString(),
          reviewed: false
        });
        
    } catch (error) {
      this.logger.error('Failed to save unusual activity detection:', error);
    }
  }

  private async createUnusualActivityNotification(user: any, detection: any) {
    try {
      await this.insightsService.createNotification(
        user.id,
        'warning',
        'Unusual Activity Detected',
        `${detection.rule_triggered}: ${detection.notes}`
      );
      
      // Also notify managers
      const supabase = this.supabaseService.getClient();
      const { data: managers } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'manager']);

      for (const manager of managers || []) {
        await this.insightsService.createNotification(
          manager.id,
          'warning',
          'Team Alert: Unusual Activity',
          `Unusual activity detected for ${user.full_name}: ${detection.notes}`
        );
      }
      
    } catch (error) {
      this.logger.error('Failed to create unusual activity notification:', error);
    }
  }

  private async checkProductivityAlerts() {
    try {
      const supabase = this.supabaseService.getClient();
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Check for users with low productivity in last 2 hours
      const { data: recentScreenshots } = await supabase
        .from('screenshots')
        .select('user_id, activity_percent')
        .gte('captured_at', twoHoursAgo.toISOString());

      // Group and calculate averages manually
      const userActivityMap = new Map();
      recentScreenshots?.forEach(screenshot => {
        if (!userActivityMap.has(screenshot.user_id)) {
          userActivityMap.set(screenshot.user_id, []);
        }
        userActivityMap.get(screenshot.user_id).push(screenshot.activity_percent || 0);
      });

      const lowProductivityUsers = Array.from(userActivityMap.entries())
        .map(([user_id, activities]) => ({
          user_id,
          avg_activity: activities.reduce((sum: number, act: number) => sum + act, 0) / activities.length
        }))
        .filter(user => user.avg_activity < 30);

      for (const user of lowProductivityUsers || []) {
        await this.insightsService.createNotification(
          user.user_id,
          'warning',
          'Low Productivity Alert',
          `Your activity level has been below 30% for the past 2 hours. Consider taking a break or refocusing.`
        );
      }
    } catch (error) {
      this.logger.error('Failed to check productivity alerts:', error);
    }
  }

  private async checkIdleTimeAlerts() {
    try {
      const supabase = this.supabaseService.getClient();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Check for users with excessive idle time
      const { data: recentIdleLogs } = await supabase
        .from('idle_logs')
        .select('user_id, duration_seconds')
        .gte('idle_start', oneHourAgo.toISOString());

      // Group and calculate totals manually
      const userIdleMap = new Map();
      recentIdleLogs?.forEach(log => {
        if (!userIdleMap.has(log.user_id)) {
          userIdleMap.set(log.user_id, 0);
        }
        userIdleMap.set(log.user_id, userIdleMap.get(log.user_id) + (log.duration_seconds || 0));
      });

      const idleUsers = Array.from(userIdleMap.entries())
        .map(([user_id, total_idle]) => ({ user_id, total_idle }))
        .filter(user => user.total_idle > 1800); // More than 30 minutes idle

      for (const user of idleUsers || []) {
        const idleMinutes = Math.round(user.total_idle / 60);
        await this.insightsService.createNotification(
          user.user_id,
          'info',
          'Extended Idle Time',
          `You've been idle for ${idleMinutes} minutes in the past hour. Remember to stay active!`
        );
      }
    } catch (error) {
      this.logger.error('Failed to check idle time alerts:', error);
    }
  }

  private async checkOffHoursActivity() {
    try {
      const supabase = this.supabaseService.getClient();
      const now = new Date();
      const hour = now.getHours();

      // Check if it's outside normal work hours (9 AM - 6 PM)
      if (hour < 9 || hour > 18) {
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

        const { data: offHoursLogs } = await supabase
          .from('time_logs')
          .select('user_id')
          .gte('start_time', thirtyMinutesAgo.toISOString())
          .is('end_time', null);

        for (const log of offHoursLogs || []) {
          // Get user details
          const { data: user } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', log.user_id)
            .single();

          // Notify managers about off-hours activity
          const { data: managers } = await supabase
            .from('users')
            .select('id')
            .in('role', ['admin', 'manager']);

          for (const manager of managers || []) {
            await this.insightsService.createNotification(
              manager.id,
              'info',
              'Off-Hours Activity',
              `${user?.full_name || 'A user'} is working outside normal hours.`
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to check off-hours activity:', error);
    }
  }

  private async checkGoalAchievements() {
    try {
      const supabase = this.supabaseService.getClient();
      const today = new Date().toISOString().split('T')[0];

      // Check for users who achieved 8+ hours today
      const { data: achievers } = await supabase
        .from('daily_activity_summary')
        .select('user_id, total_seconds')
        .eq('activity_date', today)
        .gte('total_seconds', 28800); // 8 hours

      for (const achiever of achievers || []) {
        const hours = Math.round(achiever.total_seconds / 3600 * 10) / 10;
        await this.insightsService.createNotification(
          achiever.user_id,
          'success',
          'Daily Goal Achieved!',
          `Congratulations! You've completed ${hours} hours of productive work today.`
        );
      }
    } catch (error) {
      this.logger.error('Failed to check goal achievements:', error);
    }
  }

  private async generateUserDailySummary(userId: string, date: string) {
    try {
      const supabase = this.supabaseService.getClient();

      // Get user's activity for the day
      const { data: screenshots } = await supabase
        .from('screenshots')
        .select('activity_percent, focus_percent')
        .eq('user_id', userId)
        .gte('captured_at', `${date}T00:00:00Z`)
        .lt('captured_at', `${date}T23:59:59Z`);

      const { data: timeLogs } = await supabase
        .from('time_logs')
        .select('start_time, end_time')
        .eq('user_id', userId)
        .gte('start_time', `${date}T00:00:00Z`)
        .lt('start_time', `${date}T23:59:59Z`);

      const avgActivity = screenshots?.length > 0 
        ? screenshots.reduce((sum, s) => sum + (s.activity_percent || 0), 0) / screenshots.length 
        : 0;

      const avgFocus = screenshots?.length > 0 
        ? screenshots.reduce((sum, s) => sum + (s.focus_percent || 0), 0) / screenshots.length 
        : 0;

      const totalTime = timeLogs?.reduce((sum, log) => {
        if (log.end_time) {
          return sum + (new Date(log.end_time).getTime() - new Date(log.start_time).getTime());
        }
        return sum;
      }, 0) || 0;

      return {
        date,
        total_time_hours: Math.round(totalTime / (1000 * 60 * 60) * 10) / 10,
        avg_activity_percent: Math.round(avgActivity),
        avg_focus_percent: Math.round(avgFocus),
        screenshots_count: screenshots?.length || 0,
        sessions_count: timeLogs?.length || 0
      };
    } catch (error) {
      this.logger.error('Failed to generate user daily summary:', error);
      return null;
    }
  }

  private async storeDailySummary(userId: string, date: string, summary: any) {
    try {
      if (!summary) return;

      const supabase = this.supabaseService.getClient();
      
      await supabase
        .from('daily_summaries')
        .upsert({
          user_id: userId,
          summary_date: date,
          ...summary
        });
        
    } catch (error) {
      this.logger.error('Failed to store daily summary:', error);
    }
  }

  private async generateWeeklyReport(managerId: string) {
    try {
      const supabase = this.supabaseService.getClient();
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get team productivity metrics for the week
      const { data: teamMetrics } = await supabase
        .from('productivity_metrics')
        .select('*')
        .gte('activity_date', weekAgo.toISOString().split('T')[0])
        .lt('activity_date', now.toISOString().split('T')[0]);

      // Generate insights and trends
      const report = {
        week_ending: now.toISOString().split('T')[0],
        team_avg_productivity: teamMetrics?.reduce((sum, m) => sum + (m.productivity_score || 0), 0) / (teamMetrics?.length || 1),
        total_team_hours: teamMetrics?.reduce((sum, m) => sum + (m.total_seconds || 0), 0) / 3600,
        top_performers: teamMetrics?.sort((a, b) => (b.productivity_score || 0) - (a.productivity_score || 0)).slice(0, 3),
        trends: 'Weekly productivity increased by 5% compared to last week' // Mock trend
      };

      return report;
    } catch (error) {
      this.logger.error('Failed to generate weekly report:', error);
      return null;
    }
  }
} 