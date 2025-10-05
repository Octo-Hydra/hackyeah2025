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

    const cookieHeader = request.headers.get("cookie");
    let session = null;

    if (cookieHeader) {
      const cookies = cookieHeader.split(";").reduce(
        (acc, cookie) => {
          if (!cookie.trim()) return acc;
          const [key, ...rest] = cookie.trim().split("=");
          const value = rest.join("=");
          acc[key] = value;
          return acc;
        },
        {} as Record<string, string>,
      );

      console.log("🍪 Available cookies:", Object.keys(cookies));

      const cookieNames = [
        "__Secure-authjs.session-token",
        "authjs.session-token",
        "__Host-authjs.session-token",
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
      ];

      let sessionToken: string | undefined;
      let cookieName: string | undefined;

      for (const name of cookieNames) {
        if (cookies[name]) {
          sessionToken = decodeURIComponent(cookies[name]);
          cookieName = name;
          break;
        }
      }

      console.log("🔑 Session token found:", sessionToken ? "YES" : "NO");
      console.log("🔑 Cookie name:", cookieName);

      if (sessionToken && cookieName) {
        const secretRaw =
          process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
        if (!secretRaw) {
          console.error("❌ No AUTH_SECRET or NEXTAUTH_SECRET found!");
        } else {
          const secretCandidates = [secretRaw];

          const saltCandidates = Array.from(
            new Set(
              [
                cookieName,
                cookieName.replace(/^__Secure-/i, ""),
                cookieName.replace(/^__Host-/i, ""),
                "authjs.session-token",
                "next-auth.session-token",
              ].filter(Boolean),
            ),
          );

          console.log("🔐 Trying salts:", saltCandidates);
          console.log(
            "🔐 Secret candidates:",
            secretCandidates.map((candidate) => `string(${candidate.length})`),
          );
          console.log(
            "🔐 Token prefix:",
            sessionToken.substring(0, 40) +
              (sessionToken.length > 40 ? "..." : ""),
          );

          let decoded = null;
          for (const currentSalt of saltCandidates) {
            for (const currentSecret of secretCandidates) {
              try {
                decoded = await decode({
                  token: sessionToken,
                  secret: currentSecret,
                  salt: currentSalt,
                });
                if (decoded) {
                  console.log("✅ Session token decoded", {
                    salt: currentSalt,
                    secretType: "string",
                  });
                  break;
                }
              } catch (error) {
                console.warn("❌ Decode attempt failed", {
                  salt: currentSalt,
                  secretType: "string",
                  error,
                });
              }
            }
            if (decoded) break;
          }

          if (decoded) {
            session = {
              user: {
                email: decoded.email as string,
                name: decoded.name as string,
                image: decoded.picture as string,
                role: (decoded.role as string) || "USER",
                id: (decoded.id as string) || undefined,
              },
              expires: decoded.exp
                ? new Date((decoded.exp as number) * 1000).toISOString()
                : undefined,
            };
          } else {
            console.warn(
              "⚠️ All decode attempts failed – user considered unauthenticated",
            );
          }
        }
      }
    }

    if (!session) {
      console.warn("⚠️ No valid session resolved from cookies");
    }

    const db = await DB();

    let user = undefined;
    if (session?.user?.id && session.user.role) {
      user = {
        id: session.user.id,
        role: session.user.role,
      };
      console.log("👤 User context set from session payload:", user);
    } else if (session?.user?.email) {
      const userDoc = await db.collection("users").findOne({
        email: session.user.email,
      });
      if (userDoc) {
        user = {
          id: userDoc._id.toString(),
          role: userDoc.role || "USER",
        };
        console.log("👤 User context set from DB:", user);
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
