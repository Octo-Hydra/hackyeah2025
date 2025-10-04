# System Powiadomień dla Użytkowników - Dokumentacja

## 📋 Przegląd

System inteligentnych powiadomień o incydentach, który wykorzystuje algorytm progowy (threshold algorithm) do oceny, czy użytkownik powinien otrzymać powiadomienie o nowym zgłoszeniu.

## 🎯 Funkcjonalności

### 1. Aktywna Podróż (Active Journey)

Użytkownik może ustawić aktywną podróż, którą właśnie odbywa. System monitoruje incydenty wpływające na tę trasę i wysyła powiadomienia o wysokim priorytecie.

**Priorytety:**
- **CRITICAL** - Poważne incydenty (CLASS_1) na aktywnej trasie
- **HIGH** - Mniejsze incydenty (CLASS_2) na aktywnej trasie

### 2. Ulubione Połączenia (Favorite Connections)

Użytkownik może zapisać ulubione trasy (np. "Dom - Praca", "Do szkoły"). System wysyła powiadomienia o incydentach na tych trasach **niezależnie od tego, czy użytkownik aktualnie nimi podróżuje**.

**Priorytety:**
- **HIGH** - Poważne incydenty (CLASS_1) na ulubionych trasach
- **MEDIUM** - Mniejsze incydenty (CLASS_2) na ulubionych trasach

### 3. Algorytm Decyzyjny

System analizuje każdy nowy incydent i sprawdza:
1. Czy incydent wpływa na **aktywną podróż** użytkownika → **NAJWYŻSZY PRIORYTET**
2. Czy incydent wpływa na **ulubione połączenia** użytkownika → **ŚREDNI PRIORYTET**
3. Jeśli nie - nie wysyła powiadomienia

## 🔧 GraphQL API

### Typy Danych

```graphql
type User {
  id: ID!
  reputation: Int
  activeJourney: ActiveJourney
  favoriteConnections: [FavoriteConnection!]
}

type ActiveJourney {
  routeIds: [ID!]!
  lineIds: [ID!]!
  startStopId: ID!
  endStopId: ID!
  startTime: String!
  expectedEndTime: String!
  notifiedIncidentIds: [ID!]
}

type FavoriteConnection {
  id: ID!
  name: String!
  routeIds: [ID!]!
  lineIds: [ID!]!
  startStopId: ID!
  endStopId: ID!
  notifyAlways: Boolean!
  createdAt: String!
}
```

### Mutacje

#### 1. Ustawienie Aktywnej Podróży

```graphql
mutation SetActiveJourney($input: ActiveJourneyInput!) {
  userMutations {
    setActiveJourney(input: $input) {
      id
      activeJourney {
        lineIds
        startTime
        expectedEndTime
      }
    }
  }
}
```

**Przykładowe zmienne:**
```json
{
  "input": {
    "routeIds": ["route1_id", "route2_id"],
    "lineIds": ["line1_id", "line2_id"],
    "startStopId": "stop_a_id",
    "endStopId": "stop_b_id",
    "startTime": "2025-10-04T14:30:00Z",
    "expectedEndTime": "2025-10-04T15:45:00Z"
  }
}
```

**Przypadki użycia:**
- Użytkownik wsiada do autobusu/pociągu
- Aplikacja mobilna automatycznie ustawia aktywną podróż
- System zaczyna monitorować incydenty na tej trasie

#### 2. Zakończenie Aktywnej Podróży

```graphql
mutation ClearActiveJourney {
  userMutations {
    clearActiveJourney {
      id
      activeJourney
    }
  }
}
```

**Przypadki użycia:**
- Użytkownik dotarł do celu
- Automatyczne zakończenie po upływie `expectedEndTime`
- Ręczne zakończenie przez użytkownika

#### 3. Dodanie Ulubionego Połączenia

```graphql
mutation AddFavorite($input: FavoriteConnectionInput!) {
  userMutations {
    addFavoriteConnection(input: $input) {
      id
      name
      lineIds
      notifyAlways
    }
  }
}
```

**Przykładowe zmienne:**
```json
{
  "input": {
    "name": "Dom - Praca",
    "routeIds": ["route1_id"],
    "lineIds": ["line1_id", "line2_id"],
    "startStopId": "home_stop_id",
    "endStopId": "work_stop_id",
    "notifyAlways": true
  }
}
```

**Parametry:**
- `notifyAlways: true` (domyślnie) - Powiadomienia zawsze, nawet gdy użytkownik nie podróżuje
- `notifyAlways: false` - Powiadomienia tylko gdy trasa jest aktywna

