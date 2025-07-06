#!/bin/bash

# Test Email Reports Script
# Simple script to test if email reports are working

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📧 TimeFlow Email Reports Test${NC}"
echo "================================="
echo ""

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Check if required vars are set
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    echo "Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Test 1: Send test email
echo -e "${BLUE}1. Testing email configuration...${NC}"
response=$(curl -s -X POST "${VITE_SUPABASE_URL}/functions/v1/email-reports/test-email" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json")

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Test email sent successfully${NC}"
else
    echo -e "${RED}❌ Test email failed${NC}"
    echo "Response: $response"
fi

echo ""

# Test 2: Generate daily report
echo -e "${BLUE}2. Testing daily report generation...${NC}"
response=$(curl -s -X POST "${VITE_SUPABASE_URL}/functions/v1/email-reports/send-daily-report" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json")

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Daily report generated successfully${NC}"
else
    echo -e "${RED}❌ Daily report failed${NC}"
    echo "Response: $response"
fi

echo ""

# Test 3: Generate weekly report
echo -e "${BLUE}3. Testing weekly report generation...${NC}"
response=$(curl -s -X POST "${VITE_SUPABASE_URL}/functions/v1/email-reports/send-weekly-report" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json")

if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Weekly report generated successfully${NC}"
else
    echo -e "${RED}❌ Weekly report failed${NC}"
    echo "Response: $response"
fi

echo ""

# Test 4: Check cron jobs
echo -e "${BLUE}4. Checking cron jobs...${NC}"
echo "Run this query in your Supabase SQL Editor:"
echo -e "${YELLOW}SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE '%email%';${NC}"

echo ""
echo -e "${GREEN}🎉 Email reports testing completed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Check your email for test messages"
echo "2. Verify cron jobs are scheduled in Supabase"
echo "3. Monitor function logs for any errors"
echo "4. Reports will be sent automatically at scheduled times"