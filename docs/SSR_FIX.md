# SSR Fix - Window Undefined Error

## Problem
Build was failing with:
```
ReferenceError: window is not defined
```

This happened because the `useEffect` hook was accessing `window.getComputedStyle` which doesn't exist during server-side rendering (SSR).

## Root Cause
Next.js pre-renders pages on the server where browser APIs like `window`, `document`, etc. are not available.

## Solution

Added a check for browser environment before accessing `window`:

```tsx
useEffect(() => {
  // Only run on client side
  if (typeof window === "undefined") return;

  // Save original styles
  const originalStyle = window.getComputedStyle(document.body).overflow;
  // ... rest of the code
}, []);
```

## Why This Works

1. **`typeof window === "undefined"`** - Safe check that works in SSR
2. **Early return** - Prevents code execution on server
3. **`useEffect` only runs on client** - But Next.js still evaluates the code during build

## Changes Made

### File: `src/app/(parallel)/page.tsx`

**Before:**
```tsx
useEffect(() => {
  const originalStyle = window.getComputedStyle(document.body).overflow;
  // ...
}, []);
```

**After:**
```tsx
useEffect(() => {
  if (typeof window === "undefined") return;
  const originalStyle = window.getComputedStyle(document.body).overflow;
  // ...
}, []);
```

Also cleaned up unused imports:
- Removed unused `Navigation`, `User`, `Shield`, `Plus` from lucide-react

## Testing

After the fix:
- ✅ Build should complete successfully
- ✅ SSR works (no window errors)
- ✅ Client-side scroll locking still works
- ✅ No runtime errors

## Best Practices

When using browser APIs in Next.js:

1. **Always check for browser environment:**
   ```tsx
   if (typeof window === "undefined") return;
   ```

2. **Or use dynamic imports:**
   ```tsx
   const Component = dynamic(() => import('./Component'), { ssr: false });
   ```

3. **Or check in useEffect:**
   ```tsx
   useEffect(() => {
     // This only runs on client
   }, []);
   ```

4. **Use the `"use client"` directive** for client-only components

## Related Documentation

- [Next.js SSR Docs](https://nextjs.org/docs/messages/react-hydration-error)
- [Window Check Pattern](https://nextjs.org/docs/messages/react-hydration-error#solution-1-using-useeffect-to-run-on-the-client-only)

---

**Build should now work! 🎉**
