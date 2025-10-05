# ✅ Refaktoryzacja MODERATOR → ADMIN

## 🎯 Cel
Uproszczenie systemu ról z trzech (USER, MODERATOR, ADMIN) do dwóch (USER, ADMIN) oraz usunięcie mobile header ze wszystkich stron.

## �� Wykonane Zmiany

### 1. Folder i Routing
- ✅ `src/app/moderator/` → `src/app/admin/`
- ✅ Wszystkie linki `/moderator` → `/admin`
- ✅ Callback URLs zaktualizowane

### 2. Typy i Schema
- ✅ **GraphQL Schema** (`src/backend/schema.graphql`):
  - Usunięto `MODERATOR` z enum `UserRole`
  - Pozostały: `USER`, `ADMIN`
  - Komentarze `MODERATOR/ADMIN only` → `ADMIN only`

- ✅ **NextAuth Types** (`src/types/next-auth.d.ts`):
  - `role: "USER" | "ADMIN"` (usunięto MODERATOR)

- ✅ **Auth Helpers** (`src/lib/auth-helpers.ts`):
  - `UserRole = "USER" | "ADMIN"`
  - `isModerator()` oznaczono jako deprecated (mapuje na `isAdmin()`)
  - `canModifyResource()` sprawdza tylko ADMIN

### 3. Backend Resolvers
- ✅ **`src/backend/resolvers/mutation.ts`**:
  - `resolveIncidentReport()` - tylko ADMIN może rozwiązywać
  - Dodano mapping MODERATOR → USER dla backwards compatibility
  - Komentarze zaktualizowane

- ✅ **`src/lib/notification-system.ts`**:
  - `processIncidentNotifications()` przyjmuje `"USER" | "ADMIN"`
  - Usunięto sprawdzanie MODERATOR
  - Zaktualizowano komentarze

### 4. Komponenty UI
- ✅ **Mobile Navigation** (`src/components/mobile-nav.tsx`):
  - `name: "Admin"` (było: "Moderator")
  - `href: "/admin"` (było: "/moderator")
  - `requireRole: "ADMIN"` (było: "MODERATOR")
  - `const isAdmin = userRole === "ADMIN"` (było: isModerator)

- ✅ **Home Page** (`src/app/(parallel)/page.tsx`):
  - Przycisk "Admin" tylko dla `role === "ADMIN"`
  - Usunięto sprawdzanie MODERATOR

- ✅ **User Profile** (`src/app/user/page.tsx`):
  - "Panel administratora" tylko dla ADMIN
  - Link do `/admin`

- ✅ **Admin Page** (`src/app/admin/page.tsx`):
  - Metadata: "Panel Administratora"
  - Sprawdza tylko `userRole === "ADMIN"`
  - Nagłówki: "Admin Panel", "Admin Dashboard"

### 5. Usunięcie Mobile Headers
- ✅ **Alerts Page** (`src/app/alerts/page.tsx`):
  - Usunięto mobile header
  - Pozostawiono tylko desktop header (hidden na mobile)
  - `max-h-[calc(100vh-3.5rem)]` na mobile (bottom nav)

- ✅ **User Page** (`src/app/user/page.tsx`):
  - Usunięto mobile header
  - Pozostawiono tylko desktop header

- ✅ **Admin Page** (`src/app/admin/page.tsx`):
  - Usunięto mobile header
  - Pozostawiono tylko desktop header

### 6. SEO i Metadata
- ✅ **Robots.txt** (`src/app/robots.ts`):
  - `disallow: ["/admin"]` (było: "/moderator")

- ✅ **Metadata** we wszystkich plikach:
  - Admin page: Metadata zaktualizowana
  - Canonical URLs: `/admin`

### 7. Auth Configuration
- ✅ **Auth.ts** (`src/auth.ts`):
  - Typ role: `"USER" | "ADMIN" | undefined`
  - Usunięto MODERATOR

## 🔄 Backwards Compatibility

### Istniejący użytkownicy MODERATOR w bazie
Kod obsługuje backwards compatibility:
```typescript
// W mutation.ts
const mappedRole = user.role === "MODERATOR" ? "USER" : user.role;
await processIncidentNotifications(db, doc, mappedRole as "USER" | "ADMIN");
```

