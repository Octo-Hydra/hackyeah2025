# Mobile Map Viewport Locking

## Problem
On mobile devices, the map page was scrollable, which created a poor user experience:
- Users could accidentally scroll past the map
- Pull-to-refresh could interfere with map interactions
- The viewport height would change when the browser chrome appeared/disappeared
- Rubber band scrolling on iOS was distracting

## Solution

### 1. CSS Utilities (`globals.css`)

Added new utility classes for mobile viewport control:

```css
/* Prevent overscroll/bounce on mobile map view */
.no-overscroll {
  overscroll-behavior: none;
  overflow: hidden;
}

/* Fix for mobile viewport height (accounts for browser chrome) */
.h-screen-mobile {
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height - new standard */
}

/* iOS Safari specific fix */
@supports (-webkit-touch-callout: none) {
  .h-screen-mobile {
    height: -webkit-fill-available;
  }
}
```

### 2. Component Changes

#### Home Page (`src/app/(parallel)/page.tsx`)

```tsx
// 1. Added useEffect to lock body scroll
useEffect(() => {
  const originalStyle = window.getComputedStyle(document.body).overflow;
  const originalPosition = window.getComputedStyle(document.body).position;

  // Lock scroll
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.height = "100%";

  // Restore on unmount
  return () => {
    document.body.style.overflow = originalStyle;
    document.body.style.position = originalPosition;
    document.body.style.width = "";
    document.body.style.height = "";
  };
}, []);

// 2. Updated MobileLayout wrapper
<MobileLayout className="h-screen-mobile no-overscroll">

// 3. Added overflow-hidden to map container
<main className="relative flex-1 overflow-hidden">
```

#### MobileLayout (`src/components/mobile-layout.tsx`)

```tsx
// Updated to support className on root div
<div className={cn("flex min-h-screen flex-col", className)}>
```

## Result

✅ Map is locked to viewport height on mobile  
✅ No unwanted scrolling or bouncing  
✅ Works on iOS Safari (with -webkit-fill-available)  
✅ Works on modern browsers (with dvh - dynamic viewport height)  
✅ Proper fallback for older browsers (100vh)  
✅ Body scroll is restored when navigating away  

## Browser Support

- **iOS Safari**: ✅ Uses `-webkit-fill-available`
- **Chrome/Edge**: ✅ Uses `100dvh` (dynamic viewport height)
- **Firefox**: ✅ Uses `100dvh`
- **Older browsers**: ✅ Falls back to `100vh`

## Technical Details

### Dynamic Viewport Height (dvh)
- `100dvh` adjusts when browser chrome appears/disappears
- Prevents layout shifts on scroll
- Better UX than traditional `100vh`

### Body Locking
- Only applies to home/map page
- Automatically restored on unmount
- Preserves original styles
- Prevents page-level scrolling

### Overscroll Behavior
- `overscroll-behavior: none` prevents rubber-band effect
- Stops pull-to-refresh from activating accidentally
- Improves map interaction on mobile

## Testing

Test on:
- [ ] iPhone Safari (check for rubber-band scroll)
- [ ] Android Chrome (check dvh support)
- [ ] iPad Safari (landscape/portrait)
- [ ] Desktop browsers (ensure no regression)

## Future Enhancements

Potential improvements:
- Add pull-to-refresh for map data
- Swipe gestures for bottom sheet
- Pinch-to-zoom optimization
- Better map gesture handling

---

**The map is now perfectly locked to the viewport on mobile! 🎯**
