# NextAuth.js Setup Documentation

This project has been configured with NextAuth.js v5 (beta) with the following features:

- ✅ Credentials-based authentication (email/password)
- ✅ Google OAuth provider
- ✅ Facebook OAuth provider
- ✅ MongoDB adapter for session and user management
- ✅ Password hashing with bcryptjs
- ✅ Protected routes with server-side session checks

## 📦 Installed Packages

```bash
npm install next-auth@beta @auth/mongodb-adapter mongodb bcryptjs
npm install -D @types/bcryptjs
```

## 🗂️ File Structure

```
src/
├── auth.ts                          # NextAuth configuration
├── middleware.ts                    # Route protection middleware
├── types/
│   └── next-auth.d.ts              # TypeScript type definitions
├── lib/
│   ├── mongodb.ts                  # MongoDB client connection
│   └── auth-utils.ts               # User registration utilities
├── app/
│   ├── actions/
│   │   └── auth.ts                 # Server actions for authentication
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts        # NextAuth API route handlers
│   ├── auth/
│   │   └── signin/
│   │       └── page.tsx            # Sign-in/Register page
│   └── dashboard/
│       └── page.tsx                # Example protected page
```

## 🔧 Configuration Steps

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Generate a secret key with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/your-database-name
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Google OAuth credentials (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Generate NextAuth Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

### 3. Set Up MongoDB

#### Option A: Local MongoDB

```bash
# Install MongoDB locally or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### Option B: MongoDB Atlas (Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Add it to your `.env` file

### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Configure the OAuth consent screen if you haven't already
6. For application type, select "Web application"
7. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)
8. Copy the Client ID and Client Secret to your `.env` file

## 🚀 Usage

### Sign In/Register Page

Navigate to `/auth/signin` to access the authentication page. This page includes:

- Credentials sign-in form (email/password)
- User registration form
- Google OAuth button

### Protected Routes

The middleware is configured to protect all routes except:

- `/api/*` - API routes
- `/auth/*` - Authentication pages
- `/_next/*` - Next.js internal routes
- Static files

To modify protected routes, edit `src/middleware.ts`:

```typescript
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth).*)"],
};
```

### Using Authentication in Components

#### Server Components

```typescript
import { auth } from "@/auth";

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <div>Not authenticated</div>;
  }

  return <div>Hello {session.user?.name}</div>;
}
```

#### Client Components

```typescript
"use client";

import { useSession } from "next-auth/react";

export default function ClientComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Not authenticated</div>;
  }

  return <div>Hello {session.user?.name}</div>;
}
```

### Server Actions

```typescript
import { signIn, signOut } from "@/auth";

// Sign in with credentials
await signIn("credentials", {
  email: "user@example.com",
  password: "password",
  redirectTo: "/dashboard",
});

// Sign in with Google
await signIn("google", { redirectTo: "/dashboard" });

// Sign out
await signOut({ redirectTo: "/" });
```

### User Registration

Use the `registerUser` function from `src/lib/auth-utils.ts`:

```typescript
import { registerUser } from "@/lib/auth-utils";

const result = await registerUser({
  name: "John Doe",
  email: "john@example.com",
  password: "securepassword",
});
```

## 🗃️ Database Schema

The MongoDB adapter will automatically create the following collections:

### users

```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  password?: string,      // Only for credentials users
  emailVerified: Date | null,
  image: string | null,
  createdAt: Date,
  updatedAt: Date,
}
```

### accounts

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  type: string,
  provider: string,
  providerAccountId: string,
  refresh_token?: string,
  access_token?: string,
  expires_at?: number,
  token_type?: string,
  scope?: string,
  id_token?: string,
  session_state?: string,
}
```

### sessions

```typescript
{
  _id: ObjectId,
  sessionToken: string,
  userId: ObjectId,
  expires: Date,
}
```

### verificationTokens

```typescript
{
  _id: ObjectId,
  identifier: string,
  token: string,
  expires: Date,
}
```

## 🔒 Security Best Practices

1. **Never commit `.env` file** - Add it to `.gitignore`
2. **Use strong secrets** - Generate with `openssl rand -base64 32`
3. **Validate input** - The implementation uses Zod for validation
4. **Hash passwords** - Passwords are hashed with bcrypt (10 rounds)
5. **Use HTTPS in production** - Required for OAuth providers
6. **Implement rate limiting** - Consider adding rate limiting to auth endpoints
7. **Add email verification** - Implement email verification for credentials users

## 🎨 Customization

### Adding More Providers

Edit `src/auth.ts` and add more providers:

```typescript
import GitHub from "next-auth/providers/github";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      /* ... */
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    // Add more providers...
  ],
};
```

### Custom Sign-In Page

The sign-in page is located at `src/app/auth/signin/page.tsx`. Customize it to match your brand.

### Custom Callbacks

Edit the callbacks in `src/auth.ts`:

```typescript
callbacks: {
  async jwt({ token, user, account }) {
    // Add custom data to JWT
    return token;
  },
  async session({ session, token }) {
    // Add custom data to session
    return session;
  },
  async signIn({ user, account, profile }) {
    // Control who can sign in
    return true;
  },
},
```

## 🧪 Testing

### Test Credentials Login

1. Navigate to `/auth/signin`
2. Click on "Register" tab
3. Create an account
4. Sign in with your credentials

### Test Google Login

1. Navigate to `/auth/signin`
2. Click "Sign in with Google"
3. Complete the Google OAuth flow

### Test Protected Routes

1. Try to access `/dashboard` without being logged in
2. You should be redirected to `/auth/signin`
3. After logging in, you should be able to access `/dashboard`

## 📚 Additional Resources

- [NextAuth.js Documentation](https://authjs.dev/)
- [MongoDB Adapter Documentation](https://authjs.dev/reference/adapter/mongodb)
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Documentation](https://nextjs.org/docs)

## 🐛 Troubleshooting

### "Invalid credentials" error

- Check that the email and password are correct
- Verify the password is at least 6 characters
- Ensure the user exists in the database

### MongoDB connection error

- Verify `MONGODB_URI` is correct in `.env`
- Check MongoDB server is running
- For Atlas: Verify IP whitelist and credentials

### Google OAuth not working

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Check redirect URI is configured in Google Cloud Console
- Ensure `NEXTAUTH_URL` matches your domain

### Session not persisting

- Verify `NEXTAUTH_SECRET` is set
- Check cookies are enabled in browser
- For production: Ensure HTTPS is enabled
