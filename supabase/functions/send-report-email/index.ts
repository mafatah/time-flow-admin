
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailReportRequest {
  configId: string;
  isTest?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { configId, isTest = false }: EmailReportRequest = await req.json();

    // Get report configuration
    const { data: config, error: configError } = await supabase
      .from('report_configurations')
      .select(`
        *,
        report_types(*),
        report_recipients(*, users(*))
      `)
      .eq('id', configId)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      throw new Error(`Report configuration not found: ${configError?.message}`);
    }

    if (!config.report_recipients || config.report_recipients.length === 0) {
      throw new Error('No recipients configured for this report');
    }

    // Generate report data
    const reportData = await generateReportData(supabase, config);
    const emailContent = generateEmailContent(config, reportData);
    const subject = processSubjectTemplate(config.subject_template, reportData);

    // Send email
    const recipients = config.report_recipients.map((r: any) => r.email);
    const emailResponse = await resend.emails.send({
      from: "TimeFlow Reports <reports@timeflow.app>",
      to: recipients,
      subject: subject,
      html: emailContent,
    });

    // Log the report
    await supabase
      .from('report_history')
      .insert({
        report_config_id: configId,
        recipient_count: recipients.length,
        status: isTest ? 'test' : 'sent',
        email_service_id: emailResponse.id,
        report_data: reportData
      });

    console.log(`✅ Report sent successfully to ${recipients.length} recipients`);

    return new Response(JSON.stringify({
      success: true,
      message: `Report sent to ${recipients.length} recipients`,
      recipients: recipients.length,
      emailId: emailResponse.id
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('❌ Error sending report:', error);

    // Log the error if we have a configId
    try {
      const { configId } = await req.json();
      if (configId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('report_history')
          .insert({
            report_config_id: configId,
            recipient_count: 0,
            status: 'failed',
            error_message: error.message
          });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function generateReportData(supabase: any, config: any) {
  const today = new Date();
  
  if (config.report_types?.template_type === 'daily') {
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    // Get employee data for today
    const { data: timeLogs } = await supabase
      .from('time_logs')
      .select(`
        *,
        users(id, full_name, email)
      `)
      .gte('start_time', startOfToday.toISOString())
      .lte('start_time', endOfToday.toISOString());

    // Process employee data
    const employeeMap = new Map();
    timeLogs?.forEach((log: any) => {
      const userId = log.user_id;
      if (!employeeMap.has(userId)) {
        employeeMap.set(userId, {
          id: userId,
          name: log.users?.full_name || 'Unknown',
          email: log.users?.email || '',
          totalHours: 0,
          activePercentage: 0,
          firstStart: null,
          lastStop: null,
          projects: [],
          alerts: []
        });
      }
      
      const employee = employeeMap.get(userId);
      if (log.end_time) {
        const duration = (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / (1000 * 60 * 60);
        employee.totalHours += duration;
      }
      
      if (!employee.firstStart || new Date(log.start_time) < new Date(employee.firstStart)) {
        employee.firstStart = new Date(log.start_time).toLocaleTimeString();
      }
      if (!employee.lastStop || (log.end_time && new Date(log.end_time) > new Date(employee.lastStop))) {
        employee.lastStop = log.end_time ? new Date(log.end_time).toLocaleTimeString() : null;
      }
    });

    const employees = Array.from(employeeMap.values());
    const alerts = await generateDailyAlerts(supabase, startOfToday, endOfToday, config);
    
    return {
      type: 'daily',
      date: today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      employees,
      alerts,
      totalHours: employees.reduce((sum, emp) => sum + emp.totalHours, 0),
      avgActivity: employees.length > 0 ? employees.reduce((sum, emp) => sum + (emp.activePercentage || 75), 0) / employees.length : 0
    };
  }
  
  // Default return for other types
  return {
    type: config.report_types?.template_type || 'daily',
    date: today.toLocaleDateString(),
    employees: [],
    alerts: [],
    totalHours: 0,
    avgActivity: 0
  };
}

async function generateDailyAlerts(supabase: any, startDate: Date, endDate: Date, config: any) {
  const alerts = [];
  
  // Get idle logs for today
  const { data: idleLogs } = await supabase
    .from('idle_logs')
    .select('*, users(full_name)')
    .gte('idle_start', startDate.toISOString())
    .lte('idle_start', endDate.toISOString())
    .gt('duration_minutes', 15);

  idleLogs?.forEach((log: any) => {
    alerts.push({
      type: 'EXCESSIVE_IDLE',
      severity: 'MEDIUM' as const,
      message: `Idle for ${log.duration_minutes} minutes`,
      employee: log.users?.full_name || 'Unknown'
    });
  });

  return alerts;
}

function generateEmailContent(config: any, reportData: any): string {
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
                            <th>Schedule</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.map(emp => `
                        <tr>
                            <td><strong>${emp.name}</strong></td>
                            <td>${emp.totalHours.toFixed(1)} hrs</td>
                            <td>${(emp.activePercentage || 75).toFixed(0)}%</td>
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

function processSubjectTemplate(template: string, reportData: any): string {
  return template
    .replace('{date}', reportData.date || '')
    .replace('{start_date}', reportData.startDate || '')
    .replace('{end_date}', reportData.endDate || '');
}

serve(handler);
