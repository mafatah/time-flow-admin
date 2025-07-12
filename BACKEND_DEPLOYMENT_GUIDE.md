# 🚀 TimeFlow Backend Deployment Guide

## 🎯 **Problem**: Suspicious Activity Detection Not Working

**Root Cause**: The NestJS backend containing the suspicious activity detection workers exists in `/backend/` but is **not deployed anywhere**. This is why Instagram/Facebook visits are captured in URL logs but not flagged as suspicious activity.

## 📊 **What This Backend Does**

The backend contains 6 critical workers that process your data:

1. **🔍 Suspicious Activity Detector** (every 15 min)
   - Analyzes URL logs for Instagram/Facebook visits
   - Flags social media, entertainment, gaming, shopping activity
   - Saves detections to `suspicious_activity` table

2. **📈 Activity Analyzer** (every 5 min)
   - Calculates activity percentages for screenshots
   - Analyzes productivity patterns

3. **🚨 Unusual Detector** (every 30 min)
   - Detects low activity periods
   - Identifies long sessions and productivity drops

4. **📮 Notification Pusher** (every 1 min)
   - Sends Slack/email notifications
   - Delivers alerts to admins

5. **📊 Analytics Worker** (multiple schedules)
   - Generates reports and insights
   - Processes productivity data

6. **🔔 General Worker** (on-demand)
   - Handles ad-hoc processing tasks

## 🚀 **Deployment Options**

### **Option 1: Railway (Recommended)**

1. **Create Railway Account**: https://railway.app
2. **Deploy Backend**:
   ```bash
   cd backend
   railway login
   railway init
   railway up
   ```

3. **Add Redis Service**:
   ```bash
   railway add redis
   ```

4. **Set Environment Variables**:
   ```bash
   railway variables set SUPABASE_URL="your-supabase-url"
   railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   railway variables set REDIS_HOST="redis"
   railway variables set REDIS_PORT="6379"
   ```

### **Option 2: Render**

1. **Create Render Account**: https://render.com
2. **Create Web Service** from GitHub repo
3. **Set Build Command**: `cd backend && npm install && npm run build`
4. **Set Start Command**: `cd backend && npm run start:prod`
5. **Add Redis Service** (separate service)

### **Option 3: Heroku**

1. **Create Heroku App**:
   ```bash
   cd backend
   heroku create your-app-name
   heroku addons:create heroku-redis:mini
   ```

2. **Deploy**:
   ```bash
   git subtree push --prefix backend heroku main
   ```

### **Option 4: Docker on VPS**

1. **Copy files to VPS**:
   ```bash
   scp -r backend/ user@your-server:/path/to/timeflow-backend/
   ```

2. **Deploy with Docker**:
   ```bash
   cd /path/to/timeflow-backend
   docker-compose up -d
   ```

## 🔧 **Required Environment Variables**

```bash
# Core Configuration
NODE_ENV=production
PORT=3000

# Supabase (same as your Vercel app)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Redis (for background jobs)
REDIS_HOST=redis  # or Redis service URL
REDIS_PORT=6379

# Optional: Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com

# Optional: Activity Analysis Settings
LOW_ACTIVITY_THRESHOLD=30
LONG_SESSION_THRESHOLD=18000
ACTIVITY_DROP_THRESHOLD=50
```

## 📋 **Step-by-Step Quick Setup (Railway)**

### 1. **Deploy Backend**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to backend directory
cd backend

# Initialize Railway project
railway init

# Deploy the backend
railway up
```

### 2. **Add Redis Service**
```bash
# Add Redis to your Railway project
railway add redis
```

### 3. **Configure Environment Variables**
```bash
# Set your Supabase credentials (same as Vercel)
railway variables set SUPABASE_URL="your-supabase-url"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
railway variables set SUPABASE_JWT_SECRET="your-jwt-secret"

# Set Redis connection
railway variables set REDIS_HOST="redis"
railway variables set REDIS_PORT="6379"

# Set Node environment
railway variables set NODE_ENV="production"
railway variables set PORT="3000"
```

### 4. **Verify Deployment**
```bash
# Check deployment status
railway status

# View logs
railway logs

# Get the backend URL
railway domain
```

## ✅ **After Deployment**

### **Test the Backend**
```bash
# Test health check
curl https://your-backend-url.railway.app/health

# Test workers status
curl https://your-backend-url.railway.app/api/workers/status
```

### **Expected Results**
- **Suspicious Activity Detection**: Instagram/Facebook visits will be flagged within 15 minutes
- **Activity Analysis**: Screenshots will get activity percentages calculated
- **Notifications**: Alerts will be sent to admins
- **Reports**: Analytics and insights will be generated

## 🔧 **Alternative: Quick Local Test**

Before deploying, you can test the backend locally:

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"

# Start Redis locally
docker run -d -p 6379:6379 redis:7-alpine

# Start the backend
npm run start:dev
```

Then check if suspicious activity gets detected:
```bash
# Wait 15 minutes, then check
curl localhost:3000/api/insights/suspicious-activity
```

## 🎯 **Expected Fix Timeline**

Once deployed:
- **Immediate**: Backend workers start running
- **15 minutes**: First suspicious activity detection run
- **30 minutes**: Instagram/Facebook visits flagged in database
- **1 hour**: Full activity analysis and notifications active

## 📞 **Support**

If you encounter issues:
1. Check Railway/Render logs for errors
2. Verify environment variables are set correctly
3. Ensure Redis is connected and running
4. Check Supabase service role key has proper permissions

**Your suspicious activity detection will work once this backend is deployed!** 