import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomatedReportsService } from './automated-reports.service';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CommonModule,
    NotificationsModule,
  ],
  providers: [AutomatedReportsService],
  exports: [AutomatedReportsService],
})
export class ReportsModule {}