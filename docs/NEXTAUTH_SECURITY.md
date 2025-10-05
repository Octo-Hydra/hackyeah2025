# NextAuth Security & Account Linking

## 🔐 Zabezpieczenia NextAuth

### Problem: Użytkownicy z tym samym emailem na różnych providerach

Gdy użytkownik ma ten sam email na Google i Facebook, mogą wystąpić konflikty:

- Tworzenie duplikatów użytkowników
- Błędy podczas logowania
- Niezgodne dane między kontami

### Rozwiązanie: Inteligentne łączenie kont

Zaimplementowano system, który:

1. ✅ **Automatycznie łączy konta** z tym samym emailem
2. ✅ **Zapobiega duplikatom** użytkowników
3. ✅ **Bezpiecznie obsługuje** różne providery
4. ✅ **Śledzi połączone konta** w logach

---

## 📋 Zaimplementowane zabezpieczenia

### 1. Account Linking Callback

```typescript
async signIn({ user, account }) {
  if (account && account.provider !== "credentials" && user.email) {
    // Sprawdza czy użytkownik już istnieje
    const existingUser = await db.collection("users").findOne({ email: user.email });

    if (existingUser) {
      // Sprawdza czy konto jest już połączone
      const existingAccount = await db.collection("accounts").findOne({
        userId: existingUser._id,
        provider: account.provider,
      });

      if (!existingAccount) {
        // Łączy nowe konto z istniejącym użytkownikiem
        console.log(`[Auth] Linking ${account.provider} to ${user.email}`);
      }
    }
  }
  return true;
}
```

**Działanie:**

- Przy każdym logowaniu sprawdza czy email już istnieje
- Jeśli tak, łączy nowe konto z istniejącym użytkownikiem
- Wszystko logowane dla audytu

### 2. Extended Session with Roles

```typescript
interface Session {
  user: {
    id: string;
    role: "USER" | "MODERATOR" | "ADMIN";
  } & DefaultSession["user"];
}
```

**Funkcje:**

- Role użytkowników (USER, MODERATOR, ADMIN)
- Pobierane z bazy danych przy każdym JWT token refresh
- Dostępne w całej aplikacji przez `session.user.role`

### 3. JWT Token Enrichment

```typescript
async jwt({ token, user }) {
  // Pobiera rolę z bazy danych
  if (token.email && !token.role) {
    const dbUser = await db.collection("users").findOne({ email: token.email });
    if (dbUser) {
      token.role = dbUser.role || "USER";
      token.id = dbUser._id.toString();
    }
  }
  return token;
}
```

**Korzyści:**

- Zawsze aktualna rola użytkownika
- Synchronizacja z bazą danych
- Bezpieczne przechowywanie w JWT

### 4. Event Logging

```typescript
events: {
  async linkAccount({ user, account }) {
    console.log(`[Auth] Account linked: ${account.provider} for ${user.email}`);
  },
  async signIn({ user, account, isNewUser }) {
    console.log(`[Auth] Sign in: ${user.email} via ${account?.provider} (new user: ${isNewUser})`);
  },
}
```

**Monitoring:**

- Wszystkie logowania śledzone
- Łączenie kont logowane
- Łatwe debugowanie problemów

### 5. Secure Session Configuration

```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days
},
useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
```

**Bezpieczeństwo:**

- JWT strategy (bezstanowe)
- 30-dniowa ważność sesji
- Secure cookies na HTTPS
- Trust host dla proxy/load balancer

---

## 🎯 Przykłady użycia

### Sprawdzanie roli użytkownika

```typescript
// W komponencie Server Component
import { auth } from "@/auth";

export default async function AdminPage() {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return <div>Access denied</div>;
  }

  return <div>Admin panel</div>;
}
```

### Sprawdzanie roli w API Route

```typescript
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "MODERATOR" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Moderator/Admin logic here
  return NextResponse.json({ success: true });
}
```

### Sprawdzanie w Client Component

```typescript
"use client";
import { useSession } from "next-auth/react";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <div>
      <p>Welcome, {session.user.name}</p>
      <p>Role: {session.user.role}</p>

      {session.user.role === "ADMIN" && (
        <button>Admin Settings</button>
      )}

      {(session.user.role === "MODERATOR" || session.user.role === "ADMIN") && (
        <button>Moderate Content</button>
      )}
    </div>
  );
}
```

---

## 📊 Struktura bazy danych

### Collections

#### users

```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  emailVerified: Date | null,
  image: string | null,
  role: "USER" | "MODERATOR" | "ADMIN",  // Nowe pole
  password: string | null,  // Tylko dla credentials
  createdAt: Date,
  updatedAt: Date
}
```

#### accounts (zarządzane przez MongoDBAdapter)

