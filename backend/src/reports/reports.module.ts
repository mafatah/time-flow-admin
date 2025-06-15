import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomatedReportsService } from './automated-reports.service';
import { ReportsController } from './reports.controller';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailReportsService } from './email-reports.service';
import { EmailReportsController } from './email-reports.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CommonModule,
    NotificationsModule,
  ],
  controllers: [ReportsController, EmailReportsController],
  providers: [AutomatedReportsService, EmailReportsService],
  exports: [AutomatedReportsService, EmailReportsService],
})
export class ReportsModule {}