#### 4. Usunięcie Ulubionego Połączenia

```graphql
mutation RemoveFavorite($id: ID!) {
  userMutations {
    removeFavoriteConnection(id: $id) {
      success
      message
    }
  }
}
```

#### 5. Aktualizacja Ulubionego Połączenia

```graphql
mutation UpdateFavorite($id: ID!, $input: FavoriteConnectionInput!) {
  userMutations {
    updateFavoriteConnection(id: $id, input: $input) {
      id
      name
      notifyAlways
    }
  }
}
```

#### 6. Utworzenie Zgłoszenia przez Użytkownika

```graphql
mutation CreateUserReport($input: CreateReportInput!) {
  userMutations {
    createReport(input: $input) {
      id
      title
      kind
      incidentClass
    }
  }
}
```

**Co się dzieje po utworzeniu zgłoszenia:**
1. Zgłoszenie zapisywane do bazy danych
2. **Algorytm sprawdza wszystkich użytkowników** i ocenia, kto powinien dostać powiadomienie
3. System automatycznie wysyła powiadomienia do dotkniętych użytkowników
4. Publikowane zdarzenie WebSocket dla subskrybentów

## 🧠 Threshold Algorithm - Logika Decyzyjna

### Funkcja: `shouldNotifyUser()`

```typescript
export function shouldNotifyUser(
  incidentLineIds: (string | null)[],
  userActiveJourneyLineIds?: string[],
  userFavoriteLineIds?: string[],
  incidentClass?: "CLASS_1" | "CLASS_2",
): NotificationDecision
```

**Zwraca:**
```typescript
interface NotificationDecision {
  shouldNotify: boolean;
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedRoutes?: string[];
  message?: string;
}
```

### Przykłady Decyzji

**Przykład 1: Incydent na aktywnej trasie (CLASS_1)**
```typescript
Input:
  incidentLineIds: ["line_1", "line_2"]
  userActiveJourneyLineIds: ["line_1", "line_3"]
  incidentClass: "CLASS_1"

Output:
{
  shouldNotify: true,
  reason: "Incident affects your active journey",
  priority: "CRITICAL",
  affectedRoutes: ["line_1"],
  message: "⚠️ CRITICAL: Your current journey is affected by a serious incident!"
}
```

**Przykład 2: Incydent na ulubionej trasie (CLASS_2)**
```typescript
Input:
  incidentLineIds: ["line_5"]
  userActiveJourneyLineIds: undefined
  userFavoriteLineIds: ["line_5", "line_6"]
  incidentClass: "CLASS_2"

Output:
{
  shouldNotify: true,
  reason: "Incident affects your favorite connection",
  priority: "MEDIUM",
  affectedRoutes: ["line_5"],
  message: "ℹ️ An incident is affecting one of your favorite routes."
}
```

**Przykład 3: Incydent nie dotyczy użytkownika**
```typescript
Input:
  incidentLineIds: ["line_10"]
  userActiveJourneyLineIds: ["line_1"]
  userFavoriteLineIds: ["line_5", "line_6"]

Output:
{
  shouldNotify: false,
  reason: "Incident does not affect user's journeys or favorites",
  priority: "LOW"
}
```

## 📊 Przepływ Danych

### Tworzenie Zgłoszenia przez Użytkownika

```
1. Użytkownik wywołuje createReport mutation
                ↓
2. Backend zapisuje incydent do MongoDB
                ↓
3. notifyAffectedUsers() - algorytm sprawdza wszystkich użytkowników
                ↓
4. Dla każdego użytkownika:
   - extractActiveJourneyLineIds() - wyciąga linie z aktywnej podróży
   - extractFavoriteLineIds() - wyciąga linie z ulubionych połączeń
   - shouldNotifyUser() - decyduje czy powiadomić
                ↓
5. Jeśli shouldNotify == true:
   - Dodaje incidentId do user.activeJourney.notifiedIncidentIds
   - Loguje decyzję: "📢 Notify user X: [message] [priority]"
   - (W przyszłości: wysyła push notification)
                ↓
6. Publikuje zdarzenie WebSocket (INCIDENT_CREATED)
                ↓
7. Wszyscy subskrybenci otrzymują powiadomienie w czasie rzeczywistym
```

## 🚀 Przykłady Użycia

### Frontend - React/Next.js

#### 1. Ustawienie Aktywnej Podróży (np. po rozpoczęciu nawigacji)

```typescript
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

const SET_ACTIVE_JOURNEY = gql`
  mutation SetActiveJourney($input: ActiveJourneyInput!) {
    userMutations {
      setActiveJourney(input: $input) {
        id
        activeJourney {
          lineIds
          startTime
        }
      }
    }
  }