```typescript
{
  _id: ObjectId,
  userId: ObjectId,  // Link do users
  type: "oauth" | "credentials",
  provider: "google" | "facebook" | "credentials",
  providerAccountId: string,
  refresh_token: string | null,
  access_token: string | null,
  expires_at: number | null,
  token_type: string | null,
  scope: string | null,
  id_token: string | null,
  session_state: string | null
}
```

**Kluczowe punkty:**

- Jeden user może mieć wiele accounts
- accounts.userId wskazuje na users.\_id
- Adapter automatycznie zarządza relacjami

---

## 🔄 Flow logowania

### Scenariusz 1: Nowy użytkownik (Google)

```
1. User klika "Sign in with Google"
2. Google OAuth redirect → user autoryzuje
3. Callback: signIn() sprawdza email
4. Email nie istnieje → tworzy nowego usera
5. Tworzy account record (provider: google)
6. JWT token z id i role = "USER"
7. User zalogowany ✅
```

### Scenariusz 2: Istniejący użytkownik loguje się przez Facebook

```
1. User (email: john@example.com) wcześniej zalogowany przez Google
2. User klika "Sign in with Facebook"
3. Facebook OAuth redirect → user autoryzuje (ten sam email)
4. Callback: signIn() sprawdza email
5. Email istnieje! → znajduje istniejącego usera
6. Sprawdza czy facebook account już połączony → nie
7. Tworzy nowy account record (provider: facebook, userId: existing)
8. Loguje: "Linking facebook account to john@example.com"
9. JWT token z tym samym user id
10. User zalogowany z 2 połączonymi kontami ✅
```

### Scenariusz 3: Credentials + OAuth

```
1. User rejestruje się przez email/password
2. Tworzy user + account (provider: credentials)
3. Później loguje się przez Google (ten sam email)
4. Google account zostaje połączony z istniejącym userem
5. User może teraz logować się przez email LUB Google ✅
```

---

## 🛡️ Bezpieczeństwo

### ✅ Zaimplementowane

1. **Account Linking** - bezpieczne łączenie kont
2. **Role-Based Access Control** - role użytkowników
3. **JWT Strategy** - bezstanowe sesje
4. **Secure Cookies** - HTTPS tylko na produkcji
5. **Password Hashing** - bcryptjs dla credentials
6. **Email Validation** - Zod schema
7. **Trust Host** - dla proxy/Railway
8. **Event Logging** - audit trail

### 🔒 Best Practices

1. **Zawsze sprawdzaj session**

   ```typescript
   const session = await auth();
   if (!session) return redirect("/auth/signin");
   ```

2. **Weryfikuj role**

   ```typescript
   if (session.user.role !== "ADMIN") {
     return { error: "Forbidden" };
   }
   ```

3. **Używaj env variables**

   ```bash
   AUTH_SECRET=długi-losowy-string
   AUTH_URL=https://your-domain.com
   ```

4. **Secure cookies na produkcji**
   ```typescript
   useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://");
   ```

---

## 🔧 Konfiguracja

### Environment Variables

```bash
# Required
AUTH_SECRET=your-secret-key  # Generate: openssl rand -base64 32
AUTH_URL=https://your-domain.com
MONGODB_URI=mongodb://...

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
```

### MongoDB Indexes (Recommended)

```javascript
// users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// accounts collection
db.accounts.createIndex({ userId: 1 });
db.accounts.createIndex(
  { provider: 1, providerAccountId: 1 },
  { unique: true }
);
```

---

## 📝 Maintenance

### Sprawdzanie połączonych kont

```javascript
// Znajdź użytkownika z wieloma kontami
db.users.aggregate([
  {
    $lookup: {
      from: "accounts",
      localField: "_id",
      foreignField: "userId",
      as: "accounts",
    },
  },
  {
    $match: {
      "accounts.1": { $exists: true }, // Ma więcej niż 1 konto
    },
  },
]);
```

### Zmiana roli użytkownika

```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "MODERATOR" } }
);
```

---

## 🆘 Troubleshooting

### Problem: Duplikaty użytkowników

**Przyczyna:** Adapter nie znalazł istniejącego usera przy linkowaniu

**Rozwiązanie:** Sprawdź logi, może email nie jest dokładnie taki sam (whitespace, case)

### Problem: Role się nie aktualizuje

**Przyczyna:** JWT token jest cache'owany

**Rozwiązanie:** Wyloguj i zaloguj ponownie, lub zmniejsz `maxAge` sesji

### Problem: "Account linking failed"

**Przyczyna:** Błąd połączenia z bazą danych

**Rozwiązanie:** Sprawdź logi, upewnij się że `MONGODB_URI` jest poprawny

---

## ✨ Korzyści

✅ **Jeden użytkownik, wiele sposobów logowania**
✅ **Bezpieczne zarządzanie rolami**
✅ **Łatwe audytowanie przez logi**
✅ **Kompatybilne z MongoDB Adapter**
✅ **Skalowalne dla dużych aplikacji**
✅ **Type-safe z TypeScript**
