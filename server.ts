import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer } from "ws";
import { createYoga, createSchema, YogaInitialContext } from "graphql-yoga";
import { useServer } from "graphql-ws/use/ws";
import { parse } from "url";
import next from "next";
import { setTimeout as setTimeout$ } from "timers/promises";

const dev = process.env.NODE_ENV !== "production";
const hostname = dev ?"localhost" : "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// prepare nextjs
const app = next({ dev, hostname, port });

// match the route next would use if yoga was in `pages/api/graphql.ts`
const graphqlEndpoint = "/api/graphql";

// prepare yoga
const yoga = createYoga({
  graphqlEndpoint,
  graphiql: {
    subscriptionsProtocol: "WS",
  },
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        hello: String!
      }
      type Subscription {
        clock: String!
      }
    `,
    resolvers: {
      Query: {
        hello: () => "world",
      },
      Subscription: {
        clock: {
          async *subscribe() {
            for (let i = 0; i < 5; i++) {
              yield { clock: new Date().toString() };
              await setTimeout$(1000);
            }
          },
        },
      },
    },
  }),
});

(async () => {
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
})();
