import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { z } from "zod";

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  return "http://localhost:3000";
};

const BASE_URL = getBaseUrl();

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
  pages: {
    signIn: "/auth/signin",
    // signOut: "/auth/signout",
    // error: "/auth/error",
    // verifyRequest: "/auth/verify-request",
    // newUser: "/auth/new-user",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    redirect({ url, baseUrl }) {
      const actualBaseUrl = baseUrl || BASE_URL;
      if (url.startsWith("/")) {
        return `${actualBaseUrl}${url}`;
      }
      try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(actualBaseUrl);
        if (urlObj.origin === baseUrlObj.origin) {
          return url;
        }
        if (
          process.env.NODE_ENV === "development" &&
          (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1")
        ) {
          return url;
        }
      } catch (e) {
        console.error("Error parsing redirect URL:", e);
      }
      return actualBaseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
