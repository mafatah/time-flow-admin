# Email Reports Setup Guide

This guide will help you set up the dynamic email reports system with Resend API integration.

## 🚀 Quick Setup

### 1. Environment Variables

Add these environment variables to your backend:

```bash
# Backend .env file
RESEND_API_KEY=re_SyA14jRb_MDnC1CzdvLgvw8JqPFD45XMR

# Optional: Configure email sender domain
EMAIL_FROM_DOMAIN=timeflow.app
EMAIL_FROM_NAME="TimeFlow Reports"
```

### 2. Database Migration

Run the email reports migration to create the required tables:

```bash
# Apply the migration to your Supabase database
supabase db push
```

Or run the SQL directly in your Supabase SQL editor:
```sql
-- Run the contents of supabase/migrations/create_email_reports_system.sql
```

### 3. Configure Default Admin Recipients

The system will automatically find admin users from your database, but you can also manually configure recipients in the admin UI.

## 📧 Using the Email Reports System

### Access the Admin Interface

1. Navigate to `/admin/email-reports` in your TimeFlow admin panel
2. You'll see the Email Reports dashboard with:
   - **Configurations Tab**: Manage report configurations
   - **History Tab**: View sent email history

### Test Email Configuration

1. Click **"Test Email Setup"** button in the top right
2. This will send a test email to the first admin user
3. Verify you receive the test email

### Create Your First Report

1. Click **"New Report"** button
2. Fill in the configuration:
   - **Report Name**: "Daily Team Performance"
   - **Report Type**: Select "Daily Performance"
   - **Schedule**: `0 19 * * *` (daily at 7 PM)
   - **Subject**: `📅 Daily Team Performance Summary – {date}`
   - **Content**: Check what sections to include
   - **Recipients**: Select admin users to receive reports

3. Click **"Create Configuration"**

### Test Your Report

1. Find your newly created report in the configurations list
2. Click **"Test"** to send a test report
3. Click **"Send Now"** to send immediately to all recipients

## 🔧 Advanced Configuration

### Available Report Types

- **Daily Performance**: Daily team summary with hours, activity, alerts
- **Weekly Summary**: Weekly overview with patterns and trends  
- **Monthly Review**: Monthly comprehensive analysis
- **Alert Report**: Immediate critical issue notifications

### Schedule Examples

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Daily 7 PM | `0 19 * * *` | Every day at 7:00 PM |
| Monday 9 AM | `0 9 * * 1` | Every Monday at 9:00 AM |
| Weekdays 6 PM | `0 18 * * 1-5` | Monday-Friday at 6:00 PM |
| First of month | `0 9 1 * *` | 9 AM on the 1st of every month |

### Subject Templates

Use these placeholders in email subjects:
- `{date}` - Current date (e.g., "Monday, June 15, 2024")
- `{start_date}` - Period start date (e.g., "Jun 8")
- `{end_date}` - Period end date (e.g., "Jun 14, 2024")

### Alert Settings

Configure thresholds in JSON format:
```json
{
  "idle_threshold": 15,
  "late_start_threshold": 180,
  "toggle_threshold": 10,
  "low_productivity_threshold": 30
}
```

### Filters

Filter which data to include:
```json
{
  "include_employees": ["employee-id-1", "employee-id-2"],
  "exclude_projects": ["project-id-1"],
  "min_hours": 1
}
```

## 🔍 Monitoring and Troubleshooting

### View Send History

1. Go to **History** tab in the email reports interface
2. Check status of each sent report:
   - ✅ **Sent**: Successfully delivered
   - 🧪 **Test**: Test email sent
   - ❌ **Failed**: Check error message

### Common Issues

**Test Email Fails**
- Verify `RESEND_API_KEY` is set correctly
- Check you have admin users in your database
- Ensure Resend API key has send permissions

**No Reports Being Sent**
- Check report configurations are **Active**
- Verify cron schedule is correct
- Check server time zone settings

**Reports Have No Data**
- Ensure time_logs table has data
- Check report date ranges
- Verify employee data exists

### API Endpoints

The system exposes these admin-only endpoints:

```bash
GET    /api/email-reports/types                 # Get report types
GET    /api/email-reports/configurations        # Get all configurations
POST   /api/email-reports/configurations        # Create configuration
PUT    /api/email-reports/configurations/:id    # Update configuration
DELETE /api/email-reports/configurations/:id    # Delete configuration
POST   /api/email-reports/test-email           # Test email setup
POST   /api/email-reports/configurations/:id/send-test  # Send test report
POST   /api/email-reports/configurations/:id/send      # Send report now
GET    /api/email-reports/history              # Get send history
GET    /api/email-reports/admin-users          # Get admin users
```

## 🔄 Automated Scheduling

Reports are automatically processed every 15 minutes by the backend service. The system:

1. Checks for active report configurations
2. Evaluates cron schedules to find due reports
3. Generates report data from your database
4. Sends emails via Resend API
5. Logs results in report history

## 🎨 Customization

### Email Templates

Templates are dynamically generated based on configuration settings. You can:
- Toggle sections on/off (summary, employee details, alerts, projects)
- Customize alert thresholds
- Filter which employees/projects to include

### Adding New Report Types

To add custom report types:

1. Insert into `report_types` table:
```sql
INSERT INTO report_types (name, description, template_type) 
VALUES ('Custom Report', 'Your custom report', 'custom');
```

2. Update the `EmailReportsService` to handle the new template type

### Styling Email Templates

Email templates use inline CSS for compatibility. Key classes:
- `.header` - Email header with gradient background
- `.summary` - Statistics summary section
- `.section` - Content sections
- `.alert` - Alert styling with severity colors

## 🔐 Security

- All endpoints require admin authentication
- Environment variables keep API keys secure
- Reports only sent to verified admin users
- Email content is sanitized before sending

## 📞 Support

If you need help:
1. Check the **History** tab for error messages
2. Verify your environment variables
3. Test email configuration first
4. Check server logs for detailed error information

Happy reporting! 📊✨ 