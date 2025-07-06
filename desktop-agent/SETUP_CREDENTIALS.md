# TimeFlow Desktop Agent - Credentials Setup

## Required Configuration

To fix the "Invalid URL" error, you need to create a `.env` file in the `desktop-agent` directory with your Supabase credentials.

### Step 1: Create `.env` file

Create a file named `.env` in the `desktop-agent` directory with the following content:

```
# Supabase Configuration for TimeFlow Desktop Agent
VITE_SUPABASE_URL=https://qjzlnnyocnrhzokjzfux.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqemxubnlvY25yaHpva2p6ZnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMwNzU3MDQsImV4cCI6MjA0ODY1MTcwNH0.KHjYqLhqQjzJKaEMb7bFfZN6fhCGm7VpLWNXQmfMnZc

# Alternative format for compatibility
SUPABASE_URL=https://qjzlnnyocnrhzokjzfux.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqemxubnlvY25yaHpva2p6ZnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMwNzU3MDQsImV4cCI6MjA0ODY1MTcwNH0.KHjYqLhqQjzJKaEMb7bFfZN6fhCGm7VpLWNXQmfMnZc
```

### Step 2: Test the App

After creating the `.env` file, the app should launch without the "Invalid URL" error.

### Step 3: Verify Configuration

The app will now:
- ✅ Load Supabase credentials from the `.env` file
- ✅ Display proper error messages if credentials are missing
- ✅ Have working tab switching performance optimizations

## Security Note

- Never commit the `.env` file to version control
- The `.env` file is already in `.gitignore` for security

## Troubleshooting

If you still see errors:
1. Ensure the `.env` file is in the `desktop-agent` directory
2. Check that there are no extra spaces or characters in the credentials
3. Restart the desktop agent application
4. Check the console for specific error messages 