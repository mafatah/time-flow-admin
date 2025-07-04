const nodemailer = require('nodemailer');

// Mock email transporter for testing
const createTestTransporter = () => {
  return nodemailer.createTransporter({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass'
    }
  });
};

// Mock employee data for testing
const mockEmployeeData = [
  {
    id: '1',
    name: 'Sarah Martinez',
    email: 'sarah.martinez@company.com',
    totalHours: 7.4,
    activePercentage: 82,
    firstStart: '9:02 AM',
    lastStop: '5:15 PM',
    projects: ['CRM Development', 'Support Dashboard'],
    alerts: []
  },
  {
    id: '2', 
    name: 'John Smith',
    email: 'john.smith@company.com',
    totalHours: 8.1,
    activePercentage: 91,
    firstStart: '8:45 AM',
    lastStop: '5:30 PM',
    projects: ['Mobile App', 'Bug Fixes'],
    alerts: []
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike.johnson@company.com', 
    totalHours: 6.2,
    activePercentage: 45,
    firstStart: '12:30 PM',
    lastStop: '7:45 PM',
    projects: ['Testing'],
    alerts: ['Timer started 4 hours late', 'Low activity percentage']
  }
];

// Mock alerts for testing
const mockAlerts = [
  {
    type: 'frequent_toggles',
    severity: 'MEDIUM',
    message: 'Timer toggled 12 times today',
    employee: 'Sarah Martinez'
  },
  {
    type: 'idle_time',
    severity: 'HIGH', 
    message: 'Excessive idle time (18 minutes)',
    employee: 'John Smith'
  },
  {
    type: 'late_start',
    severity: 'HIGH',
    message: 'Timer started 4 hours late',
    employee: 'Mike Johnson'
  }
];

// Generate Daily Email Template
function generateDailyEmailTemplate(employees, alerts, date) {
  const totalHours = employees.reduce((sum, emp) => sum + emp.totalHours, 0);
  const avgActivity = employees.reduce((sum, emp) => sum + emp.activePercentage, 0) / employees.length;

  return `
  <!DOCTYPE html>
  <html>
  <head>
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
                  <table>
                      <thead>
                          <tr>
                              <th>Employee</th>
                              <th>Hours Worked</th>
                              <th>Active %</th>
                              <th>Projects Worked On</th>
                              <th>First Start</th>
                              <th>Last Stop</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${employees.map(emp => `
                          <tr>
                              <td><strong>${emp.name}</strong></td>
                              <td>${emp.totalHours.toFixed(1)} hrs</td>
                              <td>${emp.activePercentage.toFixed(0)}%</td>
                              <td>${emp.projects.join(', ') || 'No projects'}</td>
                              <td>${emp.firstStart || 'N/A'}</td>
                              <td>${emp.lastStop || 'N/A'}</td>
                          </tr>
                          `).join('')}
                      </tbody>
                  </table>
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
      </div>
  </body>
  </html>
  `;
}

// Generate Plain Text Version
function generateDailyEmailText(employees, alerts, date) {
  return `
DAILY TEAM PERFORMANCE SUMMARY - ${date}

EMPLOYEES WHO WORKED TODAY:
${employees.map(emp => 
  `• ${emp.name}: ${emp.totalHours.toFixed(1)}h (${emp.activePercentage.toFixed(0)}% active) - ${emp.projects.join(', ')}`
).join('\n')}

ALERTS:
${alerts.length > 0 ? 
  alerts.map(alert => `• ${alert.type.toUpperCase()}: ${alert.message} (${alert.employee})`).join('\n')
  : '• No alerts today'}

Generated by TimeFlow Admin Dashboard - Test Mode
  `;
}

