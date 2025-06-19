#!/bin/bash
# Vercel Environment Variables Setup Script

echo "🔧 Setting up Vercel Environment Variables"
echo "=========================================="
echo ""

# Development Database Credentials
DEV_SUPABASE_URL="https://clypxuffvpqgmczbsblj.supabase.co"
DEV_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNseXB4dWZmdnBxZ21jemJzYmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjc2NjcsImV4cCI6MjA2NTkwMzY2N30._h0BlKG10Ri4yf2W-BH7yGf_WCNArqRkXCtSuYTkVQ8"

# Production Database Credentials  
PROD_SUPABASE_URL="https://fkpiqcxkmrtaetvfgcli.supabase.co"
PROD_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4"

echo "📋 Environment Variables to Set:"
echo ""
echo "🔧 Development Environment:"
echo "  VITE_SUPABASE_URL = $DEV_SUPABASE_URL"
echo "  VITE_SUPABASE_ANON_KEY = ${DEV_SUPABASE_ANON_KEY:0:50}..."
echo ""
echo "🚀 Production Environment:"
echo "  VITE_SUPABASE_URL = $PROD_SUPABASE_URL"
echo "  VITE_SUPABASE_ANON_KEY = ${PROD_SUPABASE_ANON_KEY:0:50}..."
echo ""

echo "💡 You can set these in Vercel Dashboard:"
echo "   1. Go to: https://vercel.com/dashboard"
echo "   2. Select: time-flow-admin project"
echo "   3. Go to: Settings → Environment Variables"
echo "   4. Update/Add these variables for each environment"
echo ""

echo "🔗 Or use these CLI commands:"
echo ""
echo "# For Development Environment:"
echo "echo '$DEV_SUPABASE_URL' | vercel env add VITE_SUPABASE_URL development"
echo "echo '$DEV_SUPABASE_ANON_KEY' | vercel env add VITE_SUPABASE_ANON_KEY development"
echo ""
echo "# For Production Environment:"
echo "echo '$PROD_SUPABASE_URL' | vercel env add VITE_SUPABASE_URL production"
echo "echo '$PROD_SUPABASE_ANON_KEY' | vercel env add VITE_SUPABASE_ANON_KEY production"
echo ""

# Also add environment-specific variables
echo "📝 Additional Environment Variables:"
echo "echo 'development' | vercel env add VITE_ENVIRONMENT development"
echo "echo 'production' | vercel env add VITE_ENVIRONMENT production"
echo "echo 'true' | vercel env add VITE_DEBUG_MODE development"
echo "echo 'false' | vercel env add VITE_DEBUG_MODE production"
echo ""

echo "✅ Copy and run these commands, or set them manually in Vercel Dashboard" 