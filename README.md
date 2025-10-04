# OnTime - Progressive Web App

**No more waiting, just on-time arrivals!**

A modern mobile-first PWA built with Next.js 15, featuring real-time navigation, push notifications, native app experience, and beautiful UI.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Generate VAPID keys for push notifications
web-push generate-vapid-keys

# Run development server with HTTPS (required for PWA)
npm run dev -- --experimental-https
```

Visit: **https://localhost:3000**

## 📱 Features

### 🎯 Mobile Native Experience
- ✅ **Native Bottom Navigation** - iOS/Android style tab bar
- ✅ **Beautiful Splash Screens** - Custom screens for all iOS devices
- ✅ **Touch-Optimized UI** - Large tap targets, smooth animations
- ✅ **Safe Area Support** - Perfect on notched devices (iPhone X+)

### 💪 PWA Capabilities
- ✅ **Installable** - Add to home screen on any device
- ✅ **Offline Support** - Service worker with background sync
- ✅ **Push Notifications** - Real-time alerts with MongoDB storage
- ✅ **App Shortcuts** - Quick actions from home screen

### 🔐 Authentication & Data
- ✅ **NextAuth.js v5** - Credentials & OAuth (Google, Facebook)
- ✅ **MongoDB** - User accounts & push subscriptions
- ✅ **GraphQL API** - Modern data layer with Zeus

### 🎨 Modern Stack
- ✅ **Next.js 15** - App Router with Turbopack
- ✅ **Tailwind CSS** - Beautiful responsive design
- ✅ **TypeScript** - Full type safety
- ✅ **shadcn/ui** - Premium UI components

## � Mobile PWA Guide

**NEW!** Check out our comprehensive mobile PWA documentation:
- 📘 **[README_MOBILE_PWA.md](./README_MOBILE_PWA.md)** - Complete implementation guide
- 📱 **[docs/MOBILE_PWA.md](./docs/MOBILE_PWA.md)** - Mobile features overview
- 🎨 **[docs/PWA_INSTALLATION.md](./docs/PWA_INSTALLATION.md)** - Installation & splash screens

## �📂 Project Structure

```
├── docs/                      # 📚 All documentation
│   ├── MOBILE_PWA.md         # 🆕 Mobile features guide
│   ├── PWA_INSTALLATION.md   # 🆕 Installation & splash screens
│   ├── PWA_QUICKSTART.md     # Quick start guide
│   ├── PWA_GUIDE.md          # Complete PWA documentation
│   ├── NEXTAUTH_SETUP.md     # Authentication guide
│   ├── DATABASE_SCHEMA.md    # MongoDB collections schema
│   └── QUICKSTART.md         # NextAuth quick start
├── src/
│   ├── app/
│   │   ├── manifest.ts       # PWA manifest (Next.js 15 native)
│   │   ├── page.tsx          # Home page
│   │   ├── pwa/page.tsx      # PWA demo page
│   │   ├── auth/signin/      # Authentication pages
│   │   ├── dashboard/        # Protected routes
│   │   ├── actions/
│   │   │   ├── auth.ts       # Auth server actions
│   │   │   └── notifications.ts  # Push notifications (MongoDB)
│   │   └── api/auth/[...nextauth]/  # NextAuth API routes
│   ├── components/
│   │   ├── install-prompt.tsx        # PWA install UI
│   │   ├── push-notification-manager.tsx  # Notification UI
│   │   ├── auth-provider.tsx         # Session provider
│   │   └── ui/               # Shadcn UI components
│   ├── lib/
│   │   ├── mongodb.ts        # MongoDB client (singleton)
│   │   └── auth-utils.ts     # User registration utilities
│   ├── auth.ts               # NextAuth configuration
│   └── middleware.ts         # Route protection
├── public/
│   ├── sw.js                 # Service worker
│   ├── manifest.json         # Static manifest fallback
│   └── icons/                # PWA icons (72-512px)
├── next.config.ts            # Security headers for PWA
└── .env.example              # Environment variables template
```

## 🔧 Configuration

### 1. Environment Variables

Create `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/hackyeah2025

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Push Notifications (generate with: web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
```

### 2. Generate Keys

```bash
# NextAuth secret
openssl rand -base64 32

# VAPID keys for push notifications
web-push generate-vapid-keys
```

### 3. MongoDB Setup

**Option A: Local MongoDB**

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option B: MongoDB Atlas** (Recommended)

1. Create free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Add to `.env.local`

## 📊 MongoDB Collections

The app uses these collections (see `docs/DATABASE_SCHEMA.md`):

- **users** - User accounts (NextAuth)
- **accounts** - OAuth accounts (NextAuth)
- **sessions** - User sessions (NextAuth)
- **verificationTokens** - Email verification (NextAuth)
- **pushSubscriptions** - Push notification subscriptions (Custom with MongoDB)

All indexes are created automatically.

## 🔔 Push Notifications

Push notifications are stored in MongoDB (`pushSubscriptions` collection):

```typescript
import {
  sendNotification,
  sendLocationAlert,
} from "@/app/actions/notifications";

// Send notification to all subscribers
await sendNotification("Speed camera ahead!", "Alert");

// Send location-based alert
await sendLocationAlert(
  { lat: 52.2297, lng: 21.0122 },
  "Speed Camera",
  "300m ahead on your route"
);
```

### Features

- ✅ Stored in MongoDB (no in-memory storage)
- ✅ Automatic cleanup of invalid subscriptions (410/404)
- ✅ Batch notifications to all users
- ✅ Custom notification payloads

## 📱 PWA Features

### Install on Device

**iOS (Safari)**

1. Tap Share (⎋)
2. "Add to Home Screen"
3. Tap "Add"

**Android (Chrome)**

1. Tap Menu (⋮)
2. "Install app"
3. Confirm

**Desktop**

- Look for install icon (+) in address bar

### Test PWA

1. Visit `/pwa` to test features
2. Enable push notifications
3. Send test notifications
4. Check service worker in DevTools

## 🔒 Authentication

NextAuth.js v5 with MongoDB adapter:

- **Credentials** - Email/password (bcrypt hashed)
- **Google OAuth** - One-click sign-in
- **Protected Routes** - Middleware-based protection

See `docs/NEXTAUTH_SETUP.md` for details.

## 🗺️ Perfect for Yanosik-Style Apps

This setup includes everything needed for real-time navigation apps:

✅ Push notifications for alerts (speed cameras, police, traffic)
✅ Geolocation API ready
✅ WebSocket support for real-time data
✅ Service worker for offline maps
✅ MongoDB for storing user reports
✅ Mobile-first responsive design

## 🚀 Deployment

### Vercel (Recommended)

```bash
npm run build
vercel deploy
```

Add environment variables in Vercel dashboard.

### Requirements

- ✅ HTTPS (automatic on Vercel)
- ✅ MongoDB Atlas connection
- ✅ Environment variables configured

## 📚 Documentation

All documentation is in the `docs/` folder:

- **PWA_QUICKSTART.md** - 3-step PWA setup
- **PWA_GUIDE.md** - Complete PWA guide with examples
- **NEXTAUTH_SETUP.md** - Authentication setup
- **DATABASE_SCHEMA.md** - MongoDB collections & indexes
- **QUICKSTART.md** - NextAuth quick reference

## 🧪 Testing

```bash
# Build for production
npm run build

# Run production build
npm start

# Lint
npm run lint
```

### Test Checklist

- [ ] Visit `https://localhost:3000/pwa`
- [ ] Install app on mobile device
- [ ] Subscribe to push notifications
- [ ] Send test notification
- [ ] Register new account
- [ ] Sign in with credentials
- [ ] Sign in with Google (if configured)
- [ ] Check MongoDB for push subscriptions
- [ ] Test offline functionality

## 🎯 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + Shadcn UI
- **Auth**: NextAuth.js v5 (beta)
- **Database**: MongoDB
- **Push Notifications**: Web Push API + web-push
- **PWA**: Native Next.js 15 (no external libraries)
- **Icons**: Lucide React

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📞 Support

- Check documentation in `docs/` folder
- Review MongoDB schema in `docs/DATABASE_SCHEMA.md`
- Test PWA features at `/pwa`

Happy hacking! 🚀
