import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase.service';
import { ImageService } from '../common/image.service';
import { nanoid } from 'nanoid';

@Injectable()
export class ScreenshotsService {
  private readonly logger = new Logger(ScreenshotsService.name);

  constructor(
    private supabaseService: SupabaseService,
    private imageService: ImageService,
    private configService: ConfigService,
  ) {}

  async uploadBatch(files: Express.Multer.File[], userId: string) {
    try {
      const blurEnabled = this.configService.get<string>('SCREENSHOT_BLUR_ENABLED') === 'true';
      const uploadPromises = files.map(file => this.processAndUploadFile(file, userId, blurEnabled));
      
      const results = await Promise.all(uploadPromises);
      
      // Insert screenshot records to database
      const screenshotRecords = results.map(result => ({
        user_id: userId,
        image_url: result.signedUrl,
        captured_at: new Date().toISOString(),
        file_size: result.fileSize,
        file_path: result.filePath,
      }));

      const { data, error } = await this.supabaseService
        .getClient()
        .from('screenshots')
        .insert(screenshotRecords)
        .select();

      if (error) {
        this.logger.error('Failed to insert screenshot records:', error);
        throw error;
      }

      this.logger.log(`Uploaded ${files.length} screenshots for user ${userId}`);
      return data;
    } catch (error) {
      this.logger.error('Failed to upload screenshot batch:', error);
      throw error;
    }
  }

  private async processAndUploadFile(
    file: Express.Multer.File,
    userId: string,
    blurEnabled: boolean,
  ) {
    try {
      let processedBuffer = file.buffer;

      // Apply blur if enabled
      if (blurEnabled) {
        processedBuffer = await this.imageService.blurImage(file.buffer);
      }

      // Optimize image
      processedBuffer = await this.imageService.optimizeImage(processedBuffer);

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop() || 'jpg';
      const fileName = `${userId}/${Date.now()}-${nanoid(8)}.${fileExtension}`;

      // Upload to Supabase Storage
      await this.supabaseService.uploadFile(
        'screenshots',
        fileName,
        processedBuffer,
        file.mimetype,
      );

      // Get signed URL
      const signedUrl = await this.supabaseService.getSignedUrl(
        'screenshots',
        fileName,
        3600 * 24 * 7, // 7 days
      );

      return {
        filePath: fileName,
        signedUrl,
        fileSize: processedBuffer.length,
      };
    } catch (error) {
      this.logger.error('Failed to process and upload file:', error);
      throw error;
    }
  }

  async getScreenshots(
    userId: string,
    startDate?: string,
    endDate?: string,
    limit = 50,
  ) {
    try {
      const supabase = this.supabaseService.getClient();

      let query = supabase
        .from('screenshots')
        .select('*')
        .eq('user_id', userId);

      if (startDate) {
        query = query.gte('captured_at', startDate);
      }
      if (endDate) {
        query = query.lte('captured_at', endDate);
      }

      const { data, error } = await query
        .order('captured_at', { ascending: false })
        .limit(limit);

      if (error) {
        this.logger.error('Failed to get screenshots:', error);
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to get screenshots:', error);
      throw error;
    }
  }

  async getTimeline(userId: string, date?: string) {
    try {
      const supabase = this.supabaseService.getClient();
      const targetDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('screenshots')
        .select('id, image_url, captured_at, activity_percent, focus_percent')
        .eq('user_id', userId)
        .gte('captured_at', `${targetDate}T00:00:00`)
        .lt('captured_at', `${targetDate}T23:59:59`)
        .order('captured_at', { ascending: true });

      if (error) {
        this.logger.error('Failed to get timeline:', error);
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to get timeline:', error);
      throw error;
    }
  }

  async getActivitySummary(userId: string, startDate?: string, endDate?: string) {
    try {
      const supabase = this.supabaseService.getClient();

      let query = supabase
        .from('screenshots')
        .select('activity_percent, focus_percent, classification, captured_at')
        .eq('user_id', userId)
        .not('activity_percent', 'is', null);

      if (startDate) {
        query = query.gte('captured_at', startDate);
      }
      if (endDate) {
        query = query.lte('captured_at', endDate);
      }

      const { data, error } = await query.order('captured_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get activity summary:', error);
        throw error;
      }

      // Calculate summary statistics
      const totalScreenshots = data.length;
      const avgActivity = totalScreenshots > 0 
        ? data.reduce((sum, s) => sum + (s.activity_percent || 0), 0) / totalScreenshots 
        : 0;
      const avgFocus = totalScreenshots > 0 
        ? data.reduce((sum, s) => sum + (s.focus_percent || 0), 0) / totalScreenshots 
        : 0;

      const classificationCounts = data.reduce((acc, s) => {
        const classification = s.classification || 'unclassified';
        acc[classification] = (acc[classification] || 0) + 1;
        return acc;
      }, {});

      return {
        total_screenshots: totalScreenshots,
        average_activity_percent: Math.round(avgActivity),
        average_focus_percent: Math.round(avgFocus),
        classification_breakdown: classificationCounts,
        screenshots: data,
      };
    } catch (error) {
      this.logger.error('Failed to get activity summary:', error);
      throw error;
    }
  }

  async getLowActivityPeriods(
    userId?: string,
    startDate?: string,
    endDate?: string,
    threshold = 30,
  ) {
    try {
      const supabase = this.supabaseService.getClient();

      let query = supabase
        .from('screenshots')
        .select('user_id, activity_percent, captured_at')
        .lt('activity_percent', threshold)
        .not('activity_percent', 'is', null);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (startDate) {
        query = query.gte('captured_at', startDate);
      }
      if (endDate) {
        query = query.lte('captured_at', endDate);
      }

      const { data, error } = await query.order('captured_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get low activity periods:', error);
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to get low activity periods:', error);
      throw error;
    }
  }

  async updateActivityMetrics(screenshotId: string, activityPercent: number, focusPercent: number) {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('screenshots')
        .update({
          activity_percent: activityPercent,
          focus_percent: focusPercent,
        })
        .eq('id', screenshotId)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update activity metrics:', error);
        throw error;
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to update activity metrics:', error);
      throw error;
    }
  }
} 