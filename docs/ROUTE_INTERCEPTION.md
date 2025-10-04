# Route Interception for Sign-In Modal

## Overview

This implementation uses Next.js **Parallel Routes** and **Intercepting Routes** to display the sign-in page in a modal dialog when accessed from the root page, while maintaining the full-page version for direct navigation.

**Key Features:**

- ✅ Map remains visible in background when modal opens
- ✅ Both children (map) and modal render simultaneously
- ✅ Smooth client-side navigation
- ✅ Fallback to full page on refresh/direct access

## How It Works

### Route Interception Pattern

Next.js 13+ supports [intercepting routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes) using special folder naming conventions:

- `(.)` - intercepts routes at the same level
- `(..)` - intercepts routes one level up
- `(..)(..)` - intercepts routes two levels up
- `(...)` - intercepts routes from the root

### File Structure

## File Structure

The route interception creates the following structure:

```
src/app/
├── layout.tsx                        # Root layout (accepts modal slot)
├── page.tsx                          # Root page with map
├── auth/
│   └── signin/
│       └── page.tsx                  # Full page sign-in (direct access)
└── @modal/                           # Parallel route slot for modals
    ├── default.tsx                   # Returns null when no modal active
    └── (.)auth/                      # Intercepts /auth/* routes
        └── signin/
            └── page.tsx              # Modal version of sign-in
```

### Key Files Explained

1. **`layout.tsx`** - Updated to accept the `modal` prop from the parallel route
2. **`@modal/default.tsx`** - Returns `null` when no modal should be shown
3. **`@modal/(.)auth/signin/page.tsx`** - Intercepts `/auth/signin` and shows dialog
4. **`auth/signin/page.tsx`** - Original full-page version (for direct access/refresh)

## User Experience

### From Home Page (Soft Navigation)

When navigating from the home page:

1. User clicks "Sign In" button
2. URL changes to `/auth/signin`
3. **Intercepted route** triggers
4. Sign-in form opens in a dialog over the map
5. User can close dialog to return to map
6. Closing dialog navigates back using `router.back()`

**Benefits:**

- Context preserved (map stays visible in background)
- Faster perceived performance
- Better mobile UX
- No full page reload

### Direct Navigation (Hard Reload)

When accessing `/auth/signin` directly:

1. User types URL or refreshes page
2. **Standard route** loads
3. Full-page sign-in form displayed
4. Traditional page layout

**Benefits:**

- Accessible via direct URL
- Works with browser refresh
- Shareable authentication link
- Fallback for edge cases

## Implementation Details

### Intercepting Route: `(.)auth/signin/page.tsx`

```typescript
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export default function InterceptedSignInPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      router.back(); // Navigate back when dialog closes
    }
  }, [isOpen, router]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        {/* Sign-in form content */}
      </DialogContent>
    </Dialog>
  );
}
```

**Key Features:**

- Client component (`"use client"`)
- Managed dialog state
- Automatic navigation on close
- Same authentication logic as full page

### Standard Route: `auth/signin/page.tsx`

```typescript
export default function SignInPage() {
  return (
    <div className="min-h-screen">
      {/* Full-page sign-in form */}
    </div>
  );
}
```

**Key Features:**

- Can be client or server component
- Full-page layout
- Standalone authentication page
- Works with direct navigation

## Dialog Features

### Layout

- **Max Width:** `sm:max-w-[500px]` - Optimal reading width
- **Max Height:** `max-h-[90vh]` - Prevents overflow on small screens
- **Overflow:** `overflow-y-auto` - Scrollable content
- **Responsive:** Adapts to mobile and desktop

### Content

Both tabs (Sign In & Register) include:

✅ Email/password form
✅ Google OAuth button
✅ Facebook OAuth button
✅ Error handling
✅ Loading states
✅ Form validation

### Accessibility

- **Screen Reader Support:** Hidden title and description
- **Keyboard Navigation:** Tab through forms
- **ESC to Close:** Native dialog behavior
- **Focus Management:** Auto-focus on open

## Navigation Patterns

### Soft Navigation (Intercepted)

```typescript
// From home page or client component
<Link href="/auth/signin">Sign In</Link>

// Results in dialog opening
```

### Hard Navigation (Direct)

```typescript
// Page refresh
window.location.href = "/auth/signin";

// Direct URL access
https://yourdomain.com/auth/signin

// Results in full page
```

## Testing

### Test Interception

