# 📧 Automated Email Reports System

## 🎯 Overview

The Time Flow automated email reporting system sends **two scheduled reports** to HR:

1. **📅 Daily Report** - Every day at **7 PM**
2. **📊 Weekly Report** - Every **Sunday at 9 AM**

Each report includes employee performance data and behavioral alerts, all consolidated into **one professional email**.

---

## 🕖 Daily Report (7 PM)

### 📧 Email Details
- **Subject**: `📅 Daily Team Performance Summary – [Date]`
- **To**: `hr@yourdomain.com`
- **Schedule**: `0 19 * * *` (Every day at 7 PM)

### 📊 Content Sections

#### ✅ Employees Who Worked Today
| Field | Description | Example |
|-------|-------------|---------|
| Employee | Full name | Sarah M. |
| Hours Worked | Total active hours | 7.4 hrs |
| Active % | Activity percentage | 82% |
| Projects Worked On | Project names | CRM Development |
| First Start | First timer start | 9:02 AM |
| Last Stop | Last timer stop | 5:15 PM |

#### ⚠️ Alert Types Detected

1. **Frequent Start/Stop** (>10 toggles)
   - Triggers when employee starts/stops timer more than 10 times
   - Severity: MEDIUM
   - Indicates potential focus issues

2. **Idle Time** (>15 minutes)
   - Triggers when total idle time exceeds 15 minutes
   - Severity: HIGH
   - May indicate distractions or breaks

3. **Non-Work Apps** (>3 minutes)
   - Detects YouTube, Facebook, Twitter, Instagram usage
   - Severity: MEDIUM
   - Based on URL tracking data

4. **No Timer Started** (3+ hours past shift)
   - When employee hasn't started timer within 3 hours of shift start
   - Severity: HIGH
   - Requires `shift_start` field in user profile

---

## 📈 Weekly Report (Sunday 9 AM)

### 📧 Email Details
- **Subject**: `📊 Weekly Performance Summary – [Start Date] – [End Date]`
- **To**: `hr@yourdomain.com`
- **Schedule**: `0 9 * * 0` (Every Sunday at 9 AM)

### 📊 Content Sections

#### ✅ Weekly Work Summary
| Field | Description | Example |
|-------|-------------|---------|
| Employee | Full name | Sarah M. |
| Total Hours | Week total | 37.2 hrs |
| Avg. Active % | Weekly average | 84% |
| Projects Worked On | All projects | CRM Dev, Support Dashboard |
| Flags | Issue summary | None |

#### ⚠️ Weekly Flags (Repeated Issues)

1. **Low Productivity** (<30% across 3+ days)
   - Consistent low activity patterns
   - Indicates potential performance issues

2. **No Timer Started** (2+ times)
   - Multiple late starts throughout week
   - Attendance concerns

3. **Idle Time** (>1hr on multiple days)
   - Recurring distraction patterns
   - May need intervention

---

## 🛠️ Technical Implementation

### 📁 Backend Files Structure
```
backend/src/reports/
├── automated-reports.service.ts  // Main service with cron jobs
├── reports.module.ts            // Module configuration
└── README.md                   // Technical documentation
```

### ⚙️ Cron Schedule Configuration
```typescript
// Daily Report - Every day at 7 PM
@Cron('0 19 * * *')
async sendDailyReport() { ... }

// Weekly Report - Every Sunday at 9 AM  
@Cron('0 9 * * 0')
async sendWeeklyReport() { ... }
```

### 🗄️ Database Queries

#### Employee Performance Data
```sql
-- Get employee time logs for date range
SELECT t.*, u.full_name, u.email, u.shift_start
FROM time_logs t
JOIN users u ON t.user_id = u.id
WHERE u.role = 'employee'
  AND t.start_time >= ? 
  AND t.start_time <= ?
```

#### Alert Detection Queries
```sql
-- Frequent toggles
SELECT user_id, COUNT(*) as toggle_count
FROM time_logs 
WHERE start_time >= ? AND start_time <= ?
GROUP BY user_id
HAVING COUNT(*) > 10

-- Idle time detection
SELECT user_id, SUM(duration) as total_idle
FROM time_logs 
WHERE is_idle = true 
  AND start_time >= ? AND start_time <= ?
GROUP BY user_id

-- Non-work URL detection  
SELECT user_id, COUNT(*) as non_work_urls
FROM url_logs 
WHERE (url LIKE '%youtube%' OR url LIKE '%facebook%')
  AND timestamp >= ? AND timestamp <= ?
GROUP BY user_id
```

---

## 📧 Email Templates

### 🎨 Daily Email Design
- **Header**: Blue gradient with date
- **Summary Cards**: Key metrics (employees, hours, alerts)
- **Performance Table**: Detailed employee breakdown
- **Alerts Section**: Color-coded by severity
- **Professional Styling**: Corporate-friendly design

