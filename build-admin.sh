
#!/bin/bash

# Set environment variable for admin-only build
export VITE_ADMIN_ONLY=true

# Run the build
npm run build

echo "Admin-only build completed successfully!"
echo "Deploy the 'dist' folder to your hosting provider."
echo "Make sure to configure your domain worktime.ebdaadt.com to point to the built files."
