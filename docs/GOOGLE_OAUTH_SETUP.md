# Google OAuth 2.0 Setup & Troubleshooting

## ❌ Błąd: "doesn't comply with Google's OAuth 2.0 policy"

### Problem
```
You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy for keeping apps secure.
```

### Przyczyny

Google wymaga spełnienia następujących warunków dla aplikacji używających OAuth 2.0:

1. **✅ Zweryfikowana domena** - nie `localhost`
2. **✅ HTTPS** - nie HTTP
3. **✅ Poprawnie skonfigurowany OAuth Consent Screen**
4. **✅ Prawidłowe Redirect URIs**
5. **✅ Autoryzowane JavaScript Origins**

---

## 🔧 Rozwiązania

### Opcja 1: Rozwój lokalny (Testowanie)

#### A. Użyj ngrok lub podobnego tunelu

1. **Zainstaluj ngrok:**
   ```bash
   # Linux/Mac
   brew install ngrok
   # lub pobierz z https://ngrok.com/download
   ```

2. **Uruchom tunel HTTPS:**
   ```bash
   ngrok http 3000
   ```

3. **Skopiuj URL HTTPS** (np. `https://abc123.ngrok.io`)

4. **Zaktualizuj `.env`:**
   ```env
   NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io
   ```

5. **Zaktualizuj Google Cloud Console** (patrz sekcja konfiguracji poniżej)

#### B. Użyj localhost.run (bez instalacji)

```bash
ssh -R 80:localhost:3000 ssh.localhost.run
```

Otrzymasz URL HTTPS który możesz użyć.

---

### Opcja 2: Deploy na produkcję

Najlepsze rozwiązanie dla długoterminowego rozwoju:

#### Darmowe opcje hostingu:
- **Vercel** (zalecane dla Next.js)
- **Netlify**
- **Railway**
- **Render**

#### Deploy na Vercel:

1. **Zainstaluj Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Ustaw zmienne środowiskowe w Vercel Dashboard:**
   - `MONGODB_URI`
   - `AUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `FACEBOOK_CLIENT_ID`
   - `FACEBOOK_CLIENT_SECRET`
   - `NEXT_PUBLIC_BASE_URL` (URL z Vercel, np. `https://your-app.vercel.app`)

---

## 🔐 Konfiguracja Google Cloud Console

### Krok 1: Otwórz Google Cloud Console

1. Idź do: https://console.cloud.google.com/
2. Wybierz swój projekt (lub utwórz nowy)
3. Przejdź do: **APIs & Services** → **Credentials**

### Krok 2: Skonfiguruj OAuth Consent Screen

1. Kliknij **OAuth consent screen** w menu bocznym
2. Wybierz **External** (dla testowania) lub **Internal** (dla org)
3. Wypełnij wymagane pola:
   - **App name:** OnTime
   - **User support email:** twój email
   - **Developer contact:** twój email
4. Dodaj **Scopes:**
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
5. Dodaj **Test users** (dla External typu):
   - Dodaj email(e) które będziesz używać do testowania
6. Kliknij **Save and Continue**

### Krok 3: Utwórz OAuth 2.0 Client ID

1. Wróć do **Credentials**
2. Kliknij **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Wybierz **Application type:** Web application
4. **Name:** OnTime Web Client

5. **Authorized JavaScript origins:**
   ```
   # Dla rozwoju z ngrok:
   https://your-ngrok-url.ngrok.io
   
   # Dla produkcji:
   https://your-app.vercel.app
   ```

6. **Authorized redirect URIs:**
   ```
   # Dla rozwoju z ngrok:
   https://your-ngrok-url.ngrok.io/api/auth/callback/google
   
   # Dla produkcji:
   https://your-app.vercel.app/api/auth/callback/google
   ```

7. Kliknij **Create**
8. **Skopiuj Client ID i Client Secret**

### Krok 4: Zaktualizuj zmienne środowiskowe

Zaktualizuj `.env` lub zmienne środowiskowe na platformie hostingowej:

```env
GOOGLE_CLIENT_ID=your-new-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-new-secret
NEXT_PUBLIC_BASE_URL=https://your-actual-domain.com
```

---

## 🚀 Quick Start dla Vercel

### 1. Deploy

