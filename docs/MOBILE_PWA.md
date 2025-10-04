# OnTime - Mobile PWA Experience

## Mobile-Native Features

OnTime is built with a mobile-first approach, providing a native app-like experience as a Progressive Web App (PWA).

### Native Mobile Navigation

- **Bottom Navigation Bar**: Native iOS/Android-style bottom tab navigation
  - Home (Map view)
  - Alerts (Activity feed)
  - Profile (User settings)
  - Moderator (Admin panel)
  
- **Adaptive UI**: 
  - Mobile: Bottom navigation with compact headers
  - Desktop: Traditional top navigation with full headers

### Mobile-Optimized Pages

#### Home Page (`/`)
- Full-screen map interface
- Floating Action Button (FAB) for quick alert creation
- Compact header with OnTime logo
- Welcome card for unauthenticated users

#### Alerts Page (`/alerts`)
- Card-based alert list
- Stats dashboard
- Quick filters
- Swipeable cards

#### Profile Page (`/user`)
- Clean profile view
- Avatar display
- Account management
- Native-feeling buttons

#### Moderator Panel (`/moderator`)
- Dashboard stats
- Quick action cards
- Recent activity feed

### PWA Features

1. **Installable**: Add to home screen on mobile devices
2. **Offline-capable**: Service worker for offline functionality
3. **Native Look**: 
   - No browser chrome when installed
   - Splash screen
   - Status bar styling
4. **Touch-optimized**: 
   - Large tap targets
   - Smooth scrolling
   - Gesture support

### Design Principles

- **Touch-first**: All UI elements sized for finger interaction
- **Performance**: Optimized for mobile networks
- **Accessibility**: High contrast, readable fonts
- **Safe areas**: Respects notch and home indicator areas on modern devices

### Mobile Components

#### `<MobileLayout>`
Wrapper component that provides:
- Bottom navigation
- Safe area spacing
- Consistent layout across pages

#### `<MobileNav>`
Bottom tab navigation with:
- Active state indicators
- Icon + label design
- Smooth transitions
- Dynamic visibility based on auth state

### Responsive Breakpoints

```css
- Mobile: < 768px (Bottom nav, compact UI)
- Tablet: 768px - 1024px (Adaptive layout)
- Desktop: > 1024px (Traditional layout)
```

### Getting Started on Mobile

1. Open OnTime in your mobile browser
2. Tap the "Share" button (iOS) or menu (Android)
3. Select "Add to Home Screen"
4. The app will install with a native look and feel

### Development Tips

- Test on real devices for accurate touch feedback
- Use Chrome DevTools mobile emulation
- Test safe area insets on notched devices
- Verify PWA manifest is properly configured

---

**No more waiting, just on-time arrivals!** 🚀
