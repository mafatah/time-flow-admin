import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { DeepSeekService, DailyAnalysisReport, ScreenshotAnalysis, URLAnalysis, AppAnalysis } from '../ai/deepseek.service';
import { SupabaseService } from '../common/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

interface AnalysisJobData {
  userId: string;
  date: string;
  analysisType: 'screenshot' | 'url' | 'app' | 'daily_report';
  data?: any;
}

@Injectable()
@Processor('ai-analysis')
export class AIAnalysisProcessor {
  private readonly logger = new Logger(AIAnalysisProcessor.name);

  constructor(
    private deepSeekService: DeepSeekService,
    private supabaseService: SupabaseService,
    private notificationsService: NotificationsService,
  ) {}

  @Process('analyze-screenshots')
  async analyzeScreenshots(job: Job<AnalysisJobData>) {
    try {
      const { userId, date } = job.data;
      this.logger.log(`Starting screenshot analysis for user: ${userId}, date: ${date}`);
      
      const supabase = this.supabaseService.getClient();
      
      // Get screenshots for the day
      const { data: screenshots, error } = await supabase
        .from('screenshots')
        .select('*')
        .eq('user_id', userId)
        .gte('captured_at', `${date}T00:00:00Z`)
        .lt('captured_at', `${date}T23:59:59Z`)
        .order('captured_at', { ascending: true });

      if (error) {
        this.logger.error(`Error fetching screenshots: ${error.message}`);
        return;
      }

      const analyses: ScreenshotAnalysis[] = [];
      
      for (const screenshot of screenshots || []) {
        try {
          if (screenshot.file_path) {
            this.logger.debug(`Analyzing screenshot: ${screenshot.file_path}`);
            
            const analysis = await this.deepSeekService.analyzeScreenshot(
              screenshot.file_path,
              {
                userId,
                capturedAt: screenshot.captured_at,
                activeWindow: screenshot.active_window_title,
                url: screenshot.url
              }
            );
            
            analyses.push(analysis);
            
            // Save AI analysis to database
            await this.saveScreenshotAnalysis(screenshot.id, analysis);
            
            // Check for immediate alerts
            await this.checkForImmediateAlerts(userId, analysis);
            
          }
        } catch (error) {
          this.logger.error(`Error analyzing screenshot ${screenshot.id}: ${error.message}`);
        }
      }

      this.logger.log(`Completed screenshot analysis for user: ${userId}. Analyzed ${analyses.length} screenshots`);
      return analyses;
    } catch (error) {
      this.logger.error('Screenshot analysis failed:', error);
      throw error;
    }
  }

  @Process('analyze-urls')
  async analyzeURLs(job: Job<AnalysisJobData>) {
    try {
      const { userId, date } = job.data;
      this.logger.log(`Starting URL analysis for user: ${userId}, date: ${date}`);
      
      const supabase = this.supabaseService.getClient();
      
      // Get URLs for the day
      const { data: urlLogs, error } = await supabase
        .from('url_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', `${date}T00:00:00Z`)
        .lt('timestamp', `${date}T23:59:59Z`)
        .order('timestamp', { ascending: true });

      if (error) {
        this.logger.error(`Error fetching URL logs: ${error.message}`);
        return;
      }

      const analyses: URLAnalysis[] = [];
      
      for (const urlLog of urlLogs || []) {
        try {
          this.logger.debug(`Analyzing URL: ${urlLog.url}`);
          
          const analysis = await this.deepSeekService.analyzeURL(
            urlLog.url,
            urlLog.duration_seconds || 0,
            {
              userId,
              timestamp: urlLog.timestamp,
              title: urlLog.title
            }
          );
          
          analyses.push(analysis);
          
          // Save AI analysis to database
          await this.saveURLAnalysis(urlLog.id, analysis);
          
        } catch (error) {
          this.logger.error(`Error analyzing URL ${urlLog.url}: ${error.message}`);
        }
      }

      this.logger.log(`Completed URL analysis for user: ${userId}. Analyzed ${analyses.length} URLs`);
      return analyses;
    } catch (error) {
      this.logger.error('URL analysis failed:', error);
      throw error;
    }
  }

