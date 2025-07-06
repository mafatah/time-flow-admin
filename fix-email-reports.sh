#!/bin/bash

# Fix Email Reports Script
# This script helps configure and test the email reporting system

set -e

echo "🔧 TimeFlow Email Reports Fix Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check environment variables
check_env_vars() {
    echo -e "${BLUE}📋 Checking environment variables...${NC}"
    
    missing_vars=()
    
    if [ -z "$VITE_SUPABASE_URL" ]; then
        missing_vars+=("VITE_SUPABASE_URL")
    fi
    
    if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
        missing_vars+=("VITE_SUPABASE_ANON_KEY")
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        missing_vars+=("SUPABASE_SERVICE_ROLE_KEY")
    fi
    
    if [ -z "$RESEND_API_KEY" ]; then
        missing_vars+=("RESEND_API_KEY")
    fi
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All required environment variables are set${NC}"
        return 0
    else
        echo -e "${RED}❌ Missing environment variables:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "${RED}   - $var${NC}"
        done
        return 1
    fi
}

# Function to load environment variables
load_env() {
    if [ -f ".env" ]; then
        echo -e "${BLUE}📄 Loading environment variables from .env file...${NC}"
        export $(cat .env | grep -v '#' | xargs)
    else
        echo -e "${YELLOW}⚠️  No .env file found${NC}"
    fi
}

# Function to test Supabase connection
test_supabase_connection() {
    echo -e "${BLUE}🔗 Testing Supabase connection...${NC}"
    
    if ! command_exists curl; then
        echo -e "${RED}❌ curl is not installed${NC}"
        return 1
    fi
    
    local response
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        "${VITE_SUPABASE_URL}/rest/v1/users?select=count" \
        -o /dev/null)
    
    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}✅ Supabase connection successful${NC}"
        return 0
    else
        echo -e "${RED}❌ Supabase connection failed (HTTP $response)${NC}"
        return 1
    fi
}

# Function to test edge function
test_edge_function() {
    echo -e "${BLUE}🧪 Testing email edge function...${NC}"
    
    local test_url="${VITE_SUPABASE_URL}/functions/v1/email-reports/test-email"
    
    echo "Testing URL: $test_url"
    
    local response
    response=$(curl -s -w "%{http_code}" -X POST \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        "$test_url" \
        -d '{"test": true}')
    
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✅ Edge function test successful${NC}"
        echo "Response: $body"
        return 0
    else
        echo -e "${RED}❌ Edge function test failed (HTTP $http_code)${NC}"
        echo "Response: $body"
        return 1
    fi
}

# Function to test daily report
test_daily_report() {
    echo -e "${BLUE}📅 Testing daily report generation...${NC}"
    
    local daily_url="${VITE_SUPABASE_URL}/functions/v1/email-reports/send-daily-report"
    
    local response
    response=$(curl -s -w "%{http_code}" -X POST \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        "$daily_url" \
        -d '{"test": true}')
    
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✅ Daily report test successful${NC}"
        echo "Response: $body"
        return 0
    else
        echo -e "${RED}❌ Daily report test failed (HTTP $http_code)${NC}"
        echo "Response: $body"
        return 1
    fi
}

# Function to test weekly report
test_weekly_report() {
    echo -e "${BLUE}📊 Testing weekly report generation...${NC}"
    
    local weekly_url="${VITE_SUPABASE_URL}/functions/v1/email-reports/send-weekly-report"
    
    local response
    response=$(curl -s -w "%{http_code}" -X POST \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        "$weekly_url" \
        -d '{"test": true}')
    
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✅ Weekly report test successful${NC}"
        echo "Response: $body"
        return 0
    else
        echo -e "${RED}❌ Weekly report test failed (HTTP $http_code)${NC}"
        echo "Response: $body"
        return 1
    fi
}

# Function to check database setup
check_database_setup() {
    echo -e "${BLUE}🗄️  Checking database setup...${NC}"
    
    # Check if admin users exist
    local admin_count
    admin_count=$(curl -s -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        "${VITE_SUPABASE_URL}/rest/v1/users?select=count&role=eq.admin" | grep -o '"count":[0-9]*' | cut -d: -f2)
    
    if [ "$admin_count" -gt 0 ]; then
        echo -e "${GREEN}✅ Found $admin_count admin user(s)${NC}"
    else
        echo -e "${RED}❌ No admin users found${NC}"
        echo -e "${YELLOW}   Please ensure you have users with role = 'admin' in your database${NC}"
        return 1
    fi
}

# Function to generate fixed SQL file
generate_sql_file() {
    echo -e "${BLUE}📝 Generating personalized SQL setup file...${NC}"
    
    local sql_file="setup-automated-email-reports-configured.sql"
    
    # Copy the fixed SQL file and replace placeholders
    cp setup-automated-email-reports-fixed.sql "$sql_file"
    
    # Replace placeholders with actual values
    sed -i "s|YOUR_SUPABASE_URL|$VITE_SUPABASE_URL|g" "$sql_file"
    sed -i "s|YOUR_SERVICE_ROLE_KEY|$SUPABASE_SERVICE_ROLE_KEY|g" "$sql_file"
    
    echo -e "${GREEN}✅ Generated $sql_file with your configuration${NC}"
    echo -e "${YELLOW}   Run this file in your Supabase SQL Editor to set up cron jobs${NC}"
}

# Function to show environment setup instructions
show_env_setup() {
    echo -e "${YELLOW}📋 Environment Setup Instructions:${NC}"
    echo ""
    echo "Create a .env file with the following variables:"
    echo ""
    echo "VITE_SUPABASE_URL=https://your-project.supabase.co"
    echo "VITE_SUPABASE_ANON_KEY=your-anon-key"
    echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo "RESEND_API_KEY=your-resend-api-key"
    echo ""
    echo "You can find these values in your Supabase dashboard:"
    echo "1. Go to Settings > API"
    echo "2. Copy the Project URL (VITE_SUPABASE_URL)"
    echo "3. Copy the anon/public key (VITE_SUPABASE_ANON_KEY)"
    echo "4. Copy the service_role key (SUPABASE_SERVICE_ROLE_KEY)"
    echo "5. Create a Resend API key at https://resend.com/api-keys"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting email reports fix process...${NC}"
    echo ""
    
    # Load environment variables
    load_env
    
    # Check if all required environment variables are set
    if ! check_env_vars; then
        echo ""
        show_env_setup
        exit 1
    fi
    
    echo ""
    
    # Test Supabase connection
    if ! test_supabase_connection; then
        echo -e "${RED}❌ Cannot proceed without Supabase connection${NC}"
        exit 1
    fi
    
    echo ""
    
    # Check database setup
    if ! check_database_setup; then
        echo -e "${YELLOW}⚠️  Database setup issues detected${NC}"
    fi
    
    echo ""
    
    # Test edge function
    if ! test_edge_function; then
        echo -e "${RED}❌ Edge function test failed${NC}"
        echo -e "${YELLOW}   Make sure the email-reports function is deployed${NC}"
        exit 1
    fi
    
    echo ""
    
    # Test reports
    test_daily_report
    echo ""
    test_weekly_report
    echo ""
    
    # Generate SQL file
    generate_sql_file
    
    echo ""
    echo -e "${GREEN}🎉 Email reports system test completed!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Run the generated SQL file (setup-automated-email-reports-configured.sql) in your Supabase SQL Editor"
    echo "2. Check the cron jobs are scheduled correctly"
    echo "3. Monitor the function logs for any errors"
    echo "4. Test the system by waiting for the scheduled times or triggering manually"
    echo ""
}

# Run main function
main "$@"