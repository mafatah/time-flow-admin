# TimeFlow Desktop Agent - Secure Credentials Setup

## 🔐 Secure Local Configuration

The desktop agent now uses **local environment variables only** for maximum security. No credentials are hardcoded or embedded in the application.

### Step 1: Copy the Environment Template

Copy the template file to create your local environment configuration:

```bash
cd desktop-agent
cp .env.template .env
```

### Step 2: Configure Your Supabase Credentials

Edit the `.env` file with your actual Supabase credentials:

```bash
# Open the .env file in your editor
nano .env
# or
code .env
```

**Required Configuration:**
```env
# =============================================================================
# SUPABASE CONFIGURATION (REQUIRED)
# =============================================================================

# Your Supabase Project URL
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co

# Your Supabase Anonymous Key
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here

# Alternative format for compatibility
SUPABASE_URL=https://your-actual-project-id.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### Step 3: Find Your Supabase Credentials

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Navigate to**: Settings → API
4. **Copy the following values**:
   - **URL**: Project URL
   - **anon public**: This is your ANON_KEY

### Step 4: Test the Configuration

After setting up your `.env` file:

```bash
cd desktop-agent
npm start
```

The app should now launch successfully with your local credentials.

## 🛡️ Security Features

### ✅ What's Secure Now:
- **No hardcoded credentials** in any files
- **Local .env files** are excluded from version control
- **Environment variable priority** system
- **Validation checks** for missing credentials

### 🔒 Security Best Practices:
- ✅ `.env` files are automatically ignored by Git
- ✅ No credentials are embedded in built applications
- ✅ Each developer uses their own local credentials
- ✅ Production and development environments are separated

### ⚠️ Important Security Notes:
- **Never commit** your `.env` file to version control
- **Keep your service role key secure** and only use when necessary
- **Regenerate keys** if you suspect they've been compromised
- **The anon key is safe** for client-side use but should still be kept private

## 🔧 Configuration Priority

The desktop agent loads configuration in this order:

1. **Process environment variables** (highest priority)
2. **Local .env file** in desktop-agent directory
3. **Embedded config** (now uses environment variables)
4. **config.json** for app settings (lowest priority)

## 🚨 Troubleshooting

### "Missing Supabase credentials" Error
1. Ensure your `.env` file exists in the `desktop-agent` directory
2. Check that all required variables are set
3. Verify there are no extra spaces or characters in your credentials
4. Restart the desktop agent application

### "Invalid URL" Error
1. Check that your `VITE_SUPABASE_URL` is correctly formatted
2. Ensure it starts with `https://` and ends with `.supabase.co`
3. Verify the project ID is correct

### Still Having Issues?
1. Check the console output for specific error messages
2. Verify your Supabase project is active and accessible
3. Try regenerating your API keys in the Supabase dashboard

## 📁 File Structure

```
desktop-agent/
├── .env                    # Your local credentials (NEVER commit!)
├── .env.template          # Template for setup (safe to commit)
├── .gitignore            # Ensures .env is never committed
├── load-config.js        # Secure config loading logic
├── env-config.js         # Uses environment variables only
└── SETUP_CREDENTIALS.md  # This file
```

The application is now completely secure with no embedded credentials! 