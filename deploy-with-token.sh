#!/bin/bash

echo "🚀 TimeFlow Backend Deployment to Railway"
echo "=========================================="
echo ""

# Check if authenticated
if ! railway whoami &> /dev/null; then
    echo "❌ Not authenticated with Railway"
    echo "Please complete authentication first:"
    echo "1. Visit: https://railway.com/cli-login?d=d29yZENvZGU9ZnVjaHNpYS1zYXRpc2ZpZWQtY2hhcm0maG9zdG5hbWU9TW9oYW1tZWRzLU1hY0Jvb2stUHJvLmxvY2Fs"
    echo "2. Enter pairing code: fuchsia-satisfied-charm"
    echo "3. Run: railway whoami"
    echo ""
    exit 1
fi

echo "✅ Railway authentication verified"
echo "👤 User: $(railway whoami)"
echo ""

# Navigate to backend directory
cd backend

# Initialize Railway project
echo "🛠️  Initializing Railway project..."
railway init --name "timeflow-backend" || railway link

# Add Redis service
echo "🔴 Adding Redis service..."
railway add redis || echo "Redis service might already exist"

echo ""
echo "🔧 Setting up environment variables..."
echo "You'll need these from your Supabase dashboard:"
echo ""

# Prompt for environment variables
read -p "Enter your SUPABASE_URL: " SUPABASE_URL
read -p "Enter your SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
read -p "Enter your SUPABASE_JWT_SECRET: " SUPABASE_JWT_SECRET

echo ""
echo "🔗 Setting environment variables..."

# Set environment variables
railway variables set SUPABASE_URL="$SUPABASE_URL"
railway variables set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
railway variables set SUPABASE_JWT_SECRET="$SUPABASE_JWT_SECRET"
railway variables set REDIS_HOST="redis"
railway variables set REDIS_PORT="6379"
railway variables set NODE_ENV="production"
railway variables set PORT="3000"

echo "✅ Environment variables set successfully"

# Deploy the backend
echo ""
echo "🚀 Deploying backend..."
railway up

echo ""
echo "📊 Checking deployment status..."
railway status

# Get the backend URL
BACKEND_URL=$(railway domain 2>/dev/null || echo "Check Railway dashboard for URL")

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "✅ Backend deployed successfully!"
echo "🌐 Backend URL: $BACKEND_URL"
echo ""
echo "🔍 Workers now running:"
echo "  - Suspicious Activity Detector (every 15 minutes)"
echo "  - Activity Analyzer (every 5 minutes)"
echo "  - Unusual Detector (every 30 minutes)"
echo "  - Notification Pusher (every 1 minute)"
echo "  - Analytics Worker (multiple schedules)"
echo ""
echo "⏰ Expected Timeline:"
echo "  - 15 minutes: First suspicious activity detection"
echo "  - 30 minutes: Instagram/Facebook visits flagged"
echo "  - 1 hour: Full system operational"
echo ""
echo "📊 Check suspicious activity in dashboard:"
echo "  https://worktime.ebdaadt.com/suspicious-activity"
echo ""
echo "🎯 Your suspicious activity detection is now ACTIVE!"
