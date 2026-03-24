#!/bin/bash

# Clerk Webhook Test Script
# This script helps test the webhook endpoint locally

echo "🔍 Testing Clerk Webhook Implementation"
echo "========================================"
echo ""

# Check if environment variable is set
if [ -z "$CLERK_WEBHOOK_SECRET" ]; then
    echo "❌ CLERK_WEBHOOK_SECRET is not set in environment"
    echo "   Add it to your .env file: CLERK_WEBHOOK_SECRET=whsec_..."
    exit 1
else
    echo "✅ CLERK_WEBHOOK_SECRET is configured"
fi

# Check if server is running
SERVER_URL="http://localhost:5000"
if curl -s "$SERVER_URL/health" > /dev/null; then
    echo "✅ Backend server is running on port 5000"
else
    echo "❌ Backend server is not running"
    echo "   Start it with: pnpm dev"
    exit 1
fi

# Check webhook endpoint exists
echo ""
echo "📡 Testing webhook endpoint..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$SERVER_URL/webhook/clerk" \
    -H "Content-Type: application/json" \
    -d '{}')

if [ "$RESPONSE" = "400" ]; then
    echo "✅ Webhook endpoint exists (returned 400 - missing Svix headers)"
elif [ "$RESPONSE" = "200" ]; then
    echo "⚠️  Webhook endpoint exists but accepted invalid request"
else
    echo "❌ Unexpected response: $RESPONSE"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Install ngrok: npm install -g ngrok"
echo "2. Expose server: ngrok http 5000"
echo "3. Copy ngrok URL: https://abc123.ngrok.io"
echo "4. Add webhook in Clerk Dashboard:"
echo "   URL: https://abc123.ngrok.io/webhook/clerk"
echo "   Events: user.created, user.updated, user.deleted"
echo "5. Test with 'Send test event' in Clerk Dashboard"
echo ""
echo "📚 Full documentation: apps/backend/src/jobs/WEBHOOK_SETUP.md"
