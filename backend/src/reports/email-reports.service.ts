import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.service';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';

interface ReportConfiguration {
  id: string;
  name: string;
  template_type: string;
  schedule_cron: string;
  subject_template: string;
  include_summary: boolean;
  include_employee_details: boolean;
  include_alerts: boolean;
  include_projects: boolean;
  alert_settings: any;
  filters: any;
}

interface EmployeeData {
  id: string;
  name: string;
  email: string;
  totalHours: number;
  activePercentage: number;
  firstStart?: string;
  lastStop?: string;
  projects: string[];
  alerts: string[];
}

interface AlertData {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  employee: string;
}

@Injectable()
export class EmailReportsService {
  private readonly logger = new Logger(EmailReportsService.name);
  private readonly resendApiKey: string;

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!this.resendApiKey) {
      this.logger.warn('RESEND_API_KEY not configured - email reports will not work');
    }
  }

  // Dynamic cron job that reads from database
  @Cron('0 */15 * * * *') // Check every 15 minutes for due reports
  async processScheduledReports() {
    try {
      const dueReports = await this.getDueReports();
      
      for (const report of dueReports) {
        await this.sendReport(report.id, false);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled reports:', error);
    }
  }

  async getDueReports(): Promise<ReportConfiguration[]> {
    const supabase = this.supabaseService.getClient();
    
    // Get all active report configurations
    const { data: configs, error } = await supabase
      .from('report_configurations')
      .select(`
        id, name, template_type, schedule_cron, subject_template,
        include_summary, include_employee_details, include_alerts, include_projects,
        alert_settings, filters
      `)
      .eq('is_active', true);

    if (error) {
      this.logger.error('Error fetching report configurations:', error);
      return [];
    }

    // Filter reports that are due (simplified logic - in production you'd use a proper cron parser)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    return configs.filter(config => {
      if (!config.schedule_cron) return false;
      
      // Simple cron parsing for our use cases
      if (config.schedule_cron === '0 19 * * *' && currentHour === 19 && currentMinute < 15) {
        return true; // Daily at 7 PM
      }
      if (config.schedule_cron === '0 9 * * 1' && currentDay === 1 && currentHour === 9 && currentMinute < 15) {
        return true; // Weekly on Monday at 9 AM
      }
      
      return false;
    });
  }

  async sendReport(configId: string, isTest = false): Promise<{ success: boolean; message: string; recipients?: number }> {
    try {
      this.logger.log(`📧 ${isTest ? 'Testing' : 'Sending'} report for config: ${configId}`);

      const config = await this.getReportConfiguration(configId);
      if (!config) {
        throw new Error('Report configuration not found');
      }

      const recipients = await this.getReportRecipients(configId);
      if (recipients.length === 0) {
        throw new Error('No recipients configured for this report');
      }

      const reportData = await this.generateReportData(config);
      const emailContent = this.generateEmailContent(config, reportData);

      const subject = this.processSubjectTemplate(config.subject_template, reportData);

      // Send email using Resend
      const emailResult = await this.sendEmailViaResend(
        recipients.map(r => r.email),
        subject,
        emailContent
      );

      // Log the report
      await this.logReportHistory(configId, recipients.length, isTest ? 'test' : 'sent', emailResult.id, reportData);

      this.logger.log(`✅ Report sent successfully to ${recipients.length} recipients`);
      
      return {
        success: true,
        message: `Report sent to ${recipients.length} recipients`,
        recipients: recipients.length
      };

    } catch (error) {
      this.logger.error(`❌ Error sending report:`, error);
      
      // Log the error
      await this.logReportHistory(configId, 0, 'failed', null, null, error.message);
      
      return {
        success: false,
        message: error.message
      };
    }
  }

  async testEmailConfiguration(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.resendApiKey) {
        throw new Error('RESEND_API_KEY not configured');
      }

      // Get first admin user as test recipient
      const supabase = this.supabaseService.getClient();
      const { data: admins, error } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('role', 'admin')
        .limit(1);

      if (error || !admins || admins.length === 0) {
        throw new Error('No admin users found to test email');
      }

      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #667eea;">📧 Email Test Successful!</h1>
          <p>This is a test email from your TimeFlow automated reports system.</p>
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
            <strong>✅ Email Configuration Working</strong><br>
            Your Resend API integration is working correctly.
          </div>
          <p><strong>Test Details:</strong></p>
          <ul>
            <li>Sent to: ${admins[0].email}</li>
            <li>Time: ${new Date().toISOString()}</li>
            <li>Service: Resend API</li>
          </ul>
          <p>You can now configure your automated reports with confidence!</p>
        </div>
      `;

      await this.sendEmailViaResend(
        [admins[0].email],
        '📧 TimeFlow Email Test - Configuration Successful',
        testHtml
      );

      return {
        success: true,
        message: `Test email sent successfully to ${admins[0].email}`
      };

    } catch (error) {
      this.logger.error('Email test failed:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  private async sendEmailViaResend(to: string[], subject: string, html: string): Promise<any> {
    if (!this.resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TimeFlow Reports <reports@timeflow.app>',
        to: to,
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    return await response.json();
  }

  private async getReportConfiguration(configId: string): Promise<ReportConfiguration | null> {
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase
      .from('report_configurations')
      .select('*')
      .eq('id', configId)
      .eq('is_active', true)
      .single();

    if (error) {
      this.logger.error('Error fetching report configuration:', error);
      return null;
    }

    return data;
  }

  private async getReportRecipients(configId: string): Promise<Array<{ email: string; user_id: string }>> {
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase
      .from('report_recipients')
      .select('email, user_id')
      .eq('report_config_id', configId)
      .eq('is_active', true);

    if (error) {
      this.logger.error('Error fetching report recipients:', error);
      return [];
    }

    return data || [];
  }

  private async generateReportData(config: ReportConfiguration): Promise<any> {
    const today = new Date();
    
    if (config.template_type === 'daily') {
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);
      
      const employees = await this.getDailyEmployeeData(startOfToday, endOfToday, config);
      const alerts = await this.getDailyAlerts(startOfToday, endOfToday, config);
      
      return {
        type: 'daily',
        date: format(today, 'EEEE, MMMM d, yyyy'),
        employees,
        alerts,
        totalHours: employees.reduce((sum, emp) => sum + emp.totalHours, 0),
        avgActivity: employees.length > 0 ? employees.reduce((sum, emp) => sum + emp.activePercentage, 0) / employees.length : 0
      };
    } 
    
    if (config.template_type === 'weekly') {
          const startOfLastWeek = startOfWeek(subDays(today, 7), { weekStartsOn: 0 });
    const endOfLastWeek = endOfWeek(subDays(today, 7), { weekStartsOn: 0 });
      
      const employees = await this.getWeeklyEmployeeData(startOfLastWeek, endOfLastWeek, config);
      
      return {
        type: 'weekly',
        startDate: format(startOfLastWeek, 'MMM d'),
        endDate: format(endOfLastWeek, 'MMM d, yyyy'),
        employees,
        totalHours: employees.reduce((sum, emp) => sum + emp.totalHours, 0),
        avgActivity: employees.length > 0 ? employees.reduce((sum, emp) => sum + emp.activePercentage, 0) / employees.length : 0
      };
    }

    throw new Error(`Unsupported template type: ${config.template_type}`);
  }

  private generateEmailContent(config: ReportConfiguration, reportData: any): string {
    if (reportData.type === 'daily') {
      return this.generateDailyEmailHTML(config, reportData);
    } else if (reportData.type === 'weekly') {
      return this.generateWeeklyEmailHTML(config, reportData);
    }
    
    throw new Error(`Unsupported report type: ${reportData.type}`);
  }

  private generateDailyEmailHTML(config: ReportConfiguration, reportData: any): string {
    const { employees, alerts, date, totalHours, avgActivity } = reportData;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Team Performance Summary</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 30px; }
        .summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; display: flex; gap: 20px; flex-wrap: wrap; }
        .stat { flex: 1; min-width: 150px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
        .stat-label { color: #64748b; font-size: 14px; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1e293b; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .alert-medium { background: #fffbeb; border-left-color: #f59e0b; }
        .alert-low { background: #f0f9ff; border-left-color: #3b82f6; }
        .no-alerts { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; border-radius: 4px; color: #166534; }
        .footer { text-align: center; padding: 20px; background: #f8fafc; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 ${config.name}</h1>
            <p>${date}</p>
        </div>
        
        <div class="content">
            ${config.include_summary ? `
            <div class="summary">
                <div class="stat">
                    <div class="stat-value">${employees.length}</div>
                    <div class="stat-label">Employees Active</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${totalHours.toFixed(1)}h</div>
                    <div class="stat-label">Total Hours</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${avgActivity.toFixed(0)}%</div>
                    <div class="stat-label">Avg Activity</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${alerts.length}</div>
                    <div class="stat-label">Alerts</div>
                </div>
            </div>
            ` : ''}

            ${config.include_employee_details ? `
            <div class="section">
                <h2>✅ Employee Performance</h2>
                ${employees.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Hours</th>
                            <th>Activity</th>
                            ${config.include_projects ? '<th>Projects</th>' : ''}
                            <th>Schedule</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.map(emp => `
                        <tr>
                            <td><strong>${emp.name}</strong></td>
                            <td>${emp.totalHours.toFixed(1)} hrs</td>
                            <td>${emp.activePercentage.toFixed(0)}%</td>
                            ${config.include_projects ? `<td>${emp.projects.join(', ') || 'N/A'}</td>` : ''}
                            <td>${emp.firstStart || 'N/A'} - ${emp.lastStop || 'N/A'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<p>No employees worked today.</p>'}
            </div>
            ` : ''}

            ${config.include_alerts ? `
            <div class="section">
                <h2>⚠️ Alerts</h2>
                ${alerts.length > 0 ? 
                    alerts.map(alert => `
                    <div class="alert alert-${alert.severity.toLowerCase()}">
                        <strong>${alert.type.replace(/_/g, ' ').toUpperCase()}</strong>: ${alert.message}
                        <br><small>Employee: ${alert.employee}</small>
                    </div>
                    `).join('') 
                : '<div class="no-alerts">✅ No alerts for today - great work team!</div>'}
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            Generated by TimeFlow Admin System • ${new Date().toISOString()}
        </div>
    </div>
</body>
</html>`;
  }

  private generateWeeklyEmailHTML(config: ReportConfiguration, reportData: any): string {
    const { employees, startDate, endDate, totalHours, avgActivity } = reportData;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Team Performance Summary</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 300; }
        .content { padding: 30px; }
        .summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; display: flex; gap: 20px; flex-wrap: wrap; }
        .stat { flex: 1; min-width: 150px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #10b981; }
        .stat-label { color: #64748b; font-size: 14px; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1e293b; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        .footer { text-align: center; padding: 20px; background: #f8fafc; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 ${config.name}</h1>
            <p>${startDate} - ${endDate}</p>
        </div>
        
        <div class="content">
            ${config.include_summary ? `
            <div class="summary">
                <div class="stat">
                    <div class="stat-value">${employees.length}</div>
                    <div class="stat-label">Active Employees</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${totalHours.toFixed(1)}h</div>
                    <div class="stat-label">Total Hours</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${avgActivity.toFixed(0)}%</div>
                    <div class="stat-label">Avg Activity</div>
                </div>
            </div>
            ` : ''}

            <div class="section">
                <h2>📊 Weekly Performance Summary</h2>
                ${employees.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Total Hours</th>
                            <th>Avg Active %</th>
                            ${config.include_projects ? '<th>Projects</th>' : ''}
                            <th>Performance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.map(emp => `
                        <tr>
                            <td><strong>${emp.name}</strong></td>
                            <td>${emp.totalHours.toFixed(1)} hrs</td>
                            <td>${emp.activePercentage.toFixed(0)}%</td>
                            ${config.include_projects ? `<td>${emp.projects.join(', ') || 'N/A'}</td>` : ''}
                            <td>${emp.activePercentage > 80 ? '🟢 Excellent' : emp.activePercentage > 60 ? '🟡 Good' : '🔴 Needs Attention'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<p>No employee activity this week.</p>'}
            </div>
        </div>
        
        <div class="footer">
            Generated by TimeFlow Admin System • ${new Date().toISOString()}
        </div>
    </div>
</body>
</html>`;
  }

  private processSubjectTemplate(template: string, reportData: any): string {
    return template
      .replace('{date}', reportData.date || '')
      .replace('{start_date}', reportData.startDate || '')
      .replace('{end_date}', reportData.endDate || '');
  }

  private async logReportHistory(
    configId: string, 
    recipientCount: number, 
    status: string, 
    emailServiceId?: string, 
    reportData?: any, 
    errorMessage?: string
  ) {
    const supabase = this.supabaseService.getClient();
    
    await supabase
      .from('report_history')
      .insert({
        report_config_id: configId,
        recipient_count: recipientCount,
        status,
        email_service_id: emailServiceId,
        report_data: reportData,
        error_message: errorMessage
      });
  }

  // Mock methods for employee data - replace with actual implementation
  private async getDailyEmployeeData(startDate: Date, endDate: Date, config: ReportConfiguration): Promise<EmployeeData[]> {
    // This would fetch actual employee data from your time_logs table
    // For now, returning mock data
    return [
      {
        id: '1',
        name: 'Sarah Martinez',
        email: 'sarah@company.com',
        totalHours: 7.4,
        activePercentage: 82,
        firstStart: '9:02 AM',
        lastStop: '5:15 PM',
        projects: ['CRM Development'],
        alerts: []
      }
    ];
  }

  private async getWeeklyEmployeeData(startDate: Date, endDate: Date, config: ReportConfiguration): Promise<EmployeeData[]> {
    // This would fetch actual weekly employee data
    // For now, returning mock data
    return [
      {
        id: '1',
        name: 'Sarah Martinez',
        email: 'sarah@company.com',
        totalHours: 37.0,
        activePercentage: 84,
        projects: ['CRM Development', 'Bug Fixes'],
        alerts: []
      }
    ];
  }

  private async getDailyAlerts(startDate: Date, endDate: Date, config: ReportConfiguration): Promise<AlertData[]> {
    // This would implement actual alert detection logic
    return [];
  }
} 