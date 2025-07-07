# 🔐 Desktop Agent Credentials Setup Guide

## Quick Setup (Recommended)

### 1. **Run Setup Script**
```bash
cd desktop-agent
./setup-local-env.sh
```

This will:
- Create a `.env` file from the template
- Open it in your editor
- Guide you through the setup process

### 2. **Manual Setup**
If you prefer to set up manually:

```bash
cd desktop-agent
cp .env.template .env
```

Then edit `.env` with your actual credentials:

```env
# Desktop Agent Environment Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here (optional)
```

## 🔒 Security Features

### ✅ **What's Secure:**
- ✅ No hardcoded credentials in source code
- ✅ Local `.env` files are git-ignored
- ✅ Build process embeds credentials securely
- ✅ Packaged apps work without exposing credentials

### 🔧 **How It Works:**

1. **Development Mode:**
   - Uses local `.env` file
   - Fallback to environment variables
   - Safe error handling

2. **Build Process:**
   - Runs `generate-env-config.js --build`
   - Validates required credentials
   - Embeds credentials in packaged app
   - Generated config is temporary

3. **Packaged App:**
   - Uses embedded configuration
   - No external dependencies
   - Secure credential loading

## 🚀 Usage

### **Development:**
```bash
npm start           # Uses .env file
```

### **Building:**
```bash
npm run build       # Generates embedded config + builds
npm run build:mac   # Mac-specific build
npm run build:dmg   # DMG package
```

### **Environment Variables (Alternative):**
```bash
export VITE_SUPABASE_URL="your_url"
export VITE_SUPABASE_ANON_KEY="your_key"
npm run build
```

## 🔧 Troubleshooting

### **Error: "Missing required Supabase configuration"**
- Ensure `.env` file exists with proper credentials
- Or set environment variables before building

### **Error: "Invalid Supabase URL format"**
- Check your Supabase URL format
- Should be: `https://your-project.supabase.co`

### **Build fails with credential errors:**
- Run `npm run prebuild` manually to test
- Check that `generate-env-config.js` finds your credentials

## 📁 File Structure

```
desktop-agent/
├── .env.template      # Template for local setup
├── .env              # Your local credentials (git-ignored)
├── .gitignore        # Protects sensitive files
├── env-config.js     # Generated embedded config
├── generate-env-config.js  # Config generator
├── load-config.js    # Config loader
└── setup-local-env.sh # Quick setup script
```

## 🎯 Best Practices

1. **Never commit `.env` files** - They're automatically ignored
2. **Use environment variables** for CI/CD builds
3. **Test builds locally** before releasing
4. **Keep credentials secure** - Don't share in chat/email
5. **Regenerate keys periodically** for security

---

**🎉 Your desktop agent is now secure and ready for development and distribution!** 