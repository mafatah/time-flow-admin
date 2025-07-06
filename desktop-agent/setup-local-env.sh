#!/bin/bash

# TimeFlow Desktop Agent Environment Setup
# This script creates a local .env file with the necessary credentials
# Run this once before building or running the desktop agent

echo "🔧 Setting up TimeFlow Desktop Agent Environment"
echo "================================================"

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️ .env file already exists"
    read -p "Do you want to overwrite it? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled"
        exit 0
    fi
fi

# Create the .env file with TimeFlow Supabase credentials
cat > .env << 'EOF'
# TimeFlow Desktop Agent Environment Variables
# Keep this file secure and never commit to version control

# Supabase Configuration
VITE_SUPABASE_URL=https://fkpiqcxkmrtaetvfgcli.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNDU2NDUsImV4cCI6MjA0ODkyMTY0NX0.jgJBK2Ac20Wrs5ZX20VKr5PgGhOgAa0u-_KTLf1GHhA

# Alternative naming (for compatibility)
SUPABASE_URL=https://fkpiqcxkmrtaetvfgcli.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNDU2NDUsImV4cCI6MjA0ODkyMTY0NX0.jgJBK2Ac20Wrs5ZX20VKr5PgGhOgAa0u-_KTLf1GHhA

# Service Role Key (for admin operations - add if needed)
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
EOF

# Set proper permissions
chmod 600 .env

echo "✅ Environment file created successfully!"
echo "📁 Location: $(pwd)/.env"
echo ""
echo "🔒 Security Notes:"
echo "   • The .env file is automatically ignored by git"
echo "   • File permissions set to 600 (owner read/write only)"
echo "   • Never share or commit this file"
echo ""
echo "🚀 Next Steps:"
echo "   1. You can now build the desktop agent: npm run build"
echo "   2. Or test it directly: npm start"
echo ""
echo "💡 To modify credentials later, edit the .env file directly" 