#!/bin/bash

# Google OAuth Development Setup Helper
# This script helps setup ngrok for Google OAuth testing

echo "🔐 Google OAuth Development Setup Helper"
echo "========================================="
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed!"
    echo ""
    echo "Install ngrok:"
    echo "  Mac/Linux: brew install ngrok"
    echo "  Or download from: https://ngrok.com/download"
    echo ""
    exit 1
fi

echo "✅ ngrok is installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file first."
    exit 1
fi

echo "📝 Current NEXT_PUBLIC_BASE_URL:"
grep NEXT_PUBLIC_BASE_URL .env
echo ""

echo "🚀 Starting ngrok tunnel..."
echo ""
echo "Instructions:"
echo "1. Copy the HTTPS URL from ngrok (e.g., https://abc123.ngrok.io)"
echo "2. Update NEXT_PUBLIC_BASE_URL in .env with this URL"
echo "3. Update Google Cloud Console:"
echo "   - Authorized JavaScript origins: https://your-url.ngrok.io"
echo "   - Authorized redirect URIs: https://your-url.ngrok.io/api/auth/callback/google"
echo "4. Restart your dev server (npm run dev)"
echo ""
echo "Press Ctrl+C to stop ngrok"
echo ""
echo "Starting ngrok on port 3000..."
echo "========================================"

ngrok http 3000