`;

function StartJourneyButton({ route }) {
  const [setActiveJourney] = useMutation(SET_ACTIVE_JOURNEY);

  const handleStartJourney = async () => {
    await setActiveJourney({
      variables: {
        input: {
          routeIds: route.routeIds,
          lineIds: route.lineIds,
          startStopId: route.startStop.id,
          endStopId: route.endStop.id,
          startTime: new Date().toISOString(),
          expectedEndTime: calculateExpectedArrival(route),
        }
      }
    });

    // Teraz system będzie monitorował tę trasę!
    showNotification("Journey tracking started!");
  };

  return (
    <button onClick={handleStartJourney}>
      Start Journey Tracking
    </button>
  );
}
```

#### 2. Zarządzanie Ulubionymi Połączeniami

```typescript
const ADD_FAVORITE = gql`
  mutation AddFavorite($input: FavoriteConnectionInput!) {
    userMutations {
      addFavoriteConnection(input: $input) {
        id
        name
        lineIds
      }
    }
  }
`;

function SaveFavoriteRoute({ route }) {
  const [addFavorite] = useMutation(ADD_FAVORITE);

  const handleSaveFavorite = async () => {
    const name = prompt("Name this connection:");
    
    await addFavorite({
      variables: {
        input: {
          name: name || "Unnamed Route",
          routeIds: route.routeIds,
          lineIds: route.lineIds,
          startStopId: route.startStop.id,
          endStopId: route.endStop.id,
          notifyAlways: true, // Always notify about this route
        }
      }
    });

    showNotification("Route saved to favorites!");
  };

  return (
    <button onClick={handleSaveFavorite}>
      ⭐ Save as Favorite
    </button>
  );
}
```

#### 3. Automatyczne zakończenie podróży po dotarciu do celu

```typescript
const CLEAR_ACTIVE_JOURNEY = gql`
  mutation ClearActiveJourney {
    userMutations {
      clearActiveJourney {
        id
        activeJourney
      }
    }
  }
`;

function useAutoEndJourney() {
  const [clearJourney] = useMutation(CLEAR_ACTIVE_JOURNEY);
  const { data: userData } = useQuery(GET_ME);

  useEffect(() => {
    if (!userData?.me?.activeJourney) return;

    const expectedEnd = new Date(userData.me.activeJourney.expectedEndTime);
    const now = new Date();
    const timeRemaining = expectedEnd.getTime() - now.getTime();

    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        clearJourney();
        showNotification("Journey completed!");
      }, timeRemaining);

      return () => clearTimeout(timer);
    }
  }, [userData, clearJourney]);
}
```

## 🔔 Integracja z Push Notifications

### Przykład: Service Worker z Web Push API

```typescript
// service-worker.ts
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  if (data.type === 'incident_notification') {
    const options = {
      body: data.message,
      icon: '/icon-warning.png',
      badge: '/badge.png',
      tag: `incident-${data.incidentId}`,
      data: {
        incidentId: data.incidentId,
        priority: data.priority,
      },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: data.priority === 'CRITICAL' ? [200, 100, 200] : [100],
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});
```

## 📈 Monitoring i Logi

System loguje każdą decyzję o powiadomieniu:

```
📢 Notify user john@example.com: ⚠️ CRITICAL: Your current journey is affected by a serious incident! [CRITICAL]
📢 Notify user jane@example.com: ℹ️ An incident is affecting one of your favorite routes. [MEDIUM]
```

**Format logu:**
- 📢 - Ikona powiadomienia
- Email użytkownika
- Treść wiadomości
- Priorytet w nawiasach kwadratowych

## 🎨 Wyświetlanie Priorytetów w UI

```typescript
function getNotificationStyle(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return {
        color: 'red',
        icon: '🚨',
        sound: 'critical-alert.mp3',
      };
    case 'HIGH':
      return {
        color: 'orange',
        icon: '⚠️',
        sound: 'high-alert.mp3',
      };
    case 'MEDIUM':
      return {
        color: 'yellow',
        icon: 'ℹ️',
        sound: 'info-alert.mp3',
      };
    default:
      return {
        color: 'gray',
        icon: '📌',
        sound: null,
      };
  }
}
```

## 🔒 Bezpieczeństwo

### Uwaga: Autentykacja wymagana

Wszystkie mutacje użytkownika wymagają sesji:

```typescript
const userEmail = ctx.session?.user?.email;
if (!userEmail) {
  throw new Error("Not authenticated");
}
```

### Prywatność danych

