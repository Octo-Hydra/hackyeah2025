# OnTime PWA - AI Coding Agent Instructions

## Architecture Overview

This is a **Next.js 15 mobile-first PWA** for real-time transit tracking with incident reporting. The architecture centers on:
- **Custom GraphQL Yoga server** (`server.ts`) running alongside Next.js with WebSocket support
- **Type-safe GraphQL client** using Zeus with auto-generated types from schema
- **Real-time subscriptions** via GraphQL WebSocket (not a separate WS server)
- **MongoDB** for persistence with NextAuth.js v5 integration
- **GTFS import system** for transit data (buses, trams, trains)

### Key Architectural Principle
GraphQL is the **single source of truth** for all data operations. The custom `server.ts` handles both HTTP GraphQL queries/mutations and WebSocket subscriptions on `/api/graphql`.

## Critical Workflows

### Development Setup
```bash
npm run dev  # Runs custom server.ts with tsx, loads .env
npm run build  # Next.js build with Turbopack
npm run import:gtfs:full  # Import GTFS transit data
```

The dev server uses `node --import=tsx/esm --env-file .env server.ts` (NOT `next dev`).

### GraphQL Type Generation
**Zeus Plugin** (`zeus-plugin.ts`) watches `src/backend/schema.graphql` and auto-generates TypeScript types to `src/zeus/` on changes. Never manually edit `src/zeus/` files.

To add new GraphQL features:
1. Update `src/backend/schema.graphql`
2. Add resolver in `src/backend/resolvers/`
3. Import resolver in `src/backend/resolvers/index.ts`
4. Types regenerate automatically via Next.js plugin

### Working with GraphQL

**Client Usage** (see `docs/GRAPHQL_CLIENT.md`):
```typescript
import { queries, mutations } from "@/lib/graphql-client";

// Pre-built helpers
const user = await queries.getCurrentUser();
const result = await mutations.createIncidentReport({...});

// Direct Zeus client
import { thunderClient } from "@/lib/graphql-client";
const data = await thunderClient("query")({ me: { id: true, name: true } });
```

**Subscriptions** use GraphQL WebSocket on `/api/graphql` (see `docs/WEBSOCKET_SUBSCRIPTIONS.md`):
```typescript
// Client subscribes via graphql-ws library
// Server publishes via resolvers in src/backend/resolvers/subscriptions.ts
```

### MongoDB Integration
- Singleton client pattern in `src/lib/mongodb.ts` prevents connection leaks
- NextAuth adapter manages `users`, `accounts`, `sessions`, `verificationTokens` collections
- Custom collections: See `src/backend/db/collections.ts` for TypeScript models
- GTFS data populates: `stops`, `lines`, `routes` collections

### Authentication Flow
NextAuth.js v5 configuration in `src/auth.ts`:
- Supports Credentials, Google OAuth, Facebook OAuth
- Session strategy: JWT (no database sessions for PWA offline support)
- Protected routes use middleware checking (if middleware.ts exists)
- Server actions use `auth()` from `@/auth` for session validation

## Project-Specific Conventions

### File Structure Patterns
```
src/app/              # Next.js 15 App Router
  actions/            # Server actions (use "use server")
  api/auth/           # NextAuth API route
  (parallel)/         # Parallel routes (see docs/PARALLEL_ROUTES_ARCHITECTURE.md)
src/backend/          # GraphQL backend
  schema.graphql      # Source of truth for types
  resolvers/          # Query, Mutation, Subscription resolvers
  db/                 # MongoDB collection models
src/components/       # React components (shadcn/ui based)
src/lib/              # Utilities, GraphQL client, MongoDB singleton
src/zeus/             # AUTO-GENERATED - do not edit manually
```

### Component Patterns
- **Mobile-first**: All UI uses mobile viewport lock (see `docs/MOBILE_VIEWPORT_LOCK.md`)
- **Bottom navigation**: Native iOS/Android style tabs in `mobile-nav.tsx`
- **shadcn/ui components**: Import from `@/components/ui/`, configured via `components.json`
- **Client state**: Zustand store in `src/store/use-app-store.ts` (see `src/types/store.ts` for state shape)

