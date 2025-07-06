# 🚀 Email Reports Quick Fix Guide

## ⚡ Quick Fix Steps (5 minutes)

### Step 1: Run the Database Fix Script
1. Open your **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `check-email-reports-status.sql` first to see what's broken
3. Then copy and paste the contents of `fix-email-reports-system.sql`
4. **⚠️ IMPORTANT**: Before running, replace these placeholders in the script:
   - `'https://your-project-id.supabase.co'` → Your actual Supabase URL
   - `'your-service-role-key'` → Your actual service role key
5. Run the script

### Step 2: Configure RESEND_API_KEY
1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on the **`email-reports`** function
3. Go to **Settings** tab
4. Add environment variable:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_your_actual_resend_api_key_here`
5. Click **Save**

### Step 3: Test Email System
1. Go to your **TimeFlow Admin** → **Email Reports** page
2. Click **"Test Email Setup"** button
3. You should see: ✅ "Test email sent successfully"
4. Check your admin email for the test message

### Step 4: Test Manual Reports
1. Click **"Send Daily Report Now"**
2. Click **"Send Weekly Report Now"**
3. Check your email for both reports

---

## 🔧 If You Don't Have a Resend API Key

### Option A: Get Resend API Key (Recommended)
1. Go to [resend.com](https://resend.com)
2. Sign up for free account
3. Go to **API Keys** section
4. Click **"Create API Key"**
5. Copy the key (starts with `re_`)
6. Add it to Supabase as described above

### Option B: Use Alternative Email Service
If you prefer Gmail/SMTP, you can modify the edge function to use nodemailer instead of Resend.

---

## 🔍 Common Issues and Solutions

### ❌ "RESEND_API_KEY not configured"
- **Solution**: Add the API key to Supabase Edge Functions environment variables

### ❌ "No admin users found"
- **Solution**: Ensure you have users with `role = 'admin'` in your `users` table
- **Quick fix**: Run this SQL in Supabase:
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'your-email@domain.com';
  ```

### ❌ "No recipients configured"
- **Solution**: The fix script automatically adds admin users as recipients
- **If still broken**: Run this SQL:
  ```sql
  INSERT INTO report_recipients (report_config_id, email, user_id, is_active)
  SELECT rc.id, u.email, u.id, true
  FROM report_configurations rc
  CROSS JOIN users u
  WHERE u.role = 'admin' AND u.email IS NOT NULL;
  ```

### ❌ "Cron jobs not running"
- **Solution**: Check that you replaced the Supabase URL and service key in the fix script
- **Manual test**: Try sending reports manually first

### ❌ "Permission denied" errors
- **Solution**: Make sure you're using the **service role key**, not the anon key
- **Location**: Supabase Dashboard → Settings → API → Service Role Key

---

## 📋 Quick Verification Checklist

After running the fix script, verify these items:

- [ ] **Tables exist**: `report_types`, `report_configurations`, `report_recipients`, `report_history`
- [ ] **Admin users exist**: At least one user with `role = 'admin'` and valid email
- [ ] **Recipients configured**: Admin users are automatically added as recipients
- [ ] **Cron jobs created**: Check `cron.job` table for email-related jobs
- [ ] **RESEND_API_KEY configured**: Set in Supabase Edge Functions environment
- [ ] **Test email works**: "Test Email Setup" button sends successfully
- [ ] **Manual reports work**: "Send Daily Report Now" and "Send Weekly Report Now" work

---

## 🕐 Automation Schedule

Once everything is working:

- **Daily Reports**: Sent every day at **7:00 PM**
- **Weekly Reports**: Sent every **Sunday at 9:00 AM**

The reports will be automatically sent to all admin users configured in the system.

---

## 🔨 Emergency Reset

If something goes wrong, you can reset the entire system:

1. Run this SQL to clean up:
   ```sql
   DROP TABLE IF EXISTS report_history CASCADE;
   DROP TABLE IF EXISTS report_recipients CASCADE;
   DROP TABLE IF EXISTS report_configurations CASCADE;
   DROP TABLE IF EXISTS report_types CASCADE;
   SELECT cron.unschedule('daily-email-reports');
   SELECT cron.unschedule('weekly-email-reports');
   ```

2. Then run the `fix-email-reports-system.sql` script again

---

## 📞 Support

If you're still having issues:
1. Run the `check-email-reports-status.sql` script
2. Share the output to see exactly what's broken
3. Check the Supabase Edge Functions logs for error messages

The most common issue is simply forgetting to configure the RESEND_API_KEY! 🔑 