### 🎨 Weekly Email Design  
- **Header**: Green gradient with week range
- **Weekly Summary**: Aggregate statistics
- **Performance Table**: Weekly totals per employee
- **Flags Section**: Recurring issue patterns
- **Consistent Branding**: Time Flow styling

---

## ⚙️ Configuration Setup

### 🔧 Environment Variables
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@timeflow.com

# Report Recipients
HR_EMAIL=hr@yourdomain.com

# Application Settings
APP_URL=https://your-admin-dashboard.com
```

### 📊 Database Schema Requirements

#### Users Table
```sql
ALTER TABLE users 
ADD COLUMN shift_start TIME; -- e.g., '09:00:00'
```

#### URL Logs Table (Optional)
```sql
CREATE TABLE url_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  url TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER DEFAULT 0
);
```

---

## 🚀 Deployment Steps

### 1. **Backend Setup**
```bash
# Install dependencies
npm install @nestjs/schedule date-fns

# Add to app.module.ts
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    // ... other modules
    ReportsModule,
  ],
})
```

### 2. **Environment Configuration**
```bash
# Copy environment variables
cp .env.example .env

# Configure SMTP settings
SMTP_HOST=your-smtp-server
SMTP_USER=your-email
SMTP_PASSWORD=your-password
HR_EMAIL=hr@yourcompany.com
```

### 3. **Database Migration**
```sql
-- Add shift_start to users table
ALTER TABLE users ADD COLUMN shift_start TIME;

-- Update existing users with default shift
UPDATE users SET shift_start = '09:00:00' WHERE role = 'employee';

-- Create URL logs table (optional)
CREATE TABLE url_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  url TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. **Testing**
```bash
# Test SMTP connection
npm run test:email

# Manual trigger (for testing)
curl -X POST localhost:3000/api/reports/test-daily
curl -X POST localhost:3000/api/reports/test-weekly
```

---

## 📊 Alert Detection Logic

### 🔍 Daily Alerts

#### Frequent Toggles Detection
```typescript
// Alert if >10 timer starts in one day
if (timeLogs.length > 10) {
  alerts.push({
    type: 'frequent_toggles',
    severity: 'MEDIUM',
    message: `Frequent timer toggles (${timeLogs.length} times)`
  });
}
```

#### Idle Time Detection
```typescript
// Calculate total idle time
const totalIdleTime = timeLogs
  .filter(log => log.is_idle)
  .reduce((total, log) => total + duration, 0);

if (totalIdleMinutes > 15) {
  alerts.push({
    type: 'idle_time', 
    severity: 'HIGH',
    message: `Excessive idle time (${totalIdleMinutes} minutes)`
  });
}
```

#### Late Start Detection
```typescript
// Check if started >3 hours after shift
const shiftStart = new Date(`${date}T${user.shift_start}`);
const firstLog = new Date(timeLogs[0].start_time);
const delayHours = (firstLog - shiftStart) / (1000 * 60 * 60);

if (delayHours > 3) {
  alerts.push({
    type: 'late_start',
    severity: 'HIGH', 
    message: `Timer started ${delayHours} hours late`
  });
}
```

### 📈 Weekly Patterns

#### Low Productivity Pattern
```typescript
// Check for <30% activity across multiple days
const lowDays = dailyStats.filter(day => day.activePercentage < 30);
if (lowDays.length >= 3) {
  flags.push(`Low productivity (<30%) across ${lowDays.length} days`);
}
```

#### Recurring Issues
```typescript
// Multiple late starts
if (lateStartCount >= 2) {
  flags.push('No timer started 2+ times this week');
}

// Multiple high-idle days  
if (highIdleDays >= 3) {
  flags.push('Idle time >1hr on multiple days');
}
```

---

## 🎯 Sample Email Output

### 📅 Daily Email Example
```
Subject: 📅 Daily Team Performance Summary – Dec 15, 2024

Daily Summary:
• 8 Employees Active
• 56.2h Total Hours  
• 78% Avg Activity
• 3 Alerts

Employees Who Worked Today:
• Sarah Martinez: 7.4h (82% active) - CRM Development
• John Smith: 8.1h (91% active) - Support Dashboard  
• Lisa Wong: 6.8h (76% active) - Mobile App

Alerts:
• FREQUENT TOGGLES: Timer toggled 12 times (Sarah Martinez)
• IDLE TIME: Excessive idle time 18 minutes (John Smith)
• LATE START: Timer started 4 hours late (Mike Johnson)
```