### Database Access Pattern
```typescript
import clientPromise from "@/lib/mongodb";
const client = await clientPromise;
const db = client.db();
const collection = db.collection("collectionName");
```
Use models from `src/backend/db/collections.ts` for type safety.

### PWA Specifics
- Service worker: `public/sw.js` (manual, no workbox)
- Manifest: Dynamic via `src/app/manifest.ts` (Next.js 15 native API)
- Install prompt: `src/components/install-prompt.tsx` detects platform
- Splash screens: Multiple sizes in `public/` (see `docs/PWA_INSTALLATION.md`)

## Critical Integration Points

### GTFS Import System
Scripts in `scripts/` import transit data:
- `import-gtfs-full.ts` processes `populate-gtfs/bus/` and `populate-gtfs/train/`
- Creates `stops`, `lines`, `routes` collections
- GTFS IDs preserved for reference (`gtfsId` field)
- See `docs/GTFS_IMPORT.md` for configuration

### Path Finding
Simple implementation in `src/backend/resolvers/pathResolversSimple.ts`:
- Uses MongoDB geo queries on `stops` collection
- Builds journeys from `routes` with time-based scheduling
- See `docs/PATH_FINDING_SIMPLE.md` for algorithm details

### Real-Time Incident Reporting
Flow: User reports → GraphQL mutation → MongoDB insert → PubSub publish → WebSocket subscribers receive update
- Reputation-based threshold system (see `src/lib/threshold-algorithm.ts`)
- Status progression: PENDING → OFFICIAL (when threshold met) → RESOLVED
- Types: `NotificationReport`, `OfficialNotification` in `src/types/store.ts`

## Common Pitfalls

1. **Don't create separate WebSocket servers** - Use existing GraphQL Yoga WebSocket on `/api/graphql`
2. **Don't run `next dev`** - Use `npm run dev` which runs custom `server.ts`
3. **Don't edit `src/zeus/` files** - Regenerate by changing `schema.graphql`
4. **Don't forget `.env` file** - Required vars: `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
5. **Server actions need "use server"** directive at top of file or function
6. **MongoDB singleton** - Always use `import clientPromise from "@/lib/mongodb"`, never create new MongoClient
7. **NEVER create documentation files** - Don't create MD files, example files, or documentation. The `docs/` folder has everything needed. Only create actual implementation code.
8. **No example files** - Don't create `*.example.ts`, `*.sample.ts`, or similar. Write production code directly.

## Quick Reference

- **GraphQL endpoint**: `http://localhost:3000/api/graphql` (HTTP + WebSocket)
- **GraphiQL**: Available at `/api/graphql` in dev mode
- **Docs location**: `docs/` directory with extensive guides (ARCHITECTURE_CORRECTION.md is essential reading)
- **Type safety**: Zeus types in `src/zeus/`, collection models in `src/backend/db/collections.ts`
- **State management**: Zustand store (`use-app-store.ts`) for client state, MongoDB for persistence

## Key Documentation Files

When making changes in specific areas, consult existing docs (READ-ONLY, never create new docs):
- GraphQL changes: `docs/GRAPHQL_CLIENT.md`, `docs/GRAPHQL_SSR_GUIDE.md`
- Subscriptions: `docs/WEBSOCKET_SUBSCRIPTIONS.md`, `docs/ARCHITECTURE_CORRECTION.md`
- GTFS/transit: `docs/GTFS_IMPORT.md`, `docs/PATH_FINDING.md`
- Auth: `docs/NEXTAUTH_SETUP.md`, `docs/QUICKSTART.md`
- PWA: `docs/PWA_INSTALLATION.md`, `docs/MOBILE_PWA.md`
- Database: `docs/DATABASE_SCHEMA.md`

**IMPORTANT:** Reference these docs for context, but NEVER create new documentation files, example files, or README updates. Focus exclusively on implementing working code.