// Main test function
async function testDailyReport() {
  console.log('🧪 Testing Daily Report Generation...');
  console.log('=====================================');
  
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Generate email content
  const htmlContent = generateDailyEmailTemplate(mockEmployeeData, mockAlerts, today);
  const textContent = generateDailyEmailText(mockEmployeeData, mockAlerts, today);

  // Display the results
  console.log('\n📊 REPORT SUMMARY:');
  console.log(`📅 Date: ${today}`);
  console.log(`👥 Employees: ${mockEmployeeData.length}`);
  console.log(`⏰ Total Hours: ${mockEmployeeData.reduce((sum, emp) => sum + emp.totalHours, 0).toFixed(1)}h`);
  console.log(`📈 Avg Activity: ${(mockEmployeeData.reduce((sum, emp) => sum + emp.activePercentage, 0) / mockEmployeeData.length).toFixed(0)}%`);
  console.log(`⚠️  Alerts: ${mockAlerts.length}`);

  console.log('\n👥 EMPLOYEE DETAILS:');
  mockEmployeeData.forEach(emp => {
    console.log(`• ${emp.name}: ${emp.totalHours.toFixed(1)}h (${emp.activePercentage}% active)`);
    console.log(`  Projects: ${emp.projects.join(', ')}`);
    console.log(`  Schedule: ${emp.firstStart} - ${emp.lastStop}`);
    if (emp.alerts.length > 0) {
      console.log(`  ⚠️ Alerts: ${emp.alerts.join(', ')}`);
    }
    console.log('');
  });

  console.log('\n⚠️  SYSTEM ALERTS:');
  if (mockAlerts.length > 0) {
    mockAlerts.forEach(alert => {
      console.log(`• ${alert.severity} - ${alert.type.toUpperCase()}: ${alert.message} (${alert.employee})`);
    });
  } else {
    console.log('• No alerts today - great work team!');
  }

  console.log('\n📧 EMAIL CONTENT PREVIEW:');
  console.log('========================');
  console.log(textContent);

  console.log('\n💌 HTML EMAIL GENERATED:');
  console.log('This would be sent to HR with professional formatting, charts, and styling.');
  console.log(`Email size: ${(htmlContent.length / 1024).toFixed(1)} KB`);

  console.log('\n✅ Daily report test completed successfully!');
  console.log('In production, this would be emailed to: hr@yourdomain.com');
  
  return {
    success: true,
    summary: {
      employees: mockEmployeeData.length,
      totalHours: mockEmployeeData.reduce((sum, emp) => sum + emp.totalHours, 0),
      avgActivity: mockEmployeeData.reduce((sum, emp) => sum + emp.activePercentage, 0) / mockEmployeeData.length,
      alerts: mockAlerts.length
    }
  };
}

// Test weekly report function  
async function testWeeklyReport() {
  console.log('\n\n📊 Testing Weekly Report Generation...');
  console.log('======================================');
  
  const weeklyData = mockEmployeeData.map(emp => ({
    ...emp,
    totalHours: emp.totalHours * 5, // Simulate 5 days of work
    alerts: ['Low productivity pattern detected', 'Multiple late starts this week']
  }));

  const weeklyAlerts = [
    'Sarah Martinez: Low productivity (<30%) across 2 days',
    'Mike Johnson: No timer started 3+ times this week',
    'Team average activity below 70% threshold'
  ];

  console.log('\n📊 WEEKLY SUMMARY:');
  console.log(`👥 Active Employees: ${weeklyData.length}`);
  console.log(`⏰ Total Week Hours: ${weeklyData.reduce((sum, emp) => sum + emp.totalHours, 0).toFixed(1)}h`);
  console.log(`📈 Weekly Avg Activity: ${(weeklyData.reduce((sum, emp) => sum + emp.activePercentage, 0) / weeklyData.length).toFixed(0)}%`);
  console.log(`🚨 Weekly Flags: ${weeklyAlerts.length}`);

  console.log('\n👥 WEEKLY EMPLOYEE PERFORMANCE:');
  weeklyData.forEach(emp => {
    console.log(`• ${emp.name}: ${emp.totalHours.toFixed(1)}h total (${emp.activePercentage}% avg active)`);
    console.log(`  Main Projects: ${emp.projects.join(', ')}`);
  });

  console.log('\n🚨 WEEKLY FLAGS (Recurring Issues):');
  weeklyAlerts.forEach(alert => {
    console.log(`• ${alert}`);
  });

  console.log('\n✅ Weekly report test completed successfully!');
  console.log('In production, this would be emailed to HR every Monday at 9 AM');

  return {
    success: true,
    summary: {
      employees: weeklyData.length,
      totalWeekHours: weeklyData.reduce((sum, emp) => sum + emp.totalHours, 0),
      weeklyFlags: weeklyAlerts.length
    }
  };
}

// Run both tests
async function runAllTests() {
  console.log('🚀 TimeFlow Automated Reports - Test Mode');
  console.log('==========================================\n');
  
  try {
    const dailyResult = await testDailyReport();
    const weeklyResult = await testWeeklyReport();
    
    console.log('\n\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('====================================');
    console.log('\n📋 Next Steps:');
    console.log('1. Configure SMTP settings in your .env file');
    console.log('2. Set HR_EMAIL to receive actual reports');
    console.log('3. Start your backend server: npm run start:dev');
    console.log('4. Test with real data: curl -X POST http://localhost:3000/reports/test-daily');
    console.log('\n⏰ Production Schedule:');
    console.log('• Daily Reports: Every day at 7 PM');
    console.log('• Weekly Reports: Every Monday at 9 AM');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
runAllTests(); 