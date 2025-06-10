#!/bin/bash

echo "🚀 Setting up Time Flow Automated Email Reports System"
echo "======================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "📦 Installing required dependencies..."
cd backend
npm install @nestjs/schedule date-fns
cd ..

echo "🗄️ Database Migration - Adding shift_start column..."
cat << 'EOF' > temp_migration.sql
-- Add shift_start column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'shift_start'
    ) THEN
        ALTER TABLE users ADD COLUMN shift_start TIME DEFAULT '09:00:00';
        UPDATE users SET shift_start = '09:00:00' WHERE role = 'employee';
        PRINT 'Added shift_start column to users table';
    ELSE
        PRINT 'shift_start column already exists';
    END IF;
END $$;

-- Create URL logs table for non-work website tracking (optional)
CREATE TABLE IF NOT EXISTS url_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    url TEXT NOT NULL,
    title TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    duration INTEGER DEFAULT 0,
    category TEXT DEFAULT 'unknown'
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_url_logs_user_timestamp 
ON url_logs(user_id, timestamp);

-- Create index for non-work URL detection
CREATE INDEX IF NOT EXISTS idx_url_logs_url 
ON url_logs USING gin(to_tsvector('english', url));
EOF

echo "⚙️ SQL migration file created: temp_migration.sql"
echo "   Please run this against your database to add required tables/columns"

echo "📧 Setting up environment variables..."
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your SMTP and HR email settings:"
    echo "   - SMTP_HOST=your-smtp-server.com"
    echo "   - SMTP_USER=your-email@company.com" 
    echo "   - SMTP_PASSWORD=your-app-password"
    echo "   - HR_EMAIL=hr@yourdomain.com"
else
    echo "✅ .env file already exists"
fi

echo "🔧 Adding ReportsModule to app.module.ts..."
BACKEND_APP_MODULE="backend/src/app.module.ts"

if [ -f "$BACKEND_APP_MODULE" ]; then
    # Check if ReportsModule is already imported
    if grep -q "ReportsModule" "$BACKEND_APP_MODULE"; then
        echo "✅ ReportsModule already imported in app.module.ts"
    else
        echo "Adding ReportsModule import..."
        # Add import line after other imports
        sed -i '/import.*Module.*from/a import { ReportsModule } from '\''./reports/reports.module'\'';' "$BACKEND_APP_MODULE"
        
        # Add to imports array
        sed -i '/imports: \[/a \    ReportsModule,' "$BACKEND_APP_MODULE"
        
        echo "✅ ReportsModule added to app.module.ts"
    fi
else
    echo "⚠️  Could not find $BACKEND_APP_MODULE - please manually add ReportsModule"
fi

echo "📊 Creating test endpoints for manual report testing..."
cat << 'EOF' > backend/src/reports/reports.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AutomatedReportsService } from './automated-reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: AutomatedReportsService) {}

  @Post('test-daily')
  @Roles('admin')
  async testDailyReport() {
    try {
      await this.reportsService.sendDailyReport();
      return { success: true, message: 'Daily report sent successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Post('test-weekly')
  @Roles('admin')
  async testWeeklyReport() {
    try {
      await this.reportsService.sendWeeklyReport();
      return { success: true, message: 'Weekly report sent successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
EOF

echo "🔄 Updating reports.module.ts to include controller..."
cat << 'EOF' > backend/src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomatedReportsService } from './automated-reports.service';
import { ReportsController } from './reports.controller';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CommonModule,
    NotificationsModule,
  ],
  controllers: [ReportsController],
  providers: [AutomatedReportsService],
  exports: [AutomatedReportsService],
})
export class ReportsModule {}
EOF

echo "🧪 Creating SMTP test script..."
cat << 'EOF' > test-smtp.js
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTP() {
  console.log('🧪 Testing SMTP configuration...');
  
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection successful');

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.HR_EMAIL,
      subject: '📧 Time Flow SMTP Test',
      text: 'This is a test email from Time Flow automated reports system.',
      html: '<h1>📧 SMTP Test Successful</h1><p>Time Flow automated reports are ready to send!</p>'
    });

    console.log('✅ Test email sent:', info.messageId);
    console.log('🎉 SMTP setup is working correctly!');
    
  } catch (error) {
    console.error('❌ SMTP test failed:', error.message);
    console.log('💡 Please check your environment variables:');
    console.log('   SMTP_HOST:', process.env.SMTP_HOST);
    console.log('   SMTP_USER:', process.env.SMTP_USER);
    console.log('   HR_EMAIL:', process.env.HR_EMAIL);
  }
}

testSMTP();
EOF

echo "📋 Creating package.json test script..."
if [ -f "backend/package.json" ]; then
    # Add test script to package.json
    cd backend
    npm pkg set scripts.test:smtp="node ../test-smtp.js"
    cd ..
    echo "✅ Added 'npm run test:smtp' script"
fi

echo ""
echo "🎉 Setup Complete! Next Steps:"
echo "================================"
echo ""
echo "1. 🗄️  Run the database migration:"
echo "   psql -d your_database -f temp_migration.sql"
echo ""
echo "2. ⚙️  Configure environment variables in .env:"
echo "   - Update SMTP settings"
echo "   - Set HR_EMAIL address"
echo ""
echo "3. 🧪 Test SMTP configuration:"
echo "   cd backend && npm run test:smtp"
echo ""
echo "4. 🚀 Start your application:"
echo "   npm run start:dev"
echo ""
echo "5. 📧 Test manual report sending:"
echo "   curl -X POST localhost:3000/api/reports/test-daily"
echo "   curl -X POST localhost:3000/api/reports/test-weekly"
echo ""
echo "📅 Schedule Information:"
echo "   - Daily reports: Every day at 7 PM"
echo "   - Weekly reports: Every Monday at 9 AM"
echo ""
echo "📖 For detailed documentation, see:"
echo "   - AUTOMATED_EMAIL_REPORTS.md"
echo ""
echo "⚠️  Don't forget to:"
echo "   - Delete temp_migration.sql after running it"
echo "   - Delete test-smtp.js if not needed"
echo "   - Add actual HR email addresses"
echo "   - Test in staging environment first"
echo ""

echo "✅ Automated Email Reports setup completed successfully!"