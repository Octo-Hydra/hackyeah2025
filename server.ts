import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer } from "ws";
import { createYoga, createSchema } from "graphql-yoga";
import { useServer } from "graphql-ws/use/ws";
import { parse } from "url";
import next from "next";
import fs from "fs";
import path from "path";
import resolvers from "./src/backend/resolvers";
import { decode } from "next-auth/jwt";
import { startTrustScoreCron } from "./src/backend/cron/trust-score-cron.js";
import { DB } from "./src/backend/db/client.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ? "localhost" : "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// prepare nextjs
const app = next({ dev, hostname, port });

// match the route next would use if yoga was in `pages/api/graphql.ts`
const graphqlEndpoint = "/api/graphql";

// prepare yoga
// load SDL from file
const sdlPath = path.join(process.cwd(), "src", "backend", "schema.graphql");
const typeDefs = fs.readFileSync(sdlPath, "utf-8");

// resolvers imported from src/backend/resolvers

const yoga = createYoga({
  graphqlEndpoint,
  graphiql: {
    subscriptionsProtocol: "WS",
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: createSchema<any>({
    typeDefs: /* GraphQL */ `
      ${typeDefs}
    `,
    resolvers,
  }),
  context: async ({ request }) => {
    // WebSocket subscriptions don't have request object
    if (!request) {
      console.log("🔌 Context called for WebSocket (no request)");
      const db = await DB();
      return { db, user: null };
    }

    console.log("📡 Context called for HTTP request");
    // Get session from NextAuth JWT cookie
    const cookieHeader = request.headers.get("cookie");
    let session = null;

    if (cookieHeader) {
      // Parse NextAuth session token from cookie
      const cookies = cookieHeader.split(";").reduce(
        (acc, cookie) => {
          const [key, value] = cookie.trim().split("=");
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>,
      );

      console.log("🍪 Available cookies:", Object.keys(cookies));

      // Try different cookie names for NextAuth v5
      let sessionToken: string | undefined;
      let cookieName: string | undefined;

      const cookieNames = [
        "authjs.session-token",
        "__Secure-authjs.session-token",
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
      ];

      for (const name of cookieNames) {
        if (cookies[name]) {
          sessionToken = cookies[name];
          cookieName = name;
          break;
        }
      }

      console.log("🔑 Session token found:", sessionToken ? "YES" : "NO");
      console.log("🔑 Cookie name:", cookieName);

      if (sessionToken) {
        // Determine base name (without __Secure- prefix) for salt
        // Cookie can be: authjs.session-token, __Secure-authjs.session-token, etc.
        // Salt should match the base cookie name
        const baseCookieName =
          cookieName?.replace(/^__Secure-/, "") || "authjs.session-token";
        const salt = baseCookieName;

        // NextAuth v5 requires AUTH_SECRET (not NEXTAUTH_SECRET)
        // In production, ensure AUTH_SECRET is set to the same value as NEXTAUTH_SECRET
        console.log(
          " process.env.NEXTAUTH_SECRET",
          process.env.NEXTAUTH_SECRET,
        );
        console.log(" process.env.AUTH_SECRET", process.env.AUTH_SECRET);
        const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET!;

        if (!secret) {
          console.error("❌ No AUTH_SECRET or NEXTAUTH_SECRET found!");
          const db = await DB();
          return { user: null, db };
        }

        try {
          console.log("🔓 Attempting to decode token...");
          console.log(
            "🔐 NEXTAUTH_SECRET exists:",
            !!process.env.NEXTAUTH_SECRET,
          );
          console.log("🔐 AUTH_SECRET exists:", !!process.env.AUTH_SECRET);
          console.log(
            "🔐 AUTH_SECRET length:",
            process.env.AUTH_SECRET?.length,
          );
          console.log(
            "🔐 NEXTAUTH_SECRET length:",
            process.env.NEXTAUTH_SECRET?.length,
          );
          console.log(
            "🔐 Secrets match:",
            process.env.AUTH_SECRET === process.env.NEXTAUTH_SECRET,
          );
          console.log("🔐 Cookie name:", cookieName);
          console.log("🔐 Using salt:", salt);
          console.log("🔐 Using secret length:", secret.length);
          console.log(
            "🔐 Token type:",
            sessionToken.startsWith("ey") ? "JWE/JWT" : "Unknown",
          );
          console.log("🔐 Token starts with:", sessionToken.substring(0, 50));

          const decoded = await decode({
            token: sessionToken,
            secret: secret,
            salt: salt,
          });

          if (decoded) {
            session = {
              user: {
                email: decoded.email as string,
                name: decoded.name as string,
                image: decoded.picture as string,
                role: (decoded.role as string) || "USER", // Add role from token
              },
              expires: new Date((decoded.exp as number) * 1000).toISOString(),
            };
            console.log("✅ Session decoded successfully:", {
              email: decoded.email,
              name: decoded.name,
              role: decoded.role,
            });
          } else {
            console.warn("⚠️ Token decoded but no user data found");
          }
        } catch (error) {
          console.error("❌ Error decoding session token:", error);
          console.error("   Cookie name:", cookieName);
          console.error("   Salt used:", salt);
          console.error(
            "   Token preview:",
            sessionToken?.substring(0, 20) + "...",
          );

          // Try alternative decoding
          try {
            const altSalt = cookieName?.includes("authjs")
              ? "next-auth.session-token"
              : "authjs.session-token";
            console.log("🔄 Trying alternative salt:", altSalt);

            const altDecoded = await decode({
              token: sessionToken,
              secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET!,
              salt: altSalt,
            });

            if (altDecoded) {
              console.log("✅ Alternative decoding successful!");
              session = {
                user: {
                  email: altDecoded.email as string,
                  name: altDecoded.name as string,
                  image: altDecoded.picture as string,
                  role: (altDecoded.role as string) || "USER",
                },
                expires: new Date(
                  (altDecoded.exp as number) * 1000,
                ).toISOString(),
              };
            }
          } catch (altError) {
            console.error("❌ Alternative decoding also failed:", altError);
            console.warn(
              "⚠️ Token cannot be decrypted. User may need to log in again.",
            );
            console.warn(
              "💡 This usually happens when AUTH_SECRET was changed after token creation.",
            );
          }
        }
      } else {
        console.log("⚠️ No session token found in cookies");
      }
    }

    // Get database connection
    const db = await DB();

    // Fetch user with role from database if session exists
    let user = undefined;
    if (session?.user?.email) {
      const userDoc = await db.collection("users").findOne({
        email: session.user.email,
      });
      if (userDoc) {
        user = {
          id: userDoc._id.toString(),
          role: userDoc.role || "USER",
        };
        console.log("👤 User context set:", { id: user.id, role: user.role });
      }
    }

    return {
      db,
      session,
      user,
      request,
    };
  },
});

(async () => {
  if (!process.env.RUN_CRON || process.env.RUN_CRON !== "true") {
    await app.prepare();
    const handle = app.getRequestHandler();

    // create http server
    const server = createServer(
      async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const url = parse(req.url ?? "", true);
          if (url.pathname?.startsWith(graphqlEndpoint)) {
            await yoga(req, res);
          } else {
            await handle(req, res, url);
          }
        } catch (err) {
          console.error(`Error while handling ${req.url}`, err);
          res.writeHead(500).end();
        }
      },
    );

    // create websocket server
    const wsServer = new WebSocketServer({ server, path: graphqlEndpoint });
    type Enveloped = ReturnType<typeof yoga.getEnveloped>;
    type YogaExecute = Enveloped["execute"];
    type YogaSubscribe = Enveloped["subscribe"];
    // prepare graphql-ws
    useServer(
      {
        execute: (args) =>
          (args.rootValue as { execute: YogaExecute }).execute(args),
        subscribe: (args) =>
          (args.rootValue as { subscribe: YogaSubscribe }).subscribe(args),
        onSubscribe: async (ctx, _id, params) => {
          console.log("🔌 WebSocket onSubscribe called");
          console.log("🔌 Connection params:", ctx.connectionParams);
          console.log("🔌 Extra request:", ctx.extra.request);

          const {
            schema,
            execute,
            subscribe,
            contextFactory,
            parse: parseGql,
            validate,
          } = yoga.getEnveloped({
            ...ctx,
            req: ctx.extra.request,
            socket: ctx.extra.socket,
            params,
          });

          const args = {
            schema,
            operationName: params.operationName,
            document: parseGql(params.query),
            variableValues: params.variables,
            contextValue: await contextFactory(),
            rootValue: {
              execute,
              subscribe,
            },
          };

          const errors = validate(args.schema, args.document);
          if (errors.length) return errors;
          return args;
        },
      },
      wsServer,
    );

    await new Promise<void>((resolve, reject) =>
      server.listen(port, (err?: Error) => (err ? reject(err) : resolve())),
    );

    console.log(`
  > App started!
    HTTP server running on http://${hostname}:${port}
    GraphQL WebSocket server running on ws://${hostname}:${port}${graphqlEndpoint}
  `);
  } else {
    await startTrustScoreCron();
  }
  // Start trust score cron job if enabled
})();
