/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = 're_SyA14jRb_MDnC1CzdvLgvw8JqPFD45XMR';

interface EmailRequest {
  type: 'daily' | 'weekly';
  adminEmails: string[];
  reportData: {
    employees: Array<{
      id: string;
      name: string;
      email: string;
      totalHours: number;
      activePercentage: number;
      firstStart?: string;
      lastStop?: string;
      projects: string[];
      alerts: string[];
    }>;
    alerts: Array<{
      type: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      message: string;
      employee: string;
    }>;
    date: string;
    startDate?: string;
    endDate?: string;
  };
}

function generateDailyEmailHTML(reportData: EmailRequest['reportData']): string {
  const { employees, alerts, date } = reportData;
  const totalHours = employees.reduce((sum, emp) => sum + emp.totalHours, 0);
  const avgActivity = employees.length > 0 ? employees.reduce((sum, emp) => sum + emp.activePercentage, 0) / employees.length : 0;

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
            <h1>📅 Daily Team Performance Summary</h1>
            <p>${date}</p>
        </div>
        
        <div class="content">
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

            <div class="section">
                <h2>✅ Employees Who Worked Today</h2>
                ${employees.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Hours Worked</th>
                            <th>Active %</th>
                            <th>Projects</th>
                            <th>Schedule</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.map(emp => `
                        <tr>
                            <td><strong>${emp.name}</strong></td>
                            <td>${emp.totalHours.toFixed(1)} hrs</td>
                            <td>${emp.activePercentage.toFixed(0)}%</td>
                            <td>${emp.projects.join(', ') || 'No projects'}</td>
                            <td>${emp.firstStart || 'N/A'} - ${emp.lastStop || 'N/A'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : '<p>No employees worked today.</p>'}
            </div>

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
        </div>
        
        <div class="footer">
            Generated by TimeFlow Admin System • ${new Date().toISOString()}
        </div>
    </div>
</body>
</html>`;
}

function generateWeeklyEmailHTML(reportData: EmailRequest['reportData']): string {
  const { employees, startDate, endDate } = reportData;
  const totalHours = employees.reduce((sum, emp) => sum + emp.totalHours, 0);
  const avgActivity = employees.length > 0 ? employees.reduce((sum, emp) => sum + emp.activePercentage, 0) / employees.length : 0;

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
            <h1>📊 Weekly Team Performance Summary</h1>
            <p>${startDate} - ${endDate}</p>
        </div>
        
        <div class="content">
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

            <div class="section">
                <h2>📊 Weekly Performance Summary</h2>
                ${employees.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Total Hours</th>
                            <th>Avg Active %</th>
                            <th>Projects</th>
                            <th>Performance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employees.map(emp => `
                        <tr>
                            <td><strong>${emp.name}</strong></td>
                            <td>${emp.totalHours.toFixed(1)} hrs</td>
                            <td>${emp.activePercentage.toFixed(0)}%</td>
                            <td>${emp.projects.join(', ') || 'No projects'}</td>
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

async function sendEmail(to: string[], subject: string, htmlContent: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'TimeFlow Reports <reports@timeflow.app>',
      to: to,
      subject: subject,
      html: htmlContent,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { type, adminEmails, reportData }: EmailRequest = await req.json();

    let subject: string;
    let htmlContent: string;

    if (type === 'daily') {
      subject = `📅 Daily Team Performance Summary – ${reportData.date}`;
      htmlContent = generateDailyEmailHTML(reportData);
    } else {
      subject = `📊 Weekly Performance Summary – ${reportData.startDate} - ${reportData.endDate}`;
      htmlContent = generateWeeklyEmailHTML(reportData);
    }

    // Send email to all admin users
    const emailResult = await sendEmail(adminEmails, subject, htmlContent);

    console.log(`✅ ${type} report email sent to ${adminEmails.length} admin(s)`);

    return new Response(JSON.stringify({
      success: true,
      message: `${type} report sent successfully`,
      recipients: adminEmails.length,
      emailId: emailResult.id,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}); 