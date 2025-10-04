# Facebook OAuth Setup Guide

## Overview

Facebook login has been integrated into the authentication system alongside Google OAuth and credentials-based login. Users can now sign in or register using their Facebook account.

## Setup Steps

### 1. Create a Facebook App

1. **Go to Facebook Developers:**
   - Visit https://developers.facebook.com/
   - Log in with your Facebook account

2. **Create a New App:**
   - Click "Create App"
   - Choose "Consumer" as the app type (for general user authentication)
   - Fill in the app details:
     - App Name: "HackYeah 2025"
     - App Contact Email: your email
     - Click "Create App"

### 2. Configure Facebook Login

1. **Add Facebook Login Product:**
   - In the left sidebar, click "+ Add Product"
   - Find "Facebook Login" and click "Set Up"

2. **Configure Settings:**
   - Go to "Facebook Login" → "Settings" in the left sidebar
   - Add the following URLs:

   **Valid OAuth Redirect URIs:**
   ```
   http://localhost:3000/api/auth/callback/facebook
   ```

   For production, add:
   ```
   https://yourdomain.com/api/auth/callback/facebook
   ```

3. **Save Changes**

### 3. Get Your App Credentials

1. **Go to Settings → Basic:**
   - Find your **App ID** (this is your `FACEBOOK_CLIENT_ID`)
   - Find your **App Secret** (this is your `FACEBOOK_CLIENT_SECRET`)
   - Click "Show" next to App Secret to reveal it

2. **Add to .env file:**
   ```bash
   FACEBOOK_CLIENT_ID=your_facebook_app_id
   FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
   ```

### 4. Configure App Domains

1. **In Settings → Basic:**
   - Add your domain to "App Domains":
     - For development: `localhost`
     - For production: `yourdomain.com`

2. **Add Privacy Policy URL:**
   - Required before you can make the app public
   - Example: `https://yourdomain.com/privacy`

3. **Add Terms of Service URL** (optional but recommended):
   - Example: `https://yourdomain.com/terms`

### 5. Set App Mode

1. **Development Mode (for testing):**
   - Your app starts in Development Mode
   - Only you and other developers/testers can use it
   - Perfect for local development

2. **Live Mode (for production):**
   - Switch to "Live" in the top app switcher
   - Requires:
     - Privacy Policy URL
     - App Icon
     - Category
     - Business verification (for some permissions)

## Environment Variables

Add these to your `.env` file:

```bash
# Facebook OAuth Configuration
FACEBOOK_CLIENT_ID=your_facebook_app_id_here
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret_here
```

## Implementation Details

### Authentication Configuration

The Facebook provider is configured in `src/auth.ts`:

```typescript
import FacebookProvider from "next-auth/providers/facebook";

export const authConfig: NextAuthConfig = {
  providers: [
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    // ... other providers
  ],
};
```

### Server Action

The Facebook sign-in action is in `src/app/actions/auth.ts`:

```typescript
export async function handleFacebookSignIn() {
  await signIn("facebook", { redirectTo: "/" });
}
```

### UI Components

Facebook login buttons are in `src/app/auth/signin/page.tsx`:

**Sign In Tab:**
- Facebook button after Google button
- Blue Facebook logo (#1877F2)
- Text: "Sign in with Facebook"

**Register Tab:**
- Facebook button after Google button
- Same styling and branding
- Text: "Sign up with Facebook"

## User Data

Facebook provides the following user data by default:
- Name
- Email (if granted permission)
- Profile Picture

This data is automatically stored in MongoDB via the NextAuth MongoDB adapter.

## Testing

### Local Testing

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to sign-in page:**
   ```
   http://localhost:3000/auth/signin
   ```

3. **Click "Sign in with Facebook":**
   - You'll be redirected to Facebook
   - Approve the permissions
   - You'll be redirected back to your app

### Test Users

For development mode testing without using real Facebook accounts:

1. **Create Test Users:**
   - Go to "Roles" in the left sidebar
   - Click "Test Users"
   - Click "Add" to create test users
   - Use these credentials for testing

## Permissions

### Default Permissions
- `public_profile` - User's public profile information
- `email` - User's email address

### Adding More Permissions

If you need additional data (birthday, location, etc.):

1. **Update the provider configuration:**
   ```typescript
   FacebookProvider({
     clientId: process.env.FACEBOOK_CLIENT_ID!,
     clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
     authorization: {
       params: {
         scope: 'email public_profile user_birthday user_location'
       }
     }
   })
   ```

2. **Submit for App Review:**
   - Some permissions require Facebook's approval
   - Go to "App Review" → "Permissions and Features"
   - Request the permissions you need

## Troubleshooting

### "URL Blocked: This redirect failed"

**Problem:** The redirect URI doesn't match what's configured in Facebook.

**Solution:**
- Check that `http://localhost:3000/api/auth/callback/facebook` is in "Valid OAuth Redirect URIs"
- Make sure there are no trailing slashes
- Verify your `NEXTAUTH_URL` environment variable matches

### "App Not Set Up"

**Problem:** Facebook Login product not properly configured.

**Solution:**
- Ensure Facebook Login is added as a product
- Check that OAuth Redirect URIs are saved
- Try restarting your development server

### "Invalid Client Secret"

**Problem:** The Facebook App Secret is incorrect.

**Solution:**
- Verify `FACEBOOK_CLIENT_SECRET` in your `.env` file
- Make sure you copied the full secret
- Check for extra spaces or newlines

### "This App is in Development Mode"

**Problem:** Trying to use the app with a non-test user in development mode.

**Solution:**
- Add the user as a test user, developer, or admin
- OR switch your app to Live mode (requires privacy policy, etc.)

### Email Not Returned

**Problem:** Facebook user's email is not being saved.

**Solution:**
- User may have signed up without an email
- User may have denied email permission
- Ensure `email` scope is requested

## Security Best Practices

1. **Keep App Secret Secret:**
   - Never commit `.env` file to version control
   - Use environment variables in production
   - Rotate secrets if compromised

2. **Use HTTPS in Production:**
   - Facebook requires HTTPS for production redirect URIs
   - Configure SSL certificate for your domain

3. **Validate Redirect URIs:**
   - Only add trusted redirect URIs
   - Use exact matches, not wildcards

4. **Monitor App Access:**
   - Review "Roles" regularly
   - Remove unused test users
   - Check app insights for unusual activity

## Production Checklist

Before going live:

- [ ] Privacy Policy URL added
- [ ] Terms of Service URL added
- [ ] App icon uploaded
- [ ] App category selected
- [ ] Business verification completed (if required)
- [ ] All redirect URIs use HTTPS
- [ ] App switched to "Live" mode
- [ ] Test login flow on production domain
- [ ] Monitor error logs

## Support

- **Facebook for Developers:** https://developers.facebook.com/support/
- **NextAuth.js Facebook Provider:** https://next-auth.js.org/providers/facebook
- **Facebook Login Documentation:** https://developers.facebook.com/docs/facebook-login/

## Related Files

- `src/auth.ts` - NextAuth configuration with Facebook provider
- `src/app/actions/auth.ts` - Server action for Facebook sign-in
- `src/app/auth/signin/page.tsx` - Sign-in page with Facebook button
- `.env.example` - Environment variable template
