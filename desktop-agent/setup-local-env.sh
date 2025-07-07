#!/bin/bash

echo "🔧 Setting up local desktop agent environment..."

# Check if .env file exists
if [ -f ".env" ]; then
  echo "✅ .env file already exists"
  read -p "Do you want to recreate it? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⏭️  Skipping .env creation"
    exit 0
  fi
fi

# Copy template to .env
if [ -f ".env.template" ]; then
  cp .env.template .env
  echo "✅ Created .env file from template"
else
  echo "❌ .env.template not found"
  exit 1
fi

echo ""
echo "📝 Please edit the .env file with your actual Supabase credentials:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo ""
echo "💡 You can get these from your Supabase dashboard:"
echo "   Settings -> API -> Project URL & anon/public key"
echo ""
echo "🔧 After editing .env, run:"
echo "   npm start    # For development"
echo "   npm run build    # For production build"
echo ""

# Open .env file in default editor if available
if command -v code &> /dev/null; then
  echo "📝 Opening .env in VS Code..."
  code .env
elif command -v nano &> /dev/null; then
  echo "📝 Opening .env in nano..."
  nano .env
else
  echo "📝 Please edit .env file manually"
fi 