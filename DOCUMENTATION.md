# OnTime – skrócona dokumentacja

## Cel produktu
- Mobilna PWA do śledzenia transportu publicznego w czasie rzeczywistym.
- Łączy planowanie trasy z danymi o incydentach zgłaszanymi przez społeczność i operatorów.
- Buduje zaufanie do zgłoszeń dzięki systemowi reputacji i moderacji.

## Stos technologiczny
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind + shadcn/ui, Leaflet do map.
- **Stan i UX**: Zustand na dane użytkownika, React Hook Form, Radix UI, animacje Tailwind 4.
- **Backend**: Własny serwer `server.ts` (Node.js) łączący Next.js z GraphQL Yoga + WebSocket (`ws`).
- **Auth & sesje**: NextAuth.js v5 z adapterem MongoDB, JWT rozszyfrowywane w kontekście GraphQL.
- **Baza danych**: MongoDB (kolekcje m.in. users, incidents, routes, journeyNotifications).
- **Powiadomienia**: Web Push (`web-push`), kolejka w MongoDB + Subskrypcje GraphQL (graphql-ws).
- **DevOps**: Turbopack build, cron (`cron`) do przeliczania trust score, skrypty importu danych w `scripts/`.

## Architektura logiczna
- **Warstwa UI** (`src/app`, `src/components`): mobilny layout z mapą, widget powiadomień, dialogi dodawania trasy i incydentu.
- **Warstwa danych** (`src/backend`): GraphQL schema + resolvery, algorytm A* z incydentami (`pathfinding/astar-with-incidents.ts`), system reputacji i powiadomień.
- **Integracje danych**: import GTFS (`scripts/import-gtfs-full.ts`) do kolekcji Lines/Stops/Trips, generator danych demo (`scripts/populate-incidents.ts`).
- **Procesy okresowe**: cron `startTrustScoreCron` aktualizuje `trustScore` i czyści wygasłe podróże.
- **Kod wspólny** (`src/lib`, `src/store`): utils SEO/PWA, klient GraphQL Zeus, logika notyfikacji, magazyn Zustand.

## Kluczowe przepływy użytkownika
1. **Planowanie trasy**: Dialog `AddJourneyDialog` → zapytanie GraphQL `findOptimalJourney` (A*) → zapis aktywnej trasy `setActiveJourney` → render ścieżki na mapie.
2. **Zgłaszanie incydentu**: `AddEventDialog` pobiera kontekst trasy, tworzy zgłoszenie przez `submitIncidentReport`, wykrywa segment linii i nadaje status.
3. **Powiadomienia w podróży**: `notification-system.ts` filtruje zgłoszenia wg linii, reputacji i podobnych raportów → zapis `journeyNotifications` → frontend `AlertsFloatingSheet` + push.
4. **Admin**: przestrzeń `/admin` korzystają z resolverów `AdminQuery/Mutation` do walidacji incydentów, statystyk i zarządzania użytkownikami.

## Dane i jakość
- GTFS trzymany w Mongo – segmenty tras zapisują referencje do stopów i linii.
- System reputacji: nagrody/kary w `mutation.ts`, metryki w `trust-score-calculator`, wyniki zapisywane u użytkownika.
- Dedykowana pamięć podręczna na duplikaty powiadomień (`notification-system.ts`).
- Testy jednostkowe i e2e w `tests/`; lint + type-check (`npm run lint`, `tsc`).

## Uruchomienie lokalne
- `npm install` → skopiuj `.env.example` do `.env` i uzupełnij (MongoDB, AUTH_SECRET, VAPID).
- Import przykładowych danych: `npm run import:gtfs:full`, `npm run populate:incidents`.
- Start backendu i frontu: `npm run dev` (Next.js + GraphQL na jednym porcie).
- Budowa produkcyjna: `npm run build` → `npm start`.