# System Powiadomień - Szybki Przewodnik 🚀

## 🎯 Co zostało dodane?

System automatycznych powiadomień o incydentach, który:
- ✅ Monitoruje **aktywną podróż** użytkownika (CRITICAL/HIGH priority)
- ✅ Śledzi **ulubione połączenia** (HIGH/MEDIUM priority)
- ✅ Automatycznie ocenia czy wysłać powiadomienie
- ✅ Publikuje zdarzenia WebSocket real-time

## 📱 Mutacje GraphQL

### 1. Rozpocznij Śledzenie Podróży

```graphql
mutation {
  userMutations {
    setActiveJourney(input: {
      routeIds: ["route_id"]
      lineIds: ["line1_id", "line2_id"]
      startStopId: "przystanek_a"
      endStopId: "przystanek_b"
      startTime: "2025-10-04T14:30:00Z"
      expectedEndTime: "2025-10-04T15:45:00Z"
    }) {
      id
      activeJourney {
        lineIds
      }
    }
  }
}
```

**Kiedy użyć:**
- Użytkownik rozpoczyna nawigację
- Wsiada do autobusu/pociągu
- Aplikacja mobilna automatycznie

**Co się dzieje:**
- System zaczyna monitorować tę trasę
- Nowe incydenty na tej trasie → CRITICAL/HIGH powiadomienie

### 2. Zakończ Śledzenie Podróży

```graphql
mutation {
  userMutations {
    clearActiveJourney {
      id
      activeJourney
    }
  }
}
```

**Kiedy użyć:**
- Użytkownik dotarł do celu
- Automatycznie po upływie expectedEndTime
- Ręczne zakończenie

### 3. Dodaj Ulubione Połączenie

```graphql
mutation {
  userMutations {
    addFavoriteConnection(input: {
      name: "Dom - Praca"
      routeIds: ["route1"]
      lineIds: ["line1", "line2"]
      startStopId: "dom"
      endStopId: "praca"
      notifyAlways: true  # Powiadomienia ZAWSZE, nawet gdy nie podróżujesz
    }) {
      id
      name
    }
  }
}
```

**Przypadki użycia:**
- Zapisz regularną trasę do pracy
- Trasa do szkoły dziecka
- Codzienna trasa zakupowa

**`notifyAlways: true`** → Dostaniesz powiadomienia nawet gdy nie podróżujesz
**`notifyAlways: false`** → Powiadomienia tylko gdy trasa jest aktywna

### 4. Usuń Ulubione Połączenie

```graphql
mutation {
  userMutations {
    removeFavoriteConnection(id: "favorite_id") {
      success
      message
    }
  }
}
```

### 5. Zaktualizuj Ulubione Połączenie

```graphql
mutation {
  userMutations {
    updateFavoriteConnection(
      id: "favorite_id"
      input: {
        name: "Nowa nazwa"
        routeIds: ["route1"]
        lineIds: ["line1"]
        startStopId: "start"
        endStopId: "end"
        notifyAlways: false  # Wyłącz powiadomienia
      }
    ) {
      id
      name
    }
  }
}
```

### 6. Utwórz Zgłoszenie Incydentu

```graphql
mutation {
  userMutations {
    createReport(input: {
      title: "Awaria pojazdu na linii 123"
      description: "Autobus stanął na przystanku X"
      kind: VEHICLE_FAILURE
      lineIds: ["line1_id"]
    }) {
      id
      title
      incidentClass
    }
  }
}
```

**Co się dzieje automatycznie:**
1. Incydent zapisywany do bazy
2. **Algorytm sprawdza wszystkich użytkowników**
3. Jeśli incydent wpływa na ich trasę → **POWIADOMIENIE**
4. WebSocket publikuje zdarzenie → real-time updates

## 🚦 Priorytety Powiadomień

| Priorytet | Kiedy | Ikona | Co zrobić |
|-----------|-------|-------|-----------|
| **CRITICAL** | CLASS_1 incydent na **aktywnej podróży** | 🚨 | Znajdź alternatywną trasę NATYCHMIAST |
| **HIGH** | CLASS_2 incydent na **aktywnej podróży** LUB CLASS_1 na **ulubionej trasie** | ⚠️ | Sprawdź szczegóły, możliwe opóźnienia |
| **MEDIUM** | CLASS_2 incydent na **ulubionej trasie** | ℹ️ | Informacja, nie wymaga akcji |
| **LOW** | Incydent nie dotyczy użytkownika | 📌 | Ignoruj |

## 🧠 Algorytm Decyzyjny

```
Nowy incydent utworzony
        ↓
Czy dotyczy linii z aktywnej podróży użytkownika?
        ↓ TAK
    [CRITICAL/HIGH] → WYSYŁAJ POWIADOMIENIE! 🚨
        ↓ NIE
Czy dotyczy linii z ulubionych połączeń (notifyAlways=true)?
        ↓ TAK
    [HIGH/MEDIUM] → WYSYŁAJ POWIADOMIENIE! ⚠️
        ↓ NIE
    [LOW] → NIE WYSYŁAJ
```

## 💡 Przykłady Użycia

### Scenariusz 1: Podróż do Pracy

