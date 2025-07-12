#!/bin/bash

# TimeFlow Backend Deployment Script
# This script deploys the NestJS backend to Railway to fix suspicious activity detection

set -e

echo "🚀 TimeFlow Backend Deployment Script"
echo "====================================="
echo ""
echo "This will deploy the NestJS backend containing the suspicious activity detection workers."
echo "The backend will analyze URL logs and flag Instagram/Facebook visits as suspicious activity."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway..."
    railway login
fi

echo "🎯 Setting up backend deployment..."

# Navigate to backend directory
cd backend

# Initialize Railway project
echo "🛠️  Initializing Railway project..."
railway init --name "timeflow-backend"

# Add Redis service
echo "🔴 Adding Redis service..."
railway add redis

echo ""
echo "🔧 Environment Variables Setup"
echo "==============================="
echo "You need to set these environment variables in Railway:"
echo ""
echo "1. SUPABASE_URL (same as your Vercel app)"
echo "2. SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard)"
echo "3. SUPABASE_JWT_SECRET (from Supabase dashboard)"
echo ""

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
echo "🔍 Workers that are now running:"
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
echo "🧪 Test the deployment:"
echo "  curl $BACKEND_URL/health"
echo "  curl $BACKEND_URL/api/workers/status"
echo ""
echo "📊 Check suspicious activity in your admin dashboard:"
echo "  https://worktime.ebdaadt.com/suspicious-activity"
echo ""
echo "🎯 Your suspicious activity detection is now ACTIVE!"

# Optional: Test the deployment
read -p "Would you like to test the deployment now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 Testing deployment..."
    
    if [[ "$BACKEND_URL" != "Check Railway dashboard for URL" ]]; then
        echo "Testing health check..."
        curl -f "$BACKEND_URL/health" && echo "✅ Health check passed" || echo "❌ Health check failed"
        
        echo "Testing workers status..."
        curl -f "$BACKEND_URL/api/workers/status" && echo "✅ Workers status check passed" || echo "❌ Workers status check failed"
    else
        echo "⚠️  Please check Railway dashboard for the backend URL and test manually"
    fi
fi

echo ""
echo "🔧 To view logs:"
echo "  railway logs"
echo ""
echo "🛠️  To manage the deployment:"
echo "  railway dashboard"
echo ""
echo "✅ Deployment script completed!" 