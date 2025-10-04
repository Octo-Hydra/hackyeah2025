#!/bin/bash

# HackYeah 2025 - Environment Setup Script
# This script helps you configure your .env file for local development

echo "🚀 HackYeah 2025 - Environment Setup"
echo "===================================="
echo ""

# Check if .env already exists
if [ -f .env ]; then
  echo "⚠️  .env file already exists"
  read -p "Do you want to overwrite it? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Exiting without changes"
    exit 0
  fi
fi

# Copy from example
echo "📋 Copying .env.example to .env..."
cp .env.example .env

# MongoDB Configuration
echo ""
echo "🗄️  MongoDB Configuration"
echo "------------------------"
echo "Choose your MongoDB setup:"
echo "1) Docker Compose (local, with auth - recommended)"
echo "2) Docker Compose (local, no auth)"
echo "3) MongoDB Atlas (cloud)"
echo "4) Custom connection string"
read -p "Enter choice (1-4): " mongo_choice

case $mongo_choice in
  1)
    # Docker with auth
    echo "Using Docker Compose MongoDB with authentication"
    sed -i 's|MONGODB_URI=.*|MONGODB_URI=mongodb://admin:admin@localhost:27017/hackyeah2025?authSource=admin|' .env
    ;;
  2)
    # Docker without auth
    echo "⚠️  Warning: Running MongoDB without authentication is not recommended for production"
    sed -i 's|MONGODB_URI=.*|MONGODB_URI=mongodb://localhost:27017/hackyeah2025|' .env
    ;;
  3)
    # MongoDB Atlas
    read -p "Enter your MongoDB Atlas connection string: " atlas_uri
    sed -i "s|MONGODB_URI=.*|MONGODB_URI=$atlas_uri|" .env
    ;;
  4)
    # Custom
    read -p "Enter your MongoDB connection string: " custom_uri
    sed -i "s|MONGODB_URI=.*|MONGODB_URI=$custom_uri|" .env
    ;;
  *)
    echo "Invalid choice, using default (Docker with auth)"
    sed -i 's|MONGODB_URI=.*|MONGODB_URI=mongodb://admin:admin@localhost:27017/hackyeah2025?authSource=admin|' .env
    ;;
esac

# NextAuth Secret
echo ""
echo "🔐 NextAuth Secret"
echo "------------------"
echo "Generating secure NextAuth secret..."
SECRET=$(openssl rand -base64 32)
sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$SECRET|" .env
echo "✓ Generated NextAuth secret"

# VAPID Keys for Push Notifications
echo ""
echo "🔔 Push Notification VAPID Keys"
echo "-------------------------------"
echo "The project already has VAPID keys configured."
read -p "Do you want to generate new VAPID keys? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Generating VAPID keys..."
  if command -v npx &> /dev/null; then
    VAPID_OUTPUT=$(npx web-push generate-vapid-keys --json 2>/dev/null)
    if [ $? -eq 0 ]; then
      PUBLIC_KEY=$(echo $VAPID_OUTPUT | grep -o '"publicKey":"[^"]*"' | cut -d'"' -f4)
      PRIVATE_KEY=$(echo $VAPID_OUTPUT | grep -o '"privateKey":"[^"]*"' | cut -d'"' -f4)
      sed -i "s|NEXT_PUBLIC_VAPID_PUBLIC_KEY=.*|NEXT_PUBLIC_VAPID_PUBLIC_KEY=$PUBLIC_KEY|" .env
      sed -i "s|VAPID_PRIVATE_KEY=.*|VAPID_PRIVATE_KEY=$PRIVATE_KEY|" .env
      echo "✓ Generated new VAPID keys"
    else
      echo "⚠️  Failed to generate VAPID keys. Keeping existing ones."
    fi
  else
    echo "⚠️  npx not found. Keeping existing VAPID keys."
  fi
else
  echo "Keeping existing VAPID keys from .env.example"
fi

# Google OAuth
echo ""
echo "🔑 Google OAuth (Optional)"
echo "-------------------------"
read -p "Do you want to configure Google OAuth now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  read -p "Enter your Google Client ID: " google_id
  read -p "Enter your Google Client Secret: " google_secret
  sed -i "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$google_id|" .env
  sed -i "s|GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$google_secret|" .env
  echo "✓ Google OAuth configured"
else
  echo "Skipping Google OAuth configuration"
  echo "You can configure it later by editing .env file"
fi

# Start MongoDB if using Docker
if [[ $mongo_choice == "1" ]] || [[ $mongo_choice == "2" ]]; then
  echo ""
  echo "🐳 Starting MongoDB with Docker Compose"
  echo "---------------------------------------"
  if command -v docker &> /dev/null && command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
    docker compose up -d
    echo "✓ MongoDB started"
    echo ""
    echo "📊 MongoDB is running at: mongodb://localhost:27017"
  else
    echo "⚠️  Docker or docker-compose not found"
    echo "Please install Docker and run: docker compose up -d"
  fi
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📝 Next steps:"
echo "1. Review your .env file and make any additional changes"
if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ $mongo_choice == "1" ]] || [[ $mongo_choice == "2" ]]; then
  echo "2. Start MongoDB: docker compose up -d"
fi
echo "2. Install dependencies: npm install"
echo "3. Start development server: npm run dev"
echo "4. Open http://localhost:3000"
echo ""
echo "📖 For more information, see:"
echo "   - docs/QUICKSTART.md"
echo "   - docs/MONGODB_AUTH_FIX.md"
echo "   - docs/NEXTAUTH_SETUP.md"
echo ""
