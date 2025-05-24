import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { InsightsService } from './insights.service';

@ApiTags('insights')
@ApiBearerAuth()
@Controller('api/insights')
@UseGuards(AuthGuard, RolesGuard)
export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  @Get('unusual-activity')
  @ApiOperation({ summary: 'Detect unusual activity patterns' })
  @Roles('admin', 'manager')
  async detectUnusualActivity(@Query('user_id') userId?: string) {
    return this.insightsService.detectUnusualActivity(userId);
  }

  @Get('unusual-activity/history')
  @ApiOperation({ summary: 'Get unusual activity history' })
  async getUnusualActivityHistory(
    @Request() req,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('user_id') userId?: string,
  ) {
    // Admins and managers can view other users' data
    const targetUserId = 
      (req.user.role === 'admin' || req.user.role === 'manager') && userId 
        ? userId 
        : req.user.id;

    return this.insightsService.getUnusualActivityHistory(targetUserId, startDate, endDate);
  }

  @Get('productivity')
  @ApiOperation({ summary: 'Get productivity insights' })
  async getProductivityInsights(
    @Request() req,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('user_id') userId?: string,
  ) {
    // Admins and managers can view other users' data
    const targetUserId = 
      (req.user.role === 'admin' || req.user.role === 'manager') && userId 
        ? userId 
        : req.user.id;

    return this.insightsService.getProductivityInsights(targetUserId, startDate, endDate);
  }
} 