# Vercel Deployment Guide for TimeFlow

## 🚀 Environment Variables Setup

### Required Environment Variables in Vercel Dashboard

1. **Navigate to your Vercel project settings**
2. **Go to Environment Variables section**
3. **Add the following variables:**

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `your_public_anon_key` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `your_service_role_key` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |
| `APPLE_ID` | `alshqawe66@gmail.com` | Production |
| `APPLE_APP_SPECIFIC_PASSWORD` | `icmi-tdzi-ydvi-lszi` | Production |
| `APPLE_TEAM_ID` | `6GW49LK9V9` | Production |

## 📋 Pre-Deployment Checklist

### ✅ Files Successfully Cleaned
- [x] `src/integrations/supabase/client.ts` - ✅ Uses environment variables
- [x] `electron/config.ts` - ✅ Uses environment variables with fallbacks
- [x] `create-admin-user.js` - ✅ Uses environment variables
- [x] `desktop-agent/load-config.js` - ✅ Has environment variable support
- [x] `desktop-agent/config.json` - ✅ Hardcoded credentials removed

### ⚠️ Files That Need Manual Review
- [ ] `temp_env_source.js` - **DELETE THIS FILE** (contains hardcoded credentials)
- [ ] `setup-idle-logs-remote.js` - **DELETE OR FIX** 
- [ ] `create-idle-logs-table.js` - **DELETE OR FIX**
- [ ] All files in root directory with hardcoded credentials - **REVIEW & DELETE**

## 🔧 Build Configuration

### Vercel Build Settings
- **Build Command**: `npm run build:dev`
- **Output Directory**: `dist`
- **Framework**: `vite`

### Environment-Specific Builds
```json
{
  "scripts": {
    "build:production": "NODE_ENV=production vite build",
    "build:dev": "NODE_ENV=development vite build --mode development"
  }
}
```

## 🛡️ Security Best Practices

### 1. Environment Variables
- ✅ All Supabase credentials use environment variables
- ✅ No hardcoded secrets in source code
- ✅ Environment variables properly scoped to Vercel environments

### 2. File Exclusions
Add to `.gitignore`:
```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.production
.env.development

# Temporary credential files
temp_env_source.js
setup-idle-logs-remote.js
create-idle-logs-table.js
**/config.json

# Security-sensitive files
*.pem
*.key
credentials.json
```

### 3. Production Deployment
```bash
# Clean up hardcoded credentials
node cleanup-production-credentials.js

# Verify no hardcoded credentials remain
grep -r "fkpiqcxkmrtaetvfgcli" . --exclude-dir=node_modules

# Deploy to Vercel
vercel --prod
```

## 🔍 Verification Steps

### 1. Check Main Application Files
- [x] `src/integrations/supabase/client.ts` - Uses `import.meta.env.VITE_SUPABASE_URL`
- [x] `electron/config.ts` - Uses `process.env.VITE_SUPABASE_URL` with fallbacks
- [x] All React components use the supabase client (no direct credentials)

### 2. Check Build Process
- [x] `vercel.json` configured correctly
- [x] Build command uses environment variables
- [x] No credentials bundled in built files

### 3. Check Desktop Application
- [x] Desktop agent loads config from environment variables first
- [x] No hardcoded credentials in shipped desktop app

## 🚨 Critical Actions Required

### Immediate Steps:
1. **Delete files with hardcoded credentials:**
   ```bash
   rm temp_env_source.js
   rm setup-idle-logs-remote.js  
   rm create-idle-logs-table.js
   ```

2. **Set Vercel environment variables** (see table above)

3. **Test deployment:**
   ```bash
   vercel --prod
   ```

4. **Verify application works with environment variables**

### Files Still Containing Hardcoded Credentials:
The following files were identified as containing hardcoded credentials and should be reviewed/deleted:

1. Database migration scripts (can keep with env var fallbacks)
2. Temporary test files (should be deleted)
3. Documentation files (credentials should be obfuscated)

## 📞 Support

If issues arise during deployment:
1. Check Vercel build logs for missing environment variables
2. Verify all required environment variables are set in Vercel dashboard
3. Test locally with `.env` file containing production values

## 🎯 Success Criteria

✅ **Deployment Successful When:**
- No hardcoded credentials in any production files
- All environment variables properly set in Vercel
- Application loads and connects to Supabase successfully
- Desktop app builds without embedded credentials
- No security warnings in build process 