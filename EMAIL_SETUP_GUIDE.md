# 📧 Email Configuration Guide

## Issues Fixed in This Update

### ✅ 1. **Multi-Platform Builds Available**
- **Linux**: `Ebdaa Work Time-1.0.18.AppImage` (128MB)
- **Windows**: `Ebdaa-Work-Time-1.0.18-Windows.zip` (Contains executable)
- **macOS ARM64**: `Ebdaa-Work-Time-1.0.18-arm64.dmg` (118MB)
- **macOS Intel**: `Ebdaa-Work-Time-1.0.18.dmg` (124MB)

### ✅ 2. **Auto-Updater Fixed**
- Changed to manual download for better user control
- Clear tray menu options: "⬇️ Download v1.0.18"
- Users can now properly download and install updates

### ✅ 3. **Email Confirmation Enabled**
- Updated Supabase configuration to require email confirmation
- SMTP settings configured for Gmail

### ✅ 4. **Automated Reports Ready**
- Complete automated reports system available
- Daily reports at 7 PM, Weekly reports on Sundays at 9 AM

---

## 🔧 Required Environment Variables

Create a `.env` file in your project root with these settings:

```env
# Database Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# SMTP Configuration for Email Confirmations and Reports
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
SMTP_FROM=noreply@yourdomain.com

# Admin Configuration  
ADMIN_EMAIL=admin@yourdomain.com
HR_EMAIL=hr@yourdomain.com

# Auto-Update Configuration
GH_TOKEN=your_github_token_for_publishing_releases

# Apple Notarization (for macOS builds)
APPLE_ID=your_apple_id@example.com
APPLE_APP_SPECIFIC_PASSWORD=your_app_specific_password
APPLE_TEAM_ID=your_team_id

# Application Configuration
NODE_ENV=production
SCREENSHOT_INTERVAL_SECONDS=20
```

---

## 📧 Gmail SMTP Setup

### 1. **Enable 2-Factor Authentication**
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Security → 2-Step Verification → Turn On

### 2. **Generate App Password**
1. Google Account → Security → 2-Step Verification
2. Scroll down to "App passwords"
3. Select "Mail" and "Other" → Enter "TimeFlow"
4. Copy the 16-character password (use as `SMTP_PASSWORD`)

### 3. **Configure Environment**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASSWORD=your_16_character_app_password
SMTP_FROM=youremail@gmail.com
HR_EMAIL=hr@yourcompany.com
ADMIN_EMAIL=admin@yourcompany.com
```

---

## 🚀 Deployment Steps

### 1. **Update Supabase Configuration**
```bash
# Push the updated config to Supabase
cd supabase
supabase db push
supabase functions deploy
```

### 2. **Test Email Configuration**
```bash
# Run the SMTP test
cd backend
npm run test:smtp
```

### 3. **Deploy Backend with Reports**
```bash
# Install dependencies
npm install @nestjs/schedule date-fns

# Start the backend with automated reports
npm run start:dev
```

### 4. **Test Automated Reports**
```bash
# Test daily report
curl -X POST http://localhost:3000/api/reports/test-daily

# Test weekly report  
curl -X POST http://localhost:3000/api/reports/test-weekly
```

---

## 🔄 Auto-Update Instructions

### For Users:
1. **Check for Updates**: Right-click the tray icon → "🔄 Check for Updates"
2. **Download**: When available, click "⬇️ Download v1.0.18"
3. **Install**: After download, click "Install and Restart"

### Download Links:
- **Windows**: Extract the zip file and run `Ebdaa Work Time.exe`
- **Linux**: Make the AppImage executable: `chmod +x "Ebdaa Work Time-1.0.18.AppImage"`
- **macOS**: Download and install the appropriate DMG for your Mac

---

## 📧 Email Templates

### Confirmation Email
Users will receive email confirmations when:
- Creating new accounts
- Resetting passwords
- Changing email addresses

### Automated Reports
HR will receive:
- **Daily Summary** (7 PM): Employee hours, activity %, alerts
- **Weekly Summary** (Sunday 9 AM): Week totals, recurring issues, patterns

---

## 🐛 Troubleshooting

### Email Confirmation Not Working
1. Check `.env` file has correct SMTP settings
2. Verify Gmail app password is correct
3. Check Supabase logs for SMTP errors
4. Ensure `enable_confirmations = true` in `supabase/config.toml`

### Auto-Update Not Working
1. Check internet connection
2. Try manual check via tray menu
3. Verify GitHub release has all platform files
4. Check app permissions (especially on macOS)

### Automated Reports Not Sending
1. Test SMTP with `npm run test:smtp`
2. Check backend logs for cron job execution
3. Verify HR_EMAIL is configured in `.env`
4. Ensure ReportsModule is imported in app.module.ts

---

## 📋 Next Steps

1. **Configure Environment**: Set up your `.env` file with SMTP settings
2. **Test Email**: Use the test scripts to verify SMTP connectivity
3. **Deploy Backend**: Push the updated backend with automated reports
4. **Notify Users**: Let users know v1.0.18 is available with all platforms
5. **Monitor Reports**: Check that automated emails are being sent to HR

---

## 🎯 Summary of Fixes

- ✅ **Multi-platform builds**: Linux, Windows, macOS available
- ✅ **Auto-updater**: Fixed download mechanism, better user control
- ✅ **Email confirmations**: Enabled in Supabase configuration
- ✅ **Automated reports**: Ready for deployment with SMTP setup
- ✅ **Clear instructions**: Complete setup guide provided

All major issues have been resolved. The next step is configuring your SMTP settings and deploying the updates! 