# Development Environment Testing Guide 🧪

## Development Environment Access

### 🌐 URLs to Test
- **Development URL**: https://time-flow-admin-git-development-m-afatah-hotmailcoms-projects.vercel.app
- **Latest Deployment**: https://time-flow-admin-8e5w28gi0-m-afatah-hotmailcoms-projects.vercel.app

### 🗄️ Database Information
- **Development Database**: clypxuffvpqgmczbsblj.supabase.co
- **Environment**: Development (debug mode enabled)
- **Isolation**: Completely separate from production data

## 🔍 Testing Checklist

### 1. Basic Functionality Test
- [ ] **Login Page**: Visit the development URL and verify login page loads
- [ ] **Authentication**: Try logging in with test credentials
- [ ] **Dashboard**: Verify dashboard loads after login
- [ ] **Navigation**: Check all menu items and pages load correctly

### 2. Development-Specific Features
- [ ] **Debug Mode**: Check browser console for debug logs (should be enabled)
- [ ] **Environment Indicator**: Look for any development environment indicators
- [ ] **Error Messages**: More detailed error messages should appear in development

### 3. Database Operations Test
- [ ] **Create Test Data**: Add a test employee or project
- [ ] **View Data**: Confirm data appears in lists/tables
- [ ] **Edit Data**: Try editing the test data
- [ ] **Delete Data**: Remove test data to clean up

### 4. Cross-Platform Features
- [ ] **Time Tracking**: Test time logging functionality
- [ ] **Screenshots**: Test screenshot viewing (if applicable)
- [ ] **Reports**: Generate test reports
- [ ] **User Management**: Test admin functions

## 🧪 Test Data Creation

### Create Test Employee
1. Go to Users/Employee Management
2. Add a new test employee:
   - Name: "Test User - Dev"
   - Email: "test-dev@example.com"
   - Role: Employee

### Create Test Project
1. Go to Projects section
2. Create a new project:
   - Name: "Development Test Project"
   - Description: "Testing project for dev environment"

### Test Time Logs
1. Add some test time entries
2. Verify they appear in reports
3. Test editing/deleting entries

## 🚨 What to Look For

### ✅ Expected Behavior
- Debug information in browser console
- Faster response times (no production optimizations)
- Detailed error messages
- All features working normally
- Test data isolated from production

### ❌ Issues to Report
- Login failures
- Page loading errors
- Database connection issues
- Missing functionality
- Console errors

## 🔧 Troubleshooting

### If Login Fails
1. Check browser console for errors
2. Verify development database is accessible
3. Try clearing browser cache
4. Check network tab for failed requests

### If Pages Don't Load
1. Check the deployment URL is correct
2. Verify environment variables are set
3. Look for build errors in Vercel dashboard

### If Database Issues
1. Verify you're connected to development database
2. Check Supabase dashboard for development project
3. Ensure RLS policies are correct

## 📞 Support Commands

### Switch Back to Main Branch
```bash
git checkout main
```

### Check Environment Variables
```bash
vercel env ls
```

### Redeploy Development
```bash
git checkout development
vercel --prod=false
```

---

## 🎯 Start Testing Now!

**Primary Test URL**: https://time-flow-admin-git-development-m-afatah-hotmailcoms-projects.vercel.app

**Test safely** - this environment uses a separate database, so any data you create won't affect production! 

**Report any issues** you find during testing. 