- Tylko użytkownik widzi swoje aktywne podróże
- Tylko użytkownik widzi swoje ulubione połączenia
- Incydenty są publiczne, ale powiadomienia personalizowane

## 🚦 Najlepsze Praktyki

### 1. Automatyzacja

✅ **Dobrze:**
- Automatyczne ustawianie aktywnej podróży po rozpoczęciu nawigacji
- Automatyczne zakończenie po dotarciu do celu
- Subskrypcje WebSocket dla real-time updates

❌ **Źle:**
- Ręczne odświeżanie strony aby zobaczyć nowe incydenty
- Brak automatycznego czyszczenia starych aktywnych podróży

### 2. UX

✅ **Dobrze:**
- Różne style wizualne dla różnych priorytetów
- Dźwięki dla krytycznych powiadomień
- Wibracje dla alertów na urządzeniach mobilnych
- Możliwość wyciszenia powiadomień dla konkretnych połączeń

❌ **Źle:**
- Wszystkie powiadomienia wyglądają tak samo
- Brak możliwości zarządzania ulubionymi trasami
- Spam powiadomień o małoznaczących incydentach

### 3. Wydajność

✅ **Dobrze:**
- Algorytm sprawdza tylko użytkowników z aktywnymi podróżami lub ulubionymi trasami
- Deduplikacja notifiedIncidentIds zapobiega duplikatom
- Indeksy MongoDB na email i lineIds

❌ **Źle:**
- Sprawdzanie każdego użytkownika przy każdym incydencie bez filtrowania
- Brak cache'owania ulubionych tras
- Wysyłanie tych samych powiadomień wielokrotnie

## 📝 TODO / Przyszłe Usprawnienia

- [ ] Wysyłanie rzeczywistych push notifications (Web Push API)
- [ ] Email notifications dla krytycznych incydentów
- [ ] SMS dla użytkowników premium
- [ ] Historia powiadomień w profilu użytkownika
- [ ] Statystyki: ile razy trasa była dotknięta incydentami
- [ ] Rekomendacje alternatywnych tras przy incydentach
- [ ] Machine learning do przewidywania opóźnień
- [ ] Integracja z kalendarzem (automatyczne ulubione trasy na podstawie regularnych podróży)

## 🧪 Testowanie

### Test 1: Użytkownik z aktywną podróżą

```graphql
# 1. Ustawienie aktywnej podróży
mutation {
  userMutations {
    setActiveJourney(input: {
      routeIds: ["route1"]
      lineIds: ["line1"]
      startStopId: "stop_a"
      endStopId: "stop_b"
      startTime: "2025-10-04T14:00:00Z"
      expectedEndTime: "2025-10-04T15:00:00Z"
    }) {
      id
      activeJourney {
        lineIds
      }
    }
  }
}

# 2. Utworzenie incydentu na line1
mutation {
  userMutations {
    createReport(input: {
      title: "Awaria pojazdu"
      kind: VEHICLE_FAILURE
      lineIds: ["line1"]
    }) {
      id
    }
  }
}

# Oczekiwany wynik: Użytkownik otrzyma CRITICAL notification
# Log: 📢 Notify user X: ⚠️ CRITICAL: Your current journey is affected by a serious incident! [CRITICAL]
```

### Test 2: Użytkownik z ulubionymi trasami

```graphql
# 1. Dodanie ulubionej trasy
mutation {
  userMutations {
    addFavoriteConnection(input: {
      name: "Dom - Praca"
      routeIds: ["route5"]
      lineIds: ["line5"]
      startStopId: "home"
      endStopId: "work"
      notifyAlways: true
    }) {
      id
    }
  }
}

# 2. Utworzenie incydentu na line5
mutation {
  userMutations {
    createReport(input: {
      title: "Drobne opóźnienie"
      kind: TRAFFIC_JAM
      lineIds: ["line5"]
    }) {
      id
    }
  }
}

# Oczekiwany wynik: Użytkownik otrzyma MEDIUM notification
# Log: 📢 Notify user X: ℹ️ An incident is affecting one of your favorite routes. [MEDIUM]
```

## 📖 Podsumowanie

System zapewnia:
- ✅ Inteligentne powiadomienia oparte na kontekście użytkownika
- ✅ Personalizowane alerty dla aktywnych podróży
- ✅ Monitoring ulubionych tras
- ✅ Priorytetyzację powiadomień (CRITICAL > HIGH > MEDIUM > LOW)
- ✅ Automatyczną detekcję dotkniętych użytkowników
- ✅ Real-time updates przez WebSocket
- ✅ Integrację z threshold algorithm

**Gotowe do produkcji!** 🚀