  @Process('analyze-apps')
  async analyzeApps(job: Job<AnalysisJobData>) {
    try {
      const { userId, date } = job.data;
      this.logger.log(`Starting app analysis for user: ${userId}, date: ${date}`);
      
      const supabase = this.supabaseService.getClient();
      
      // Get apps for the day
      const { data: appLogs, error } = await supabase
        .from('app_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', `${date}T00:00:00Z`)
        .lt('timestamp', `${date}T23:59:59Z`)
        .order('timestamp', { ascending: true });

      if (error) {
        this.logger.error(`Error fetching app logs: ${error.message}`);
        return;
      }

      const analyses: AppAnalysis[] = [];
      
      for (const appLog of appLogs || []) {
        try {
          this.logger.debug(`Analyzing app: ${appLog.app_name}`);
          
          const analysis = await this.deepSeekService.analyzeApplication(
            appLog.app_name,
            appLog.duration_seconds || 0,
            {
              userId,
              timestamp: appLog.timestamp,
              category: appLog.category
            }
          );
          
          analyses.push(analysis);
          
          // Save AI analysis to database
          await this.saveAppAnalysis(appLog.id, analysis);
          
        } catch (error) {
          this.logger.error(`Error analyzing app ${appLog.app_name}: ${error.message}`);
        }
      }

      this.logger.log(`Completed app analysis for user: ${userId}. Analyzed ${analyses.length} apps`);
      return analyses;
    } catch (error) {
      this.logger.error('App analysis failed:', error);
      throw error;
    }
  }

  @Process('generate-daily-report')
  async generateDailyReport(job: Job<AnalysisJobData>) {
    try {
      const { userId, date } = job.data;
      this.logger.log(`Generating daily report for user: ${userId}, date: ${date}`);
      
      // Get all AI analyses for the day
      const [screenshots, urls, apps] = await Promise.all([
        this.getScreenshotAnalyses(userId, date),
        this.getURLAnalyses(userId, date),
        this.getAppAnalyses(userId, date)
      ]);

      // Generate comprehensive daily report
      const report = await this.deepSeekService.generateDailyReport(
        userId,
        date,
        screenshots,
        urls,
        apps,
        {
          workingHours: 8, // Default 8-hour workday
          expectedProductivity: 70 // Expected 70% productivity
        }
      );

      // Save daily report to database
      await this.saveDailyReport(report);

      // Send notifications based on report findings
      await this.processDailyReportAlerts(report);

      this.logger.log(`Completed daily report generation for user: ${userId}`);
      return report;
    } catch (error) {
      this.logger.error('Daily report generation failed:', error);
      throw error;
    }
  }

  @Process('real-time-analysis')
  async realTimeAnalysis(job: Job<AnalysisJobData>) {
    try {
      const { userId, analysisType, data } = job.data;
      this.logger.log(`Real-time analysis for user: ${userId}, type: ${analysisType}`);
      
      switch (analysisType) {
        case 'screenshot':
          if (data.screenshotPath) {
            const analysis = await this.deepSeekService.analyzeScreenshot(data.screenshotPath, data.context);
            await this.saveScreenshotAnalysis(data.screenshotId, analysis);
            await this.checkForImmediateAlerts(userId, analysis);
            return analysis;
          }
          break;
          
        case 'url':
          if (data.url) {
            const analysis = await this.deepSeekService.analyzeURL(data.url, data.duration || 0, data.context);
            await this.saveURLAnalysis(data.urlLogId, analysis);
            return analysis;
          }
          break;
          
        case 'app':
          if (data.appName) {
            const analysis = await this.deepSeekService.analyzeApplication(data.appName, data.duration || 0, data.context);
            await this.saveAppAnalysis(data.appLogId, analysis);
            return analysis;
          }
          break;
      }
    } catch (error) {
      this.logger.error('Real-time analysis failed:', error);
      throw error;
    }
  }