```bash
# Zaloguj się do Vercel
vercel login

# Deploy projekt
vercel

# Użyj production URL
vercel --prod
```

### 2. Ustaw environment variables w Vercel

```bash
# Przez CLI
vercel env add MONGODB_URI
vercel env add AUTH_SECRET
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add FACEBOOK_CLIENT_ID
vercel env add FACEBOOK_CLIENT_SECRET
vercel env add NEXT_PUBLIC_BASE_URL
```

Lub przez Vercel Dashboard:
1. Idź do projektu w Vercel
2. Settings → Environment Variables
3. Dodaj wszystkie zmienne

### 3. Zaktualizuj Google OAuth

1. Idź do Google Cloud Console
2. Zaktualizuj **Authorized redirect URIs**:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```
3. Zaktualizuj **Authorized JavaScript origins**:
   ```
   https://your-app.vercel.app
   ```

### 4. Redeploy

```bash
vercel --prod
```

---

## 🔍 Weryfikacja

### Test OAuth flow:

1. Otwórz aplikację na HTTPS URL
2. Kliknij "Sign In with Google"
3. Powinieneś zobaczyć Google consent screen
4. Po zaakceptowaniu, powinieneś być zalogowany

### Sprawdź logi:

```bash
# Lokalne
npm run dev

# Vercel
vercel logs
```

---

## 📝 Checklist

### Dla rozwoju z ngrok:

- [ ] ngrok zainstalowany i uruchomiony
- [ ] `NEXT_PUBLIC_BASE_URL` ustawiony na ngrok URL
- [ ] Google OAuth Consent Screen skonfigurowany
- [ ] Test users dodani (dla External)
- [ ] Redirect URIs zaktualizowane w Google Console
- [ ] JavaScript Origins zaktualizowane w Google Console
- [ ] Credentials zaktualizowane w `.env`
- [ ] Aplikacja zrestartowana

### Dla produkcji:

- [ ] Aplikacja wdrożona (Vercel/Netlify/etc)
- [ ] Wszystkie environment variables ustawione
- [ ] `NEXT_PUBLIC_BASE_URL` ustawiony na production URL
- [ ] Google OAuth Consent Screen skonfigurowany
- [ ] Redirect URIs zaktualizowane w Google Console
- [ ] JavaScript Origins zaktualizowane w Google Console
- [ ] MongoDB dostępna z produkcji
- [ ] HTTPS działa poprawnie

---

## ⚠️ Częste błędy

### 1. "redirect_uri_mismatch"
**Rozwiązanie:** Upewnij się, że redirect URI w Google Console dokładnie pasuje do tego co wysyła aplikacja.

### 2. "Access blocked: This app's request is invalid"
**Rozwiązanie:** Sprawdź czy OAuth Consent Screen jest poprawnie skonfigurowany i czy dodałeś test users (dla External).

### 3. "invalid_client"
**Rozwiązanie:** Sprawdź czy `GOOGLE_CLIENT_ID` i `GOOGLE_CLIENT_SECRET` są poprawne.

### 4. Nadal localhost w błędach
**Rozwiązanie:** Wyczyść cache przeglądarki i upewnij się że `NEXT_PUBLIC_BASE_URL` jest poprawnie ustawiony (zrestartuj serwer dev).

---

## 🔗 Przydatne linki

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [ngrok Documentation](https://ngrok.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

---

## 💡 Wskazówki

1. **Dla rozwoju:** Użyj ngrok lub localhost.run dla szybkiego testowania OAuth
2. **Dla produkcji:** Deploy na Vercel/Netlify dla stabilnego środowiska
3. **Test users:** Zawsze dodawaj test users w OAuth Consent Screen dla External typu
4. **HTTPS jest obowiązkowe** - Google nie akceptuje HTTP dla OAuth
5. **Redirect URIs muszą być dokładne** - włącznie z trailing slash jeśli potrzebny

---

## 🆘 Nadal masz problemy?

1. Sprawdź logi w terminalu
2. Sprawdź Network tab w DevTools
3. Sprawdź czy wszystkie environment variables są ustawione
4. Sprawdź czy używasz HTTPS
5. Wyczyść cache i cookies przeglądarki
6. Spróbuj w incognito mode
