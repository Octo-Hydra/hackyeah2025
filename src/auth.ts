import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Validation schema for credentials
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter(clientPromise),
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "email@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { email, password } = credentialsSchema.parse(credentials);
          const client = await clientPromise;
          const db = client.db();
          const user = await db.collection("users").findOne({ email });
          if (!user) {
            throw new Error("No user found with this email");
          }
          if (!user.password) {
            throw new Error(
              "Please sign in with the provider you used to create your account",
            );
          }
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            throw new Error("Invalid password");
          }
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async linkAccount({ user, account }) {
      // Log when accounts are linked
      console.log(
        `[Auth] Account linked: ${account.provider} for user ${user.email}`,
      );
    },
    async signIn({ user, account, isNewUser }) {
      console.log(
        `[Auth] Sign in: ${user.email} via ${account?.provider} (new user: ${isNewUser})`,
      );
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Handle account linking for users with same email
      if (account && account.provider !== "credentials" && user.email) {
        try {
          const client = await clientPromise;
          const db = client.db();

          // Check if user already exists with this email
          const existingUser = await db
            .collection("users")
            .findOne({ email: user.email });

          if (existingUser) {
            // Check if this account is already linked
            const existingAccount = await db.collection("accounts").findOne({
              userId: existingUser._id,
              provider: account.provider,
            });

            if (!existingAccount) {
              // Link new account to existing user
              console.log(
                `[Auth] Linking ${account.provider} account to existing user: ${user.email}`,
              );
              // The adapter will handle the linking
            }
          }
        } catch (error) {
          console.error("[Auth] Error during sign in:", error);
          // Allow sign in to continue even if linking check fails
        }
      }

      // Allow sign in
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Handle redirects securely
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      // Get user role from database
      if (token.email && !token.role) {
        try {
          const client = await clientPromise;
          const db = client.db();
          const dbUser = await db
            .collection("users")
            .findOne({ email: token.email });

          if (dbUser) {
            token.role = (dbUser.role as string) || "USER";
            token.id = dbUser._id.toString();
          }
        } catch (error) {
          console.error("[Auth] Error fetching user role:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Add custom fields to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        // Add role to session - extend user type
        const role = token.role as "USER" | "ADMIN" | undefined;
        session.user.role = role || "USER";
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
