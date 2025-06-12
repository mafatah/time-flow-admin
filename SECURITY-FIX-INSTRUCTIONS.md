# FILES REQUIRING MANUAL TOKEN REMOVAL

## 🚨 CRITICAL: These files contain hardcoded tokens that must be removed:

- src/integrations/supabase/client.ts
- electron/main.ts
- electron/config.ts
- netlify.toml
- vercel.json
- All test-*.js files
- All check-*.js files
- All fix-*.js files
- All debug-*.html files

## 📝 Manual Steps Required:

1. **FIRST**: Go to Supabase Dashboard and regenerate ALL API keys
2. **Replace hardcoded tokens** in above files with environment variables:
   
   Replace this pattern:
   ```
   const supabaseKey = 'eyJhbGciOiJIUzI1...'
   ```
   
   With this:
   ```
   const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
   ```

3. **Update your .env file** with new tokens from Supabase
4. **Remove all built files** in dist/ and rebuild
5. **Commit changes** and push to clean the repository

## 🔐 Environment Variable Patterns:

- URL: `process.env.VITE_SUPABASE_URL`
- Anon Key: `process.env.VITE_SUPABASE_ANON_KEY`
- Service Key: `process.env.SUPABASE_SERVICE_KEY`

## ⚠️  REMEMBER:
- Never hardcode secrets again
- Always use environment variables
- Add security scanning to your workflow
