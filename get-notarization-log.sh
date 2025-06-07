#!/bin/bash

echo "🔍 Getting Notarization Log"
echo "=========================="

SUBMISSION_ID="ae387893-6e88-455a-8b1d-92244f0119ce"
APPLE_ID="alshqawe66@gmail.com"
TEAM_ID="6GW49LK9V9"

echo "🔐 Enter your app-specific password to get rejection details:"
read -s -p "Password: " APP_PASSWORD
echo ""

echo "📋 Getting detailed log for submission: $SUBMISSION_ID"
echo ""

xcrun notarytool log "$SUBMISSION_ID" \
    --apple-id "$APPLE_ID" \
    --team-id "$TEAM_ID" \
    --password "$APP_PASSWORD" 