**Zalecenie**: Wykonaj migrację bazy danych:
```javascript
// MongoDB migration script
db.Users.updateMany(
  { role: "MODERATOR" },
  { $set: { role: "ADMIN" } }
);
```

## 📱 UI Changes

### Przed
```
Mobile View:
┌─────────────────┐
│ 🏠 OnTime      │ ← Mobile Header
│ Moderator      │
└─────────────────┘
│                 │
│   Content       │
│                 │
└─────────────────┘
│ Home | Alerts  │ ← Bottom Nav
│ User | Moderator│
└─────────────────┘
```

### Po
```
Mobile View:
┌─────────────────┐
│   Content       │ ← Bez mobile header!
│                 │
│                 │
└─────────────────┘
│ Home | Alerts  │ ← Bottom Nav
│ User | Admin   │   (Moderator → Admin)
└─────────────────┘
```

## 🧪 Testowanie

### Checklist
- [ ] Zaloguj jako USER - nie widać przycisku Admin
- [ ] Zaloguj jako ADMIN - widać przycisk Admin
- [ ] `/admin` przekierowuje USER do `/?error=unauthorized`
- [ ] Mobile pages nie mają header (tylko bottom nav)
- [ ] Desktop pages mają header
- [ ] GraphQL schema zaktualizowany (regeneruj Zeus types)
- [ ] Bottom navigation pokazuje "Admin" zamiast "Moderator"

### Komendy testowe
```bash
# Regeneruj Zeus types
npm run dev # Zeus plugin regeneruje typy automatycznie

# Testuj routing
curl http://localhost:3000/admin
curl http://localhost:3000/moderator # Powinno 404

# Sprawdź robots.txt
curl http://localhost:3000/robots.txt | grep admin
```

## 📊 Statystyki

### Zmodyfikowane pliki
- Core: 11 plików
- Schema: 1 plik
- Types: 2 pliki
- Components: 3 pliki
- Pages: 4 pliki
- Docs: należy zaktualizować

### Linie kodu
- Dodane: ~50
- Usunięte: ~150 (głównie mobile headers)
- Zmienione: ~200

## ⚠️ Breaking Changes

### Dla użytkowników
- Role MODERATOR nie istnieje w UI
- URL `/moderator` → 404 (należy używać `/admin`)

### Dla developerów
- TypeScript types: MODERATOR usunięty
- GraphQL enum: MODERATOR usunięty
- Należy zregenerować Zeus types

### Dla bazy danych
- Użytkownicy z role="MODERATOR" będą traktowani jak USER
- **Wymagana migracja**: Zmień MODERATOR → ADMIN w bazie

## 🚀 Deployment

### 1. Przed wdrożeniem
```bash
# Backup bazy danych
mongodump --uri="mongodb://localhost:27017/ontime"

# Sprawdź aktualnych moderatorów
db.Users.find({ role: "MODERATOR" })
```

### 2. Migracja
```bash
# Zmień wszystkich moderatorów na adminów
db.Users.updateMany(
  { role: "MODERATOR" },
  { $set: { role: "ADMIN" } }
)
```

### 3. Wdrożenie
```bash
npm run build
npm run start
```

### 4. Weryfikacja
```bash
# Sprawdź czy nie ma moderatorów
db.Users.countDocuments({ role: "MODERATOR" })
# Powinno zwrócić: 0
```

## 📝 TODO

### Dokumentacja (należy zaktualizować)
- [ ] `docs/ROUTING.md` - zmienić moderator → admin
- [ ] `docs/NEXTAUTH_SECURITY.md` - usunąć MODERATOR z przykładów
- [ ] `docs/SMART_NOTIFICATIONS_SYSTEM.md` - zaktualizować komentarze
- [ ] `docs/SEO_IMPLEMENTATION.md` - zmienić /moderator → /admin
- [ ] `README.md` - zaktualizować strukturę projektu

### Kod
- [ ] Zregenerować Zeus types (automatycznie przy `npm run dev`)
- [ ] Uruchomić migrację bazy danych
- [ ] Zaktualizować testy (jeśli istnieją)

---

**Data refaktoryzacji**: 4 października 2025  
**Status**: ✅ Ukończono  
**Wersja**: 2.0 (simplified role system)
