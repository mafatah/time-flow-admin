import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async detectUnusualActivity(userId?: string) {
    try {
      const supabase = this.supabaseService.getClient();
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

      const detections = [];

      // Rule 1: Low activity (< 30% for 30 minutes)
      let lowActivityQuery = supabase
        .from('screenshots')
        .select('user_id, activity_percent, captured_at')
        .lt('activity_percent', 30)
        .gte('captured_at', thirtyMinutesAgo.toISOString());

      if (userId) {
        lowActivityQuery = lowActivityQuery.eq('user_id', userId);
      }

      const { data: lowActivity } = await lowActivityQuery;

      if (lowActivity && lowActivity.length >= 6) { // 6 screenshots in 30 min = consistent low activity
        detections.push({
          rule_triggered: 'low_activity',
          confidence: 0.8,
          duration_hm: '30m',
          notes: `Low activity detected: ${lowActivity.length} screenshots with <30% activity`,
          user_id: userId || 'multiple',
        });
      }

      // Rule 2: Long session (> 5 hours continuous)
      let longSessionQuery = supabase
        .from('time_logs')
        .select('user_id, started_at, ended_at')
        .gte('started_at', fiveHoursAgo.toISOString())
        .is('ended_at', null);

      if (userId) {
        longSessionQuery = longSessionQuery.eq('user_id', userId);
      }

      const { data: longSessions } = await longSessionQuery;

      if (longSessions && longSessions.length > 0) {
        for (const session of longSessions) {
          const sessionDuration = now.getTime() - new Date(session.started_at).getTime();
          if (sessionDuration > 5 * 60 * 60 * 1000) { // 5 hours
            detections.push({
              rule_triggered: 'long_session',
              confidence: 0.9,
              duration_hm: `${Math.round(sessionDuration / (60 * 60 * 1000))}h`,
              notes: `Long session detected: ${Math.round(sessionDuration / (60 * 60 * 1000))} hours continuous`,
              user_id: session.user_id,
            });
          }
        }
      }

      // Rule 3: Activity drop (>50 point drop in activity)
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      let activityDropQuery = supabase
        .from('screenshots')
        .select('user_id, activity_percent, captured_at')
        .gte('captured_at', twoHoursAgo.toISOString())
        .not('activity_percent', 'is', null)
        .order('captured_at', { ascending: true });

      if (userId) {
        activityDropQuery = activityDropQuery.eq('user_id', userId);
      }

      const { data: recentActivity } = await activityDropQuery;

      if (recentActivity && recentActivity.length >= 4) {
        const firstHalf = recentActivity.slice(0, Math.floor(recentActivity.length / 2));
        const secondHalf = recentActivity.slice(Math.floor(recentActivity.length / 2));

        const firstAvg = firstHalf.reduce((sum, s) => sum + s.activity_percent, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, s) => sum + s.activity_percent, 0) / secondHalf.length;

        if (firstAvg - secondAvg > 50) {
          detections.push({
            rule_triggered: 'activity_drop',
            confidence: 0.7,
            duration_hm: '2h',
            notes: `Activity drop detected: ${Math.round(firstAvg)}% to ${Math.round(secondAvg)}%`,
            user_id: userId || 'multiple',
          });
        }
      }

      return detections;
    } catch (error) {
      this.logger.error('Failed to detect unusual activity:', error);
      throw error;
    }
  }

  async getUnusualActivityHistory(userId?: string, startDate?: string, endDate?: string) {
    try {
      const supabase = this.supabaseService.getClient();

      let query = supabase
        .from('unusual_activity')
        .select('*');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (startDate) {
        query = query.gte('detected_at', startDate);
      }
      if (endDate) {
        query = query.lte('detected_at', endDate);
      }

      const { data, error } = await query.order('detected_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get unusual activity history:', error);
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to get unusual activity history:', error);
      throw error;
    }
  }

  async saveUnusualActivity(detection: any) {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('unusual_activity')
        .insert({
          ...detection,
          detected_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to save unusual activity:', error);
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to save unusual activity:', error);
      throw error;
    }
  }

  async getProductivityInsights(userId: string, startDate?: string, endDate?: string) {
    try {
      const supabase = this.supabaseService.getClient();

      // Get app usage summary
      let appQuery = supabase
        .from('app_logs')
        .select('app_name, category, duration_seconds')
        .eq('user_id', userId);

      if (startDate) {
        appQuery = appQuery.gte('started_at', startDate);
      }
      if (endDate) {
        appQuery = appQuery.lte('started_at', endDate);
      }

      const { data: appData } = await appQuery;

      // Get URL usage summary
      let urlQuery = supabase
        .from('url_logs')
        .select('site_url, category, duration_seconds')
        .eq('user_id', userId);

      if (startDate) {
        urlQuery = urlQuery.gte('started_at', startDate);
      }
      if (endDate) {
        urlQuery = urlQuery.lte('started_at', endDate);
      }

      const { data: urlData } = await urlQuery;

      // Calculate productivity metrics
      const totalAppTime = appData?.reduce((sum, app) => sum + (app.duration_seconds || 0), 0) || 0;
      const totalUrlTime = urlData?.reduce((sum, url) => sum + (url.duration_seconds || 0), 0) || 0;

      const productiveAppTime = appData?.filter(app => app.category === 'core')
        .reduce((sum, app) => sum + (app.duration_seconds || 0), 0) || 0;
      const productiveUrlTime = urlData?.filter(url => url.category === 'core')
        .reduce((sum, url) => sum + (url.duration_seconds || 0), 0) || 0;

      const productivityScore = totalAppTime + totalUrlTime > 0 
        ? Math.round(((productiveAppTime + productiveUrlTime) / (totalAppTime + totalUrlTime)) * 100)
        : 0;

      return {
        productivity_score: productivityScore,
        total_time_seconds: totalAppTime + totalUrlTime,
        productive_time_seconds: productiveAppTime + productiveUrlTime,
        app_breakdown: this.groupByCategory(appData || []),
        url_breakdown: this.groupByCategory(urlData || []),
      };
    } catch (error) {
      this.logger.error('Failed to get productivity insights:', error);
      throw error;
    }
  }

  private groupByCategory(data: any[]) {
    return data.reduce((acc, item) => {
      const category = item.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = {
          category,
          total_duration_seconds: 0,
          total_duration_hours: 0,
        };
      }
      acc[category].total_duration_seconds += item.duration_seconds || 0;
      acc[category].total_duration_hours = Math.round(acc[category].total_duration_seconds / 3600 * 100) / 100;
      return acc;
    }, {});
  }
} 