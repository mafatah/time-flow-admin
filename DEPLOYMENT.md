
# TimeFlow Admin - Web Deployment

## Deployment Ready ✅

This project is configured for deployment on Lovable.dev with the following setup:

### Build Configuration
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: React + Vite + TypeScript

### Environment Variables
All necessary environment variables are configured:
- `VITE_SUPABASE_URL`: Configured in vite.config.ts
- `VITE_SUPABASE_ANON_KEY`: Configured in vite.config.ts
- `VITE_ADMIN_ONLY`: Set to 'true' for admin-only deployment

### Supabase Backend
- Database schema: ✅ Complete
- RLS policies: ✅ Configured
- Authentication: ✅ Ready
- Storage: ✅ Configured

### Features Available
- Admin Dashboard
- Employee Management
- Project Management
- Time Tracking
- Screenshots Monitoring
- Idle Time Detection
- Reports and Analytics

### Deployment Process
1. Click the "Publish" button in Lovable
2. Your app will be built and deployed automatically
3. Access your live app at your assigned Lovable domain

### Post-Deployment
- Admin login: Use your configured admin credentials
- First-time setup: Create projects and assign employees
- Desktop agents: Can connect to the deployed web interface

## Notes
- This deployment includes only the web application
- Desktop agents are separate standalone applications
- All backend functionality is handled by Supabase
