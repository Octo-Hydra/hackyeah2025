#!/bin/bash

# 🔒 Deployment Authentication Check Script
# Run this to verify your environment variables are correctly set

echo "🔍 Checking Authentication Configuration..."
echo ""

# Check if AUTH_SECRET is set
if [ -z "$AUTH_SECRET" ]; then
    echo "❌ AUTH_SECRET is NOT set"
    AUTH_SECRET_STATUS="MISSING"
else
    echo "✅ AUTH_SECRET is set (length: ${#AUTH_SECRET})"
    AUTH_SECRET_STATUS="SET"
fi

# Check if NEXTAUTH_SECRET is set
if [ -z "$NEXTAUTH_SECRET" ]; then
    echo "❌ NEXTAUTH_SECRET is NOT set"
    NEXTAUTH_SECRET_STATUS="MISSING"
else
    echo "✅ NEXTAUTH_SECRET is set (length: ${#NEXTAUTH_SECRET})"
    NEXTAUTH_SECRET_STATUS="SET"
fi

# Check if they match
if [ "$AUTH_SECRET" = "$NEXTAUTH_SECRET" ]; then
    echo "✅ Both secrets MATCH"
    SECRETS_MATCH=true
else
    echo "❌ Secrets DO NOT MATCH (this will cause decoding errors!)"
    SECRETS_MATCH=false
fi

echo ""

# Check NEXTAUTH_URL
if [ -z "$NEXTAUTH_URL" ]; then
    echo "❌ NEXTAUTH_URL is NOT set"
else
    echo "✅ NEXTAUTH_URL is set: $NEXTAUTH_URL"
    
    if [[ $NEXTAUTH_URL == https://* ]]; then
        echo "   ✅ Using HTTPS (correct for production)"
    elif [[ $NEXTAUTH_URL == http://localhost* ]]; then
        echo "   ⚠️  Using localhost (development mode)"
    else
        echo "   ⚠️  Not using HTTPS (production should use HTTPS)"
    fi
fi

echo ""

# Check MongoDB connection
if [ -z "$MONGODB_URI" ]; then
    echo "❌ MONGODB_URI is NOT set"
else
    echo "✅ MONGODB_URI is set"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$AUTH_SECRET_STATUS" = "SET" ] && [ "$NEXTAUTH_SECRET_STATUS" = "SET" ] && [ "$SECRETS_MATCH" = true ]; then
    echo "✅ Configuration is CORRECT"
    echo ""
    echo "Your authentication should work in production."
    exit 0
else
    echo "❌ Configuration has ISSUES"
    echo ""
    echo "ACTION REQUIRED:"
    
    if [ "$AUTH_SECRET_STATUS" = "MISSING" ] || [ "$NEXTAUTH_SECRET_STATUS" = "MISSING" ]; then
        echo "1. Generate a secret: openssl rand -base64 32"
        echo "2. Set both environment variables to the SAME value:"
        echo "   export AUTH_SECRET=your-secret-here"
        echo "   export NEXTAUTH_SECRET=your-secret-here"
    elif [ "$SECRETS_MATCH" = false ]; then
        echo "1. Both secrets must have the SAME value"
        echo "2. Update your deployment platform environment variables"
    fi
    
    exit 1
fi