1. **Start from home page:**

   ```
   http://localhost:3000
   ```

2. **Click "Sign In" button**
   - ✅ Dialog should open
   - ✅ URL should change to `/auth/signin`
   - ✅ Map should remain visible behind dialog

3. **Close dialog:**
   - Click X button or click outside
   - ✅ Should navigate back to `/`
   - ✅ Map should be interactive again

### Test Direct Navigation

1. **Type URL directly:**

   ```
   http://localhost:3000/auth/signin
   ```

   - ✅ Should show full-page sign-in
   - ✅ No dialog overlay
   - ✅ Standard page layout

2. **Refresh page while on `/auth/signin`:**
   - Press F5 or Ctrl+R
   - ✅ Should reload full-page version
   - ✅ Not the intercepted dialog

## Common Issues & Solutions

### Issue: Dialog doesn't open from home page

**Cause:** Folder naming incorrect

**Solution:** Ensure folder is named `(.)auth` not `.auth` or `auth`

### Issue: Dialog opens on direct navigation

**Cause:** Both routes exist but priority is wrong

**Solution:** This is expected! Direct navigation should skip interception. If it doesn't, check if you have conflicting route groups.

### Issue: Dialog closes but doesn't navigate back

**Cause:** `router.back()` not being called

**Solution:** Check the `useEffect` hook:

```typescript
useEffect(() => {
  if (!isOpen) {
    router.back();
  }
}, [isOpen, router]);
```

### Issue: Form submission doesn't redirect

**Cause:** Server actions redirect but dialog is still managed

**Solution:** Server actions should handle redirect:

```typescript
await signIn("credentials", {
  email,
  password,
  redirectTo: "/", // This will close dialog and redirect
});
```

## Customization

### Change Dialog Size

```typescript
<DialogContent className="sm:max-w-[600px]"> // Wider
<DialogContent className="sm:max-w-[400px]"> // Narrower
```

### Disable Interception

To always use full-page mode:

1. Delete `(.)auth` folder
2. All navigation will use standard `/auth/signin` route

### Add More Intercepted Routes

For other routes (e.g., profile edit):

```
src/app/
├── (.)user/
│   └── edit/
│       └── page.tsx
```

## Best Practices

### ✅ Do

- Use interception for quick actions (sign-in, edit profile)
- Keep dialog content focused and concise
- Always provide standard route fallback
- Test both navigation patterns
- Handle loading and error states

### ❌ Don't

- Intercept complex multi-step flows
- Nest dialogs within dialogs
- Remove standard route (always keep fallback)
- Force users into modal-only experience
- Intercept routes with critical data

## Browser Support

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers
- ⚠️ Requires JavaScript enabled

## Performance

### Benefits

- **Faster perceived load:** No full page reload
- **Preserved scroll position:** Map stays in place
- **Reduced bandwidth:** Only dialog content loads
- **Better mobile UX:** Less jarring transition

### Considerations

- Both route files are bundled
- Slight increase in bundle size (~10-20KB)
- Minimal performance impact

## Related Documentation

- [Next.js Intercepting Routes](https://nextjs.org/docs/app/building-your-application/routing/intercepting-routes)
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog)
- [NextAuth.js](https://next-auth.js.org/)

## Examples

### Example 1: Protected Route Redirect

When user tries to access `/user` without auth:

```typescript
// In middleware or page
if (!session) {
  redirect("/auth/signin?callbackUrl=/user");
}

// Opens dialog with callback
// After sign-in, redirects to /user
```

### Example 2: Custom Callback

```typescript
<Link href="/auth/signin?callbackUrl=/moderator">
  Sign in to moderate
</Link>

// Dialog opens
// After auth, redirects to /moderator
```

### Example 3: Programmatic Navigation

```typescript
"use client";
import { useRouter } from "next/navigation";

export function MyComponent() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/auth/signin"); // Opens dialog
  };

  return <button onClick={handleClick}>Sign In</button>;
}
```

## Summary

Route interception provides a modern, seamless authentication experience:

- 🎯 **Better UX:** Modal dialogs instead of page navigation
- 🚀 **Faster:** No full page reloads
- 📱 **Mobile-friendly:** Less disruptive on small screens
- ♿ **Accessible:** Still works with direct URLs
- 🔄 **Flexible:** Automatic fallback to full page

Your users will appreciate the smooth, app-like experience while maintaining the reliability of traditional web navigation!