```typescript
// 1. Rano: Zapisz ulubioną trasę
await addFavoriteConnection({
  name: "Dom - Praca",
  lineIds: ["line5"],
  notifyAlways: true
});

// 2. Wsiada do autobusu: Rozpocznij tracking
await setActiveJourney({
  lineIds: ["line5"],
  startTime: now(),
  expectedEndTime: now() + 30min
});

// 3. Incydent na line5 → CRITICAL alert! 🚨
// 4. Po dotarciu do celu: Zakończ tracking
await clearActiveJourney();

// 5. Wieczorem: Nadal otrzymasz powiadomienia o line5
//    (bo notifyAlways=true)
```

### Scenariusz 2: Monitorowanie bez Podróży

```typescript
// Zapisz trasę dziecka do szkoły
await addFavoriteConnection({
  name: "Trasa szkolna dziecka",
  lineIds: ["line12"],
  notifyAlways: true
});

// Teraz otrzymasz powiadomienia o incydentach na line12
// nawet gdy sam nie podróżujesz!
```

### Scenariusz 3: Tymczasowe Wyciszenie

```typescript
// Wakacje - nie chcę powiadomień o trasie do pracy
await updateFavoriteConnection(favoriteId, {
  notifyAlways: false  // Wyłącz powiadomienia
});

// Po powrocie z wakacji
await updateFavoriteConnection(favoriteId, {
  notifyAlways: true  // Włącz ponownie
});
```

## 📊 Nowe Pola w User Type

```graphql
type User {
  # ... istniejące pola ...
  reputation: Int  # Reputacja użytkownika (dla przyszłych funkcji)
  activeJourney: ActiveJourney  # Aktualna podróż (jeśli trwa)
  favoriteConnections: [FavoriteConnection!]  # Zapisane ulubione trasy
}
```

**Pobieranie danych użytkownika:**
```graphql
query {
  me {
    id
    name
    reputation
    activeJourney {
      lineIds
      startTime
      expectedEndTime
    }
    favoriteConnections {
      id
      name
      lineIds
      notifyAlways
    }
  }
}
```

## 🔔 Integracja z Frontendem

### React Hook Example

```typescript
function useJourneyTracking() {
  const [setActiveJourney] = useMutation(SET_ACTIVE_JOURNEY);
  const [clearActiveJourney] = useMutation(CLEAR_ACTIVE_JOURNEY);

  const startTracking = async (route: Route) => {
    await setActiveJourney({
      variables: {
        input: {
          routeIds: route.routeIds,
          lineIds: route.lineIds,
          startStopId: route.start.id,
          endStopId: route.end.id,
          startTime: new Date().toISOString(),
          expectedEndTime: calculateArrival(route),
        }
      }
    });
    
    toast.success("🚀 Journey tracking started!");
  };

  const stopTracking = async () => {
    await clearActiveJourney();
    toast.info("Journey ended");
  };

  return { startTracking, stopTracking };
}
```

### Notification Display Component

```typescript
function IncidentNotification({ incident, priority }) {
  const styles = {
    CRITICAL: { bg: 'red', icon: '🚨', sound: true },
    HIGH: { bg: 'orange', icon: '⚠️', sound: true },
    MEDIUM: { bg: 'yellow', icon: 'ℹ️', sound: false },
  };

  const style = styles[priority];

  return (
    <div className={`notification bg-${style.bg}`}>
      <span className="icon">{style.icon}</span>
      <h3>{incident.title}</h3>
      <p>{incident.description}</p>
      {style.sound && <audio src="/alert.mp3" autoPlay />}
    </div>
  );
}
```

## 🧪 Testowanie

### Test w GraphQL Playground

```graphql
# 1. Dodaj ulubioną trasę
mutation {
  userMutations {
    addFavoriteConnection(input: {
      name: "Test Route"
      routeIds: ["r1"]
      lineIds: ["line1"]
      startStopId: "s1"
      endStopId: "s2"
      notifyAlways: true
    }) {
      id
    }
  }
}

# 2. Utwórz incydent na line1
mutation {
  userMutations {
    createReport(input: {
      title: "Test Incident"
      kind: VEHICLE_FAILURE
      lineIds: ["line1"]
    }) {
      id
    }
  }
}

# 3. Sprawdź logi serwera:
# 📢 Notify user your@email.com: ⚠️ A serious incident is affecting one of your favorite routes. [HIGH]
```

## 📝 Najważniejsze Punkty

✅ **Aktywna podróż** = NAJWYŻSZY priorytet powiadomień
✅ **Ulubione połączenia** = Powiadomienia w tle
✅ **notifyAlways: true** = Powiadomienia zawsze (domyślnie)
✅ **notifyAlways: false** = Powiadomienia tylko gdy trasa aktywna
✅ **Automatyczna detekcja** = Backend sprawdza wszystkich użytkowników
✅ **Real-time** = WebSocket subscriptions
✅ **Priorytetyzacja** = CRITICAL > HIGH > MEDIUM > LOW

## 🔗 Dokumentacja

- **Pełna dokumentacja**: `docs/USER_NOTIFICATIONS_SYSTEM.md`
- **WebSocket subscriptions**: `docs/WEBSOCKET_SUBSCRIPTIONS.md`
- **Threshold algorithm**: `src/lib/threshold-algorithm.ts`

---

**Gotowe do użycia!** 🎉

Użytkownicy mogą teraz:
1. Śledzić swoje aktywne podróże
2. Zapisywać ulubione trasy
3. Otrzymywać inteligentne powiadomienia
4. Zarządzać swoimi preferencjami

Backend automatycznie ocenia każdy nowy incydent i powiadamia dotkniętych użytkowników w czasie rzeczywistym!
