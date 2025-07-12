import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Module, Controller, Get, Injectable, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule, Cron, CronExpression } from '@nestjs/schedule';
import { createClient } from '@supabase/supabase-js';

@Injectable()
class SuspiciousActivityService {
  private readonly logger = new Logger(SuspiciousActivityService.name);
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
  }

  @Cron('*/30 * * * *') // Every 30 minutes
  async detectSuspiciousActivity() {
    this.logger.log('🔍 Starting suspicious activity detection...');
    
    try {
      // Get URL logs from last 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: urlLogs, error } = await this.supabase
        .from('url_logs')
        .select('*')
        .gte('started_at', thirtyMinutesAgo)
        .order('started_at', { ascending: false });

      if (error) {
        this.logger.error('Error fetching URL logs:', error);
        return;
      }

      this.logger.log(`📊 Found ${urlLogs?.length || 0} URL logs to analyze`);

      // Define suspicious domains
      const suspiciousDomains = [
        'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com',
        'tiktok.com', 'snapchat.com', 'reddit.com', 'pinterest.com', 'youtube.com',
        'whatsapp.com', 'telegram.org', 'discord.com', 'teams.microsoft.com'
      ];

      let suspiciousCount = 0;

      for (const log of urlLogs || []) {
        const url = (log.site_url || log.url || '').toLowerCase();
        
        // Check if URL contains suspicious domains
        const isSuspicious = suspiciousDomains.some(domain => 
          url.includes(domain)
        );

        if (isSuspicious) {
          suspiciousCount++;
          
          // Check if already flagged (check for similar recent activity)
          const { data: existing } = await this.supabase
            .from('suspicious_activity')
            .select('id')
            .eq('user_id', log.user_id)
            .eq('activity_type', 'social_media')
            .gte('timestamp', thirtyMinutesAgo)
            .like('details', `%${url}%`)
            .single();

          if (!existing) {
            // Insert suspicious activity
            const { error: insertError } = await this.supabase
              .from('suspicious_activity')
              .insert({
                user_id: log.user_id,
                activity_type: 'social_media',
                details: `Visited ${url}`,
                risk_score: 7,
                category: 'social_media',
                timestamp: new Date().toISOString()
              });

            if (insertError) {
              this.logger.error('Error inserting suspicious activity:', insertError);
            } else {
              this.logger.log(`🚨 Flagged suspicious activity: ${url}`);
            }
          }
        }
      }

      this.logger.log(`✅ Suspicious activity detection complete. Found ${suspiciousCount} suspicious URLs`);
      
    } catch (error) {
      this.logger.error('Error in suspicious activity detection:', error);
    }
  }

  @Get('/detect-now')
  async detectNow() {
    await this.detectSuspiciousActivity();
    return { message: 'Suspicious activity detection triggered', timestamp: new Date().toISOString() };
  }
}

@Controller()
class AppController {
  constructor(private readonly suspiciousActivityService: SuspiciousActivityService) {}

  @Get()
  getHello(): string {
    return 'TimeFlow Suspicious Activity Detection Backend is running! 🚀';
  }

  @Get('/health')
  getHealth(): any {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      supabase: {
        url: process.env.SUPABASE_URL ? 'configured' : 'not set',
        service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'not set'
      }
    };
  }

  @Get('/detect-suspicious')
  async detectSuspicious() {
    return await this.suspiciousActivityService.detectNow();
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [SuspiciousActivityService],
})
class MinimalAppModule {}

async function bootstrap() {
  try {
    console.log('🚀 Starting TimeFlow Suspicious Activity Detection Backend...');
    
    const app = await NestFactory.create<NestFastifyApplication>(
      MinimalAppModule,
      new FastifyAdapter({ logger: true }),
    );

    // Enable CORS
    app.enableCors({
      origin: true,
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('TimeFlow Suspicious Activity API')
      .setDescription('Backend service for detecting suspicious activity')
      .setVersion('1.0')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    
    console.log(`✅ TimeFlow Backend running on port ${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/api`);
    console.log(`🔍 Suspicious Activity Detection: Running every 30 minutes`);
    console.log(`🧪 Manual trigger: GET /detect-suspicious`);
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap(); 