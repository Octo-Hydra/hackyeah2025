# OnTime - PWA Installation & Splash Screens Guide

## 🎨 Splash Screen Setup

### Quick Start

#### Option 1: Web-Based Generator (Easiest)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open in browser:
   ```
   http://localhost:3000/splash-generator.html
   ```

3. The generator will automatically load your logo
4. Adjust the background color if needed
5. Click "Generate Splash Screens"
6. Click "Download All Splash Screens"
7. Place all downloaded files in `/public/` directory

#### Option 2: Using ImageMagick Script

If you have ImageMagick installed:

```bash
# Make the script executable (if not already)
chmod +x scripts/generate-splash-screens.sh

# Run the generator
./scripts/generate-splash-screens.sh
```

### Splash Screen Specifications

The following splash screens are configured:

| Device | Size | File |
|--------|------|------|
| iPhone SE, 5s | 640×1136 | `splash-640x1136.png` |
| iPhone 8, 7, 6s | 750×1334 | `splash-750x1334.png` |
| iPhone 8 Plus | 1242×2208 | `splash-1242x2208.png` |
| iPhone X, XS, 11 Pro | 1125×2436 | `splash-1125x2436.png` |
| iPhone XS Max, 11 Pro Max | 1242×2688 | `splash-1242x2688.png` |

### Customizing Splash Screens

#### Background Color

Edit the background color in the generator:
- **Default**: `#0066FF` (OnTime Blue)
- **Alternative**: `#FFFFFF` (White)
- Or use your brand color

#### Logo Size

The logo is automatically sized to 1/3 of the screen width, centered on the background.

## 📲 PWA Installation

### Features Added

1. **Enhanced Manifest** (`public/manifest.json`):
   - ✅ Proper icon definitions with `maskable` support
   - ✅ Splash screen configuration
   - ✅ App shortcuts (Map, Alerts)
   - ✅ Screenshots for app listings
   - ✅ Display modes and theme colors

2. **iOS Splash Screens** (`src/app/layout.tsx`):
   - ✅ Apple-touch-startup-image links
   - ✅ Media queries for different devices
   - ✅ Proper orientation support

3. **Install Prompt Component** (`src/components/install-prompt.tsx`):
   - ✅ Auto-detects platform (iOS, Android, Desktop)
   - ✅ Custom instructions for each platform
   - ✅ One-click install for Android/Desktop
   - ✅ Hides when already installed

### Testing Installation

#### On iOS (Safari):

1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add" in the top right
5. The app icon appears on your home screen
6. When you open it, you'll see the splash screen!

#### On Android (Chrome):

1. Open the app in Chrome
2. Tap the menu (⋮)
3. Tap "Install app" or "Add to Home Screen"
4. Confirm the installation
5. The app appears in your app drawer
6. Splash screen shows on launch

#### On Desktop (Chrome/Edge):

1. Look for the install icon (⊕) in the address bar
2. Click it and confirm
3. Or: Menu → "Install OnTime"
4. App opens in standalone window

### PWA Manifest Features

```json
{
  "display": "standalone",           // No browser UI
  "orientation": "portrait-primary", // Lock to portrait
  "theme_color": "#0066FF",         // OnTime blue
  "background_color": "#ffffff",     // White background
  "shortcuts": [...],                // Quick actions
  "categories": [...]                // App store categories
}
```

### App Shortcuts

Two quick actions are configured:

1. **View Map** - Direct link to main map view
2. **My Alerts** - Quick access to alerts page

Long-press the app icon (Android) or right-click (Desktop) to access shortcuts.

## 🎯 Installation Checklist

### Before Deployment

- [ ] Generate all splash screens
- [ ] Test splash screens on real iOS device
- [ ] Test PWA installation on Android
- [ ] Test PWA installation on Desktop
- [ ] Verify manifest.json is accessible
- [ ] Check service worker is registered
- [ ] Test offline functionality
- [ ] Verify app shortcuts work
- [ ] Check theme colors match brand
- [ ] Test on multiple screen sizes

### Files Required

```
public/
├── manifest.json                 ✅ Enhanced with splash config
├── apple-touch-icon.png         ✅ App icon (180x180)
├── android-chrome-192x192.png   ✅ Android icon
├── android-chrome-512x512.png   ✅ Android icon (large)
├── splash-640x1136.png          ⚠️  Generate this
├── splash-750x1334.png          ⚠️  Generate this
├── splash-1242x2208.png         ⚠️  Generate this
├── splash-1125x2436.png         ⚠️  Generate this
├── splash-1242x2688.png         ⚠️  Generate this
├── screenshot-mobile.png        ⚠️  Generate this
└── sw.js                        ✅ Service worker
```

## 🚀 Quick Commands

```bash
# Generate splash screens (ImageMagick)
./scripts/generate-splash-screens.sh

# Start dev server
npm run dev

# Open splash generator
open http://localhost:3000/splash-generator.html

# Build for production
npm run build

# Test production build
npm run start
```

## 🎨 Design Guidelines

### Splash Screen Best Practices

1. **Keep it simple**: Logo + solid color background
2. **Brand consistent**: Use your primary brand color
3. **Fast loading**: Keep file sizes reasonable
4. **High contrast**: Ensure logo is visible on background
5. **Centered**: Logo should be centered vertically and horizontally

### Recommended Colors

- **OnTime Blue**: `#0066FF` (Current default)
- **White**: `#FFFFFF` (Clean, minimalist)
- **Dark**: `#1a1a1a` (For dark theme)

## 📱 Platform-Specific Notes

### iOS

- Safari is required for initial installation
- Splash screens are cached (may need to reinstall to see updates)
- Status bar color controlled by meta tags
- Home screen icon uses `apple-touch-icon.png`

### Android

- Chrome provides the best experience
- Material Design install prompt
- App can be published to Google Play Store
- Splash screen duration depends on app load time

### Desktop

- Windows, macOS, Linux supported
- Appears in Start Menu / Applications folder
- Can be set as default handler for URLs
- Runs in standalone window

## 🔧 Troubleshooting

### Splash Screen Not Showing

1. Clear browser cache
2. Uninstall and reinstall PWA
3. Check file paths in manifest.json
4. Verify file sizes aren't too large
5. Check console for errors

### Install Prompt Not Appearing

1. Check if already installed
2. Verify manifest.json is valid
3. Ensure HTTPS (required for PWA)
4. Check service worker is registered
5. Verify all required manifest fields

### Icons Not Displaying

1. Check file paths are correct
2. Verify icon files exist
3. Check file permissions
4. Clear browser cache
5. Regenerate icons if needed

## 📚 Resources

- [Web App Manifest Spec](https://www.w3.org/TR/appmanifest/)
- [PWA Builder](https://www.pwabuilder.com/)
- [iOS PWA Guidelines](https://developer.apple.com/documentation/webkit/creating_a_web_app)
- [Android App Install Banners](https://web.dev/customize-install/)

---

**Your app is now ready for a perfect installation experience!** 🎉

For support, check our main documentation in `/docs/`
