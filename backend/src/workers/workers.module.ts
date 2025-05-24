import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ActivityAnalyzerProcessor } from './activity-analyzer.processor';
import { UnusualDetectorProcessor } from './unusual-detector.processor';
import { NotificationPusherProcessor } from './notification-pusher.processor';
import { WorkersService } from './workers.service';
import { CommonModule } from '../common/common.module';
import { InsightsModule } from '../insights/insights.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    CommonModule,
    InsightsModule,
    NotificationsModule,
    BullModule.registerQueue(
      { name: 'activity-analyzer' },
      { name: 'unusual-detector' },
      { name: 'notification-pusher' },
    ),
  ],
  providers: [
    ActivityAnalyzerProcessor,
    UnusualDetectorProcessor,
    NotificationPusherProcessor,
    WorkersService,
  ],
  exports: [WorkersService],
})
export class WorkersModule {} 