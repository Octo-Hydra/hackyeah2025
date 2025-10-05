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
import { Db } from "mongodb";

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
  schema: createSchema<{
    db: Db;
    session: {
      user: { email: string; name: string; image: string; role: string };
      expires: string;
    } | null;
    request: Request;
  }>({
    typeDefs: /* GraphQL */ `
      ${typeDefs}
    `,
    resolvers,
  }),
  context: async ({ request }) => {
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

      const sessionToken =
        cookies["authjs.session-token"] ||
        cookies["__Secure-authjs.session-token"] ||
        cookies["next-auth.session-token"] ||
        cookies["__Secure-next-auth.session-token"];

      console.log("🔑 Session token found:", sessionToken ? "YES" : "NO");

      if (sessionToken) {
        try {
          console.log("🔓 Attempting to decode token...");
          console.log(
            "🔐 NEXTAUTH_SECRET exists:",
            !!process.env.NEXTAUTH_SECRET,
          );

          const decoded = await decode({
            token: sessionToken,
            secret: process.env.NEXTAUTH_SECRET!,
            salt: "authjs.session-token",
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
          }
        } catch (error) {
          console.error("❌ Error decoding session token:", error);
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
