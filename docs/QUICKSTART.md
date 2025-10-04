# NextAuth.js Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Create `.env` file

```bash
cp .env.example .env
```

Then edit `.env` and set these required variables:

```env
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-generated-secret-here

# Your MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/hackyeah2025

# Optional: For Google login
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Start MongoDB (if using local)

```bash
# Using Docker (recommended)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally
# See: https://www.mongodb.com/docs/manual/installation/
```

### 3. Run the development server

```bash
npm run dev
```

### 4. Test the authentication

1. Open http://localhost:3000/auth/signin
2. Register a new account
3. Try logging in with your credentials
4. Visit http://localhost:3000/dashboard (protected page)

## 📝 Example Usage

### Get session in server component

```tsx
import { auth } from "@/auth";

export default async function Page() {
  const session = await auth();
  return <div>Hello {session?.user?.name}</div>;
}
```

### Get session in client component

```tsx
"use client";
import { useSession } from "next-auth/react";

export default function Component() {
  const { data: session } = useSession();
  return <div>Hello {session?.user?.name}</div>;
}
```

### Sign out

```tsx
import { signOut } from "@/auth";

<form
  action={async () => {
    "use server";
    await signOut();
  }}
>
  <button type="submit">Sign Out</button>
</form>;
```

## 📚 Full Documentation

See [NEXTAUTH_SETUP.md](./NEXTAUTH_SETUP.md) for complete documentation.
