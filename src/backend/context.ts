import type { YogaInitialContext } from "graphql-yoga";
import type { Collection, Db } from "mongodb";
import type { UserModel } from "./types/UserModel";
import { getMongoDb, getMongoClient } from "./lib/db";
import type { Session } from "next-auth";
import type { IncomingMessage, ServerResponse } from "http";
import { ObjectId } from "mongodb";

export type GraphQLContext = YogaInitialContext & {
  params: Promise<Record<string, string>>;
  UserCollection: Collection<UserModel>;
  db: Db;
  session: Session | null;
  req?: IncomingMessage;
  res?: ServerResponse;
};

let dbPromise: ReturnType<typeof getMongoDb> | null = null;

const resolveDb = () => {
  if (!dbPromise) {
    dbPromise = getMongoDb();
  }
  return dbPromise;
};

/**
 * Get session from NextAuth (JWT strategy)
 * Uses NextAuth's getToken helper which properly handles JWT decryption
 */
async function getSessionFromRequest(request: Request): Promise<Session | null> {
  try {
    // Debug: Check what cookies we have
    const cookieHeader = request.headers.get('cookie');
    console.log('🍪 Cookie header:', cookieHeader ? 'Present' : 'Missing');
    
    // Check if AUTH_SECRET is set
    const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!authSecret) {
      console.error('❌ AUTH_SECRET or NEXTAUTH_SECRET environment variable is not set');
      return null;
    }

    // Use NextAuth's getToken helper which handles all the JWT decryption
    const { getToken } = await import('next-auth/jwt');
    
    // Determine cookie name based on HTTPS usage, not just NODE_ENV
    // __Secure- prefix only works over HTTPS
    const isSecure = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;
    const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    
    console.log('🔍 Looking for cookie:', cookieName, '(secure:', isSecure + ')');
    
    const token = await getToken({
      req: { headers: request.headers },
      secret: authSecret,
      secureCookie: isSecure,
      cookieName: cookieName,
    });
    
    console.log('🎟️ Token decoded:', token ? 'Success' : 'Failed', token ? `(email: ${token.email})` : '');
    
    if (!token || !token.email) {
      return null;
    }
    
    // Construct session from decoded token
    const session = {
      user: {
        id: token.id as string || token.sub as string,
        name: token.name as string || null,
        email: token.email as string,
        image: token.picture as string || null,
        twoFactorEnabled: token.twoFactorEnabled as boolean || false,
      },
      expires: token.exp ? new Date(token.exp * 1000).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    console.log('✅ Session constructed for user:', session.user.email);
    return session;
  } catch (error) {
    console.error('❌ Error getting session from JWT:', error);
    // Silent fail - session will be null for unauthenticated requests
    return null;
  }
}

export const context = async (ctx: YogaInitialContext & { 
  req?: IncomingMessage; 
  res?: ServerResponse;
}) => {
  const db = await resolveDb();
  
  // Try to get session from JWT token in cookies
  let session: Session | null = null;
  
  if (ctx.request) {
    session = await getSessionFromRequest(ctx.request);
  }
  console.log("GraphQL Context Session:", session);
  return {
    ...ctx,
    UserCollection: db.collection("Users"),
    db,
    session,
  };
};