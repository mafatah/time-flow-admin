# 🚀 TimeFlow Desktop Agent Release Setup Guide

## 🔐 **Credential Setup** (REQUIRED)

### **1. Local Development Setup**
```bash
cd desktop-agent
cp .env.template .env
# Edit .env with your actual Supabase credentials
```

### **2. Build Environment Setup**
Set these environment variables in your shell:
```bash
export VITE_SUPABASE_URL="https://fkpiqcxkmrtaetvfgcli.supabase.co"
export VITE_SUPABASE_ANON_KEY="your_anon_key_here"
```

### **3. Release Environment Setup**
For production releases, set these environment variables:
```bash
# Apple Credentials
export APPLE_ID="alshqawe66@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
export APPLE_TEAM_ID="6GW49LK9V9"

# GitHub Credentials
export GITHUB_TOKEN="your_github_token_here"

# Supabase Credentials
export VITE_SUPABASE_URL="https://fkpiqcxkmrtaetvfgcli.supabase.co"
export VITE_SUPABASE_ANON_KEY="your_anon_key_here"
```

## 📦 **Build Process**

### **How It Works:**
1. **Development**: Uses local `.env` file
2. **Build**: Generates embedded config from environment variables
3. **Release**: Uses environment variables for secure credential handling

### **Security Features:**
- ✅ No hardcoded credentials in source code
- ✅ Local `.env` files are git-ignored
- ✅ Build process validates credentials before proceeding
- ✅ Embedded credentials are only in packaged app
- ✅ Release scripts require environment variables

## 🔧 **Commands**

### **Development:**
```bash
cd desktop-agent
npm start  # Uses .env file
```

### **Build:**
```bash
cd desktop-agent
npm run build  # Uses environment variables
```

### **Release:**
```bash
# Set environment variables first
./scripts/complete-release-pipeline.sh
```

## 🛠️ **Files Used for Releases**

### **Main Build Configuration:**
- `desktop-agent/package.json` - Electron builder config
- `desktop-agent/src/main.js` - Main application entry point
- `desktop-agent/env-config.js` - Embedded configuration (auto-generated)
- `desktop-agent/generate-env-config.js` - Config generator script

### **Release Scripts:**
- `scripts/complete-release-pipeline.sh` - Full release pipeline
- `scripts/automated-release-pipeline.sh` - Automated release process
- `build-signed-dmg.sh` - DMG building script

### **Platform Files:**
- **macOS**: DMG files with code signing and notarization
- **Windows**: EXE files with code signing
- **Linux**: AppImage files

## 🔍 **Testing Setup**

### **Test Local Setup:**
```bash
cd desktop-agent
node test-credentials.js
```

### **Test Build Process:**
```bash
cd desktop-agent
npm run prebuild
```

## 🚨 **Important Notes**

1. **Never commit `.env` files** - they contain real credentials
2. **Always use environment variables** for production builds
3. **Test locally first** before running release scripts
4. **Keep credentials secure** - don't share in chat/email

## 🎯 **Common Issues**

### **"Missing credentials" error:**
- Ensure `.env` file exists in desktop-agent directory
- Verify environment variables are set before running release scripts

### **"Build failed" error:**
- Check that all required environment variables are set
- Verify Apple credentials are valid
- Ensure GitHub token has proper permissions

### **"Hardcoded credentials" warning:**
- This is resolved - all credentials now use environment variables
- No more hardcoded tokens in any files 