### 📊 Weekly Email Example
```
Subject: 📊 Weekly Performance Summary – Dec 9 - Dec 15, 2024

Weekly Summary:
• 8 Active Employees
• 289.6h Total Hours
• 81% Avg Activity  
• 2 Weekly Flags

Weekly Work Summary:
• Sarah Martinez: 37.2h (84% avg) - CRM Dev, Support
• John Smith: 39.1h (88% avg) - Support Dashboard
• Lisa Wong: 34.8h (79% avg) - Mobile App, Testing

Weekly Flags:
• Low productivity (<30%) across 3 days (Mike Johnson)
• No timer started 2+ times this week (Alice Brown)
```

---

## 🔧 Customization Options

### 📊 Alert Thresholds
```typescript
// Customize in automated-reports.service.ts
const FREQUENT_TOGGLE_THRESHOLD = 10;    // timer starts
const IDLE_TIME_THRESHOLD = 15;          // minutes  
const LATE_START_THRESHOLD = 180;        // minutes (3 hours)
const LOW_PRODUCTIVITY_THRESHOLD = 30;   // percentage
const NON_WORK_THRESHOLD = 3;            // minutes
```

### 🕐 Schedule Customization
```typescript
// Change timing in cron decorators
@Cron('0 18 * * *')  // 6 PM instead of 7 PM
@Cron('0 9 * * 2')   // Tuesday instead of Monday
```

### 📧 Email Recipients
```typescript
// Multiple HR recipients
const hrEmails = [
  'hr@company.com',
  'manager@company.com', 
  'ceo@company.com'
];
```

---

## 🐛 Troubleshooting

### ❌ Common Issues

#### Emails Not Sending
```bash
# Check SMTP configuration
curl -X POST localhost:3000/api/test-smtp

# Verify environment variables
echo $SMTP_HOST $SMTP_USER $HR_EMAIL

# Check service logs
tail -f logs/automated-reports.log
```

#### Missing Data
```sql
-- Verify time_logs data
SELECT COUNT(*) FROM time_logs WHERE start_time >= CURRENT_DATE;

-- Check user shift_start values  
SELECT id, full_name, shift_start FROM users WHERE role = 'employee';

-- Verify url_logs table exists
SELECT COUNT(*) FROM url_logs WHERE timestamp >= CURRENT_DATE;
```

#### Cron Jobs Not Running
```bash
# Check if schedule module is imported
grep -r "ScheduleModule" src/

# Verify service is registered
grep -r "AutomatedReportsService" src/

# Check application logs
tail -f logs/application.log | grep "Starting.*report"
```

### 🔍 Debugging

#### Enable Debug Logging
```typescript
// In automated-reports.service.ts
private readonly logger = new Logger(AutomatedReportsService.name);

// Add debug logs
this.logger.debug('Processing employee:', user.full_name);
this.logger.debug('Found time logs:', timeLogs.length);
this.logger.debug('Calculated alerts:', alerts);
```

#### Manual Testing
```bash
# Create test endpoints for manual trigger
curl -X POST localhost:3000/api/reports/test-daily
curl -X POST localhost:3000/api/reports/test-weekly

# Check specific date ranges
curl -X POST localhost:3000/api/reports/test-daily \
  -d '{"date": "2024-12-15"}'
```

---

## 📈 Future Enhancements

### 🎯 Planned Features
- **Custom Schedules**: Per-company scheduling
- **Advanced Analytics**: Trend analysis and predictions  
- **Mobile Notifications**: Push notifications for critical alerts
- **Dashboard Integration**: Real-time alert display
- **Custom Templates**: Company-specific email designs
- **Multi-language**: Localized email content
- **Integration APIs**: Slack, Teams, Discord notifications

### 🔧 Technical Improvements
- **Performance Optimization**: Batch processing for large teams
- **Caching**: Redis cache for frequent queries
- **Rate Limiting**: Email throttling for high-volume setups
- **Monitoring**: Health checks and uptime monitoring
- **Security**: Email encryption and authentication

---

## 📞 Support

### 🆘 Getting Help
1. **Check Logs**: Review application and email service logs
2. **Verify Config**: Ensure environment variables are correct
3. **Test SMTP**: Validate email server connectivity
4. **Database Check**: Confirm data availability and structure
5. **Contact Support**: Reach out with specific error messages

### 📋 Maintenance Checklist
- [ ] SMTP credentials valid and not expired
- [ ] HR email addresses current and monitored  
- [ ] Database performance optimized for queries
- [ ] Log rotation configured to prevent disk issues
- [ ] Backup and recovery procedures tested
- [ ] Alert thresholds reviewed and adjusted as needed

---

*This automated reporting system enhances Time Flow's oversight capabilities by providing consistent, professional communication about team performance and behavioral patterns to HR stakeholders.*