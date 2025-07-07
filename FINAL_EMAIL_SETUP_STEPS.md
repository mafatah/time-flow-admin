# ✅ **Final Email Setup Steps**

## 🎯 **Your Resend API Key is WORKING!**

✅ **API Key**: `[YOUR_RESEND_API_KEY]` (Get from Resend Dashboard)

The API key has been tested and is valid. Follow these final steps to complete the setup:

---

## 🚀 **Step 1: Configure API Key in Supabase**

1. **Go to Supabase Dashboard** → **Edge Functions**
2. **Click on `email-reports`** function
3. **Go to Settings tab**
4. **Add Environment Variable**:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `[YOUR_ACTUAL_RESEND_API_KEY]`
5. **Click Save**

---

## 🚀 **Step 2: Fix Database Configuration**

Run this SQL script in **Supabase SQL Editor**:

```sql
-- First run: check-email-reports-status.sql (to see current status)
-- Then run: fix-email-reports-system.sql (to fix all issues)
-- Finally run: setup-resend-api-key.sql (to configure with your details)
```

**⚠️ Important**: In the `setup-resend-api-key.sql` script, replace:
- `https://your-project-id.supabase.co` → Your actual Supabase URL
- `your-service-role-key` → Your actual service role key

---

## 🚀 **Step 3: Test Email System**

1. **Go to TimeFlow Admin** → **Email Reports** page
2. **Click "Test Email Setup"**
3. **Should see**: ✅ "Test email sent successfully"
4. **Check your admin email** for the test message

---

## 🚀 **Step 4: Test Manual Reports**

1. **Click "Send Daily Report Now"**
2. **Click "Send Weekly Report Now"**
3. **Check your email** for both reports

---

## 🕐 **Automation Schedule**

Once working, your reports will be sent automatically:

- **📅 Daily Reports**: Every day at **7:00 PM**
- **📊 Weekly Reports**: Every **Sunday at 9:00 AM**

---

## 🔧 **Common Issues & Solutions**

### ❌ "No admin users found"
**Solution**: Make sure you have admin users in your database:
```sql
-- Check admin users
SELECT email, role FROM users WHERE role IN ('admin', 'manager');

-- Make yourself admin (replace with your email)
UPDATE users SET role = 'admin' WHERE email = 'your-email@domain.com';
```

### ❌ "Test email fails"
**Solution**: Check Supabase Edge Functions logs for detailed error messages

### ❌ "Reports have no data"
**Solution**: Ensure your `time_logs` table has recent data from employees

---

## 📋 **Verification Checklist**

After setup, verify these items:

- [ ] ✅ **API Key configured** in Supabase Edge Functions
- [ ] ✅ **Database tables created** (report_types, report_configurations, etc.)
- [ ] ✅ **Admin users exist** with valid email addresses
- [ ] ✅ **Recipients configured** (admins automatically added)
- [ ] ✅ **Cron jobs created** with correct Supabase URLs
- [ ] ✅ **Test email works** ("Test Email Setup" button)
- [ ] ✅ **Manual reports work** ("Send Daily Report Now" button)

---

## 🎉 **You're All Set!**

Once all steps are complete:
1. **Fraud alerts** will be transmitted to your database (from previous work)
2. **Daily & weekly email reports** will be sent automatically
3. **Manual reports** can be sent anytime via the admin interface

The system is now fully functional! 🚀

---

## 📞 **Need Help?**

If you encounter any issues:
1. Run the `check-email-reports-status.sql` script
2. Check Supabase Edge Functions logs
3. Verify your admin users have valid email addresses
4. Ensure the RESEND_API_KEY is properly configured

**Most common issue**: Forgetting to replace the placeholder URLs in the setup script with your actual Supabase project details! 