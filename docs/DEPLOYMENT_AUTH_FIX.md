# 🔒 Production Authentication Error Fix

## Problem

```
❌ Error decoding session token: Error: no matching decryption secret
   Cookie name: __Secure-authjs.session-token
   Salt used: next-auth.session-token
   Token preview: eyJhbGciOiJkaXIiLCJl...
```

## Root Cause Analysis

### Issue 1: Salt Mismatch

- **Production cookie**: `__Secure-authjs.session-token`
- **Old salt used**: `next-auth.session-token` ❌
- **Correct salt**: `authjs.session-token` ✅

The code was not stripping the `__Secure-` prefix when determining the salt, causing NextAuth's `decode()` function to fail.

### Issue 2: Environment Variable Configuration

NextAuth v5 requires **both** `AUTH_SECRET` and `NEXTAUTH_SECRET` to be set to the **same value** in production:

1. **NextAuth v5** internally uses `AUTH_SECRET`
2. **Your app** references `NEXTAUTH_SECRET` in some places
3. **Deployment platform** must have both variables set identically

## Solution Applied

### Code Changes

Updated `server.ts` to:

1. ✅ Strip `__Secure-` prefix from cookie name before using as salt
2. ✅ Try `AUTH_SECRET` first, fallback to `NEXTAUTH_SECRET`
3. ✅ Add explicit check for missing secret with proper error handling
4. ✅ Use base cookie name (without prefix) as salt

```typescript
// Before (WRONG):
const salt = cookieName?.includes("authjs")
  ? "authjs.session-token"
  : "next-auth.session-token";

// After (CORRECT):
const baseCookieName =
  cookieName?.replace(/^__Secure-/, "") || "authjs.session-token";
const salt = baseCookieName;
```

## Deployment Configuration Required

### Step 1: Set Environment Variables

In your deployment platform (Vercel/Railway/Docker/etc.), set:

```bash
# Primary secret (NextAuth v5 uses this)
AUTH_SECRET=your-secret-here

# Backward compatibility (your app references this)
NEXTAUTH_SECRET=your-secret-here

# CRITICAL: Both must have the SAME VALUE!
```

### Step 2: Generate a Strong Secret

If you don't have a secret yet:

```bash
# Generate 32-byte random secret
openssl rand -base64 32
```

Or use:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 3: Verify Other Required Variables

Ensure these are also set in production:

```bash
NEXTAUTH_URL=https://your-domain.com
MONGODB_URI=mongodb+srv://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
```

## Platform-Specific Instructions

### Vercel

1. Go to Project Settings → Environment Variables
2. Add both `AUTH_SECRET` and `NEXTAUTH_SECRET` with same value
3. Make sure `NEXTAUTH_URL` matches your production domain
4. Redeploy

### Railway

1. Go to Variables tab
2. Add both secrets with same value
3. Railway will auto-redeploy

### Docker/Docker Compose

Update `docker-compose.yml` or `.env` file:

```yaml
services:
  app:
    environment:
      - AUTH_SECRET=${AUTH_SECRET}
      - NEXTAUTH_SECRET=${AUTH_SECRET} # Same value
      - NEXTAUTH_URL=https://your-domain.com
```

## Testing the Fix

### 1. Check Logs After Deployment

You should see:

```
🔐 NEXTAUTH_SECRET exists: true
🔐 AUTH_SECRET exists: true
🔐 Secrets match: true
🔐 Cookie name: __Secure-authjs.session-token
🔐 Using salt: authjs.session-token
✅ Session decoded successfully: { email: 'user@example.com', ... }
```

### 2. Test Authentication Flow

1. Sign out completely
2. Clear browser cookies
3. Sign in again
4. Navigate to `/admin` page
5. Verify no "Authentication required" errors

### 3. Verify GraphQL Context

Check that authenticated requests show:

```
📡 Context called for HTTP request
🍪 Available cookies: [ '__Secure-authjs.session-token' ]
🔑 Session token found: YES
✅ Session decoded successfully
```

## Common Pitfalls

### ❌ Using Different Secrets

```bash
AUTH_SECRET=abc123
NEXTAUTH_SECRET=xyz789  # WRONG: Different value!
```

### ❌ Missing AUTH_SECRET

```bash
NEXTAUTH_SECRET=abc123  # Only one set
```

### ❌ Wrong NEXTAUTH_URL

```bash
NEXTAUTH_URL=http://localhost:3000  # WRONG: Must match production domain
```

### ❌ HTTP Instead of HTTPS

Production must use HTTPS for `__Secure-` cookies to work. If using HTTP (not recommended), cookies will be named differently.

## Verification Checklist

- [ ] Both `AUTH_SECRET` and `NEXTAUTH_SECRET` set in production
- [ ] Both secrets have the **exact same value**
- [ ] `NEXTAUTH_URL` matches production domain with HTTPS
- [ ] Code changes deployed (salt fix in `server.ts`)
- [ ] Tested sign in → sign out → sign in again
- [ ] Admin page accessible after authentication
- [ ] No "no matching decryption secret" errors in logs

## Why This Happened

1. **Local vs Production Cookie Names**:
   - Local (HTTP): `authjs.session-token`
   - Production (HTTPS): `__Secure-authjs.session-token`

2. **Salt Determination Logic**:
   - Code was using full cookie name (with prefix) to determine salt
   - NextAuth expects base name without `__Secure-` prefix

3. **NextAuth v5 Migration**:
   - NextAuth v5 changed from `NEXTAUTH_SECRET` to `AUTH_SECRET`
   - Backward compatibility requires both to be set

## Additional Resources

- [NextAuth.js v5 Migration Guide](https://authjs.dev/guides/upgrade-to-v5)
- [NextAuth.js Deployment](https://authjs.dev/getting-started/deployment)
- [Secure Cookies Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies)

## Support

If you still see errors after applying this fix:

1. Check exact error message in production logs
2. Verify all environment variables are set correctly
3. Try clearing all cookies and signing in again
4. Check that HTTPS is properly configured
