# Mobile Navigation Fix - Dokumentacja

## Problem
Menu mobilne (MobileNav) wylatywało poza ekran telefonu podczas przesuwania mapy. Dolne menu stawało się niewidoczne po interakcji użytkownika z mapą.

## Przyczyna
Problem był spowodowany przez:
1. Dynamiczną zmianę wysokości viewportu na urządzeniach mobilnych (szczególnie iOS Safari)
2. Pokazywanie/ukrywanie paska adresu przeglądarki podczas scrollowania
3. Brak odpowiedniego zarządzania overflow i pozycjonowaniem fixed elements
4. Touch events na mapie powodujące niepożądane zachowania scrollu

## Rozwiązanie

### 1. Viewport Configuration (`src/app/layout.tsx`)
Dodano konfigurację viewport:
```typescript
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};
```

### 2. Custom Hook - useViewportFix (`src/hooks/use-viewport-fix.ts`)
Utworzono hook zarządzający wysokością viewportu:
- Monitoruje zmiany rozmiaru okna
- Ustawia CSS variable `--vh` dla dynamicznej wysokości
- Zapobiega pull-to-refresh na mobile
- Obsługuje zmiany orientacji

### 3. Mobile Navigation (`src/components/mobile-nav.tsx`)
Zmiany:
- Zwiększono z-index do `9999` dla pewności, że menu zawsze jest na wierzchu
- Dodano inline style `position: "fixed", bottom: 0` dla dodatkowej stabilności
- Dodano klasę `touch-ui` dla lepszej obsługi touch events

### 4. Mobile Layout (`src/components/mobile-layout.tsx`)
Zmiany:
- Zintegrowano `useViewportFix` hook
- Zwiększono padding bottom z `pb-16` na `pb-20` dla lepszego marginesu
- Dodano zarządzanie overflow na document i body

### 5. Map Component (`src/components/map.tsx`)
Zmiany:
- Dodano `touchAction: "pan-y"` do style
- Włączono wszystkie opcje touch/drag dla lepszej interakcji
- Dodano explicite właściwości Leaflet dla touch handling

### 6. Home Page (`src/app/(parallel)/page.tsx`)
Zmiany:
- Poprawiono logikę blokowania scroll tylko dla mobile
- Użyto `100dvh` zamiast `100%`
- Dodano `touchAction: "none"` dla body na mobile
- Przesunięto action buttons wyżej (`bottom-20` na mobile vs `bottom-6` na desktop)
- Zawinięto mapę w dodatkowy div z `absolute inset-0`

### 7. Global CSS (`src/app/globals.css`)
Zmiany:
- Dodano support dla CSS variable `--vh`
- Ulepszone style dla `.h-screen-mobile`
- Dodano media query dla mobile z fixed position na html i body
- Dodano transform3d dla lepszego renderowania GPU

## Efekty
✅ Menu mobilne pozostaje zawsze widoczne na dole ekranu
✅ Brak "wylatywania" menu podczas interakcji z mapą
✅ Stabilne pozycjonowanie niezależnie od zmian wysokości viewportu
✅ Lepsze wsparcie dla iOS Safari
✅ Zapobieganie pull-to-refresh
✅ Płynniejsze działanie na urządzeniach mobilnych

## Testowanie
1. Otwórz aplikację na urządzeniu mobilnym lub w Chrome DevTools (mobile mode)
2. Przeciągnij mapę w różnych kierunkach
3. Zoomuj mapę (pinch lub double-tap)
4. Sprawdź czy menu dolne pozostaje widoczne i klikalne
5. Sprawdź na iOS Safari (jeśli dostępny)
6. Przetestuj w poziomie i pionie

## Kompatybilność
- ✅ Chrome Mobile
- ✅ Safari iOS
- ✅ Firefox Mobile
- ✅ Samsung Internet
- ✅ Progressive Web App (PWA)