  private async saveScreenshotAnalysis(screenshotId: string, analysis: ScreenshotAnalysis) {
    try {
      const supabase = this.supabaseService.getClient();
      
      const { error } = await supabase
        .from('ai_screenshot_analysis')
        .upsert({
          screenshot_id: screenshotId,
          is_working: analysis.analysis.isWorking,
          working_score: analysis.analysis.workingScore,
          working_reason: analysis.analysis.workingReason,
          detected_activity: analysis.analysis.detectedActivity,
          productivity_level: analysis.analysis.productivityLevel,
          categories: analysis.analysis.categories,
          concerns: analysis.analysis.concerns,
          recommendations: analysis.analysis.recommendations,
          confidence: analysis.analysis.confidence,
          visual_elements: analysis.visual_elements,
          text_detected: analysis.text_detected,
          applications_identified: analysis.applications_identified,
          suspicious_indicators: analysis.suspicious_indicators,
          analyzed_at: new Date().toISOString()
        });

      if (error) {
        this.logger.error(`Error saving screenshot analysis: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Error saving screenshot analysis: ${error.message}`);
    }
  }

  private async saveURLAnalysis(urlLogId: string, analysis: URLAnalysis) {
    try {
      const supabase = this.supabaseService.getClient();
      
      const { error } = await supabase
        .from('ai_url_analysis')
        .upsert({
          url_log_id: urlLogId,
          url: analysis.url,
          domain: analysis.domain,
          category: analysis.category,
          work_related: analysis.workRelated,
          productivity_score: analysis.productivityScore,
          risk_level: analysis.riskLevel,
          analysis: analysis.analysis,
          analyzed_at: new Date().toISOString()
        });

      if (error) {
        this.logger.error(`Error saving URL analysis: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Error saving URL analysis: ${error.message}`);
    }
  }

  private async saveAppAnalysis(appLogId: string, analysis: AppAnalysis) {
    try {
      const supabase = this.supabaseService.getClient();
      
      const { error } = await supabase
        .from('ai_app_analysis')
        .upsert({
          app_log_id: appLogId,
          app_name: analysis.app_name,
          category: analysis.category,
          work_related: analysis.workRelated,
          productivity_score: analysis.productivityScore,
          usage_pattern: analysis.usagePattern,
          analysis: analysis.analysis,
          analyzed_at: new Date().toISOString()
        });

      if (error) {
        this.logger.error(`Error saving app analysis: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Error saving app analysis: ${error.message}`);
    }
  }

  private async saveDailyReport(report: DailyAnalysisReport) {
    try {
      const supabase = this.supabaseService.getClient();
      
      const { error } = await supabase
        .from('ai_daily_reports')
        .upsert({
          user_id: report.user_id,
          date: report.date,
          overall_productivity_score: report.overall_productivity_score,
          working_hours: report.working_hours,
          distraction_time: report.distraction_time,
          focus_periods: report.focus_periods,
          top_distractions: report.top_distractions,
          productivity_trend: report.productivity_trend,
          key_insights: report.key_insights,
          recommendations: report.recommendations,
          detailed_analysis: report.detailed_analysis,
          generated_at: new Date().toISOString()
        });

      if (error) {
        this.logger.error(`Error saving daily report: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Error saving daily report: ${error.message}`);
    }
  }

  private async getScreenshotAnalyses(userId: string, date: string): Promise<ScreenshotAnalysis[]> {
    try {
      const supabase = this.supabaseService.getClient();
      
      const { data, error } = await supabase
        .from('ai_screenshot_analysis')
        .select(`
          *,
          screenshots!inner(user_id, captured_at)
        `)
        .eq('screenshots.user_id', userId)
        .gte('screenshots.captured_at', `${date}T00:00:00Z`)
        .lt('screenshots.captured_at', `${date}T23:59:59Z`);

      if (error) {
        this.logger.error(`Error fetching screenshot analyses: ${error.message}`);
        return [];
      }

      return data?.map(item => ({
        screenshot_id: item.screenshot_id,
        analysis: {
          isWorking: item.is_working,
          workingScore: item.working_score,
          workingReason: item.working_reason,
          detectedActivity: item.detected_activity,
          productivityLevel: item.productivity_level,
          categories: item.categories || [],
          concerns: item.concerns || [],
          recommendations: item.recommendations || [],
          confidence: item.confidence,
          timestamp: item.analyzed_at
        },
        visual_elements: item.visual_elements || [],
        text_detected: item.text_detected || '',
        applications_identified: item.applications_identified || [],
        suspicious_indicators: item.suspicious_indicators || []
      })) || [];
    } catch (error) {
      this.logger.error(`Error fetching screenshot analyses: ${error.message}`);
      return [];
    }
  }

  private async getURLAnalyses(userId: string, date: string): Promise<URLAnalysis[]> {
    try {
      const supabase = this.supabaseService.getClient();
      
      const { data, error } = await supabase
        .from('ai_url_analysis')
        .select(`
          *,
          url_logs!inner(user_id, timestamp)
        `)
        .eq('url_logs.user_id', userId)
        .gte('url_logs.timestamp', `${date}T00:00:00Z`)
        .lt('url_logs.timestamp', `${date}T23:59:59Z`);

      if (error) {
        this.logger.error(`Error fetching URL analyses: ${error.message}`);
        return [];
      }

      return data?.map(item => ({
        url: item.url,
        domain: item.domain,
        category: item.category,
        workRelated: item.work_related,
        productivityScore: item.productivity_score,
        riskLevel: item.risk_level,
        analysis: item.analysis
      })) || [];
    } catch (error) {
      this.logger.error(`Error fetching URL analyses: ${error.message}`);
      return [];
    }
  }

  private async getAppAnalyses(userId: string, date: string): Promise<AppAnalysis[]> {
    try {
      const supabase = this.supabaseService.getClient();
      
      const { data, error } = await supabase
        .from('ai_app_analysis')
        .select(`
          *,
          app_logs!inner(user_id, timestamp)
        `)
        .eq('app_logs.user_id', userId)
        .gte('app_logs.timestamp', `${date}T00:00:00Z`)
        .lt('app_logs.timestamp', `${date}T23:59:59Z`);

      if (error) {
        this.logger.error(`Error fetching app analyses: ${error.message}`);
        return [];
      }

      return data?.map(item => ({
        app_name: item.app_name,
        category: item.category,
        workRelated: item.work_related,
        productivityScore: item.productivity_score,
        usagePattern: item.usage_pattern,
        analysis: item.analysis
      })) || [];
    } catch (error) {
      this.logger.error(`Error fetching app analyses: ${error.message}`);
      return [];
    }
  }

  private async checkForImmediateAlerts(userId: string, analysis: ScreenshotAnalysis) {
    try {
      const { analysis: result } = analysis;
      
      // Check for critical productivity issues
      if (result.workingScore < 30 && result.confidence > 80) {
        await this.notificationsService.createNotification(
          userId,
          'productivity_alert',
          {
            title: 'Low Productivity Alert',
            message: `AI detected very low productivity: ${result.detectedActivity}. Score: ${result.workingScore}%`,
            workingScore: result.workingScore,
            detectedActivity: result.detectedActivity
          }
        );
      }
      
      // Check for suspicious activities
      if (result.concerns.length > 0 && result.confidence > 70) {
        await this.notificationsService.createNotification(
          userId,
          'suspicious_activity',
          {
            title: 'Suspicious Activity Detected',
            message: `AI flagged potential issues: ${result.concerns.join(', ')}`,
            concerns: result.concerns,
            confidence: result.confidence
          }
        );
      }
      
      // Check for entertainment/social media during work hours
      const workHours = this.isWorkingHours();
      if (workHours && result.categories.some(cat => 
        ['social media', 'entertainment', 'gaming', 'shopping'].includes(cat.toLowerCase())
      )) {
        await this.notificationsService.createNotification(
          userId,
          'distraction_alert',
          {
            title: 'Distraction During Work Hours',
            message: `AI detected non-work activity: ${result.detectedActivity}`,
            detectedActivity: result.detectedActivity,
            categories: result.categories
          }
        );
      }
    } catch (error) {
      this.logger.error(`Error checking immediate alerts: ${error.message}`);
    }
  }

  private async processDailyReportAlerts(report: DailyAnalysisReport) {
    try {
      // Low productivity alert
      if (report.overall_productivity_score < 50) {
        await this.notificationsService.createNotification(
          report.user_id,
          'daily_productivity',
          {
            title: 'Daily Productivity Report - Needs Attention',
            message: `Overall productivity score: ${report.overall_productivity_score}%. ${report.detailed_analysis}`,
            productivityScore: report.overall_productivity_score,
            date: report.date
          }
        );
      }
      
      // High distraction time alert
      if (report.distraction_time > 2) { // More than 2 hours of distraction
        await this.notificationsService.createNotification(
          report.user_id,
          'distraction_report',
          {
            title: 'High Distraction Time Detected',
            message: `${report.distraction_time} hours of distraction time detected. Top distractions: ${report.top_distractions.join(', ')}`,
            distractionTime: report.distraction_time,
            topDistractions: report.top_distractions
          }
        );
      }
      
      // Declining trend alert
      if (report.productivity_trend === 'declining') {
        await this.notificationsService.createNotification(
          report.user_id,
          'trend_alert',
          {
            title: 'Declining Productivity Trend',
            message: `AI analysis shows declining productivity trend. Recommendations: ${report.recommendations.join(', ')}`,
            trend: report.productivity_trend,
            recommendations: report.recommendations
          }
        );
      }
    } catch (error) {
      this.logger.error(`Error processing daily report alerts: ${error.message}`);
    }
  }

  private isWorkingHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 9 && hour <= 17; // 9 AM to 5 PM
  }
}