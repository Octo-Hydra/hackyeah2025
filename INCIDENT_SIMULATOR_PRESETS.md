# 🧪 Incident Simulator - Quick Presets Implementation

## Overview

Added intelligent quick presets to the incident simulator that automatically select appropriate lines based on transport type and scenario.

## Quick Presets Configuration

### 1. 🚌 Opóźnienie autobusu

```typescript
{
  title: "Opóźnienie autobusu o 15 minut",
  description: "Autobus opóźniony z powodu zwiększonego ruchu",
  kind: "VEHICLE_FAILURE",
  delayMinutes: "15",
  transportType: "BUS",
  lineCount: 2  // Auto-selects first 2 bus lines
}
```

**Use case:** Testing minor bus delays affecting multiple routes

---

### 2. 🚆 Opóźnienie pociągu

```typescript
{
  title: "Opóźnienie pociągu o 20 minut",
  description: "Pociąg opóźniony z powodu awarii sygnalizacji",
  kind: "NETWORK_FAILURE",
  delayMinutes: "20",
  transportType: "RAIL",
  lineCount: 1  // Auto-selects first rail/tram line
}
```

**Use case:** Testing single train/tram line infrastructure issues

---

### 3. 💥 Wypadek na trasie

```typescript
{
  title: "Wypadek - trasa objazdowa",
  description: "Pojazd porusza się trasą objazdową",
  kind: "ACCIDENT",
  delayMinutes: "30",
  transportType: "BUS",
  lineCount: 1  // Auto-selects first bus line
}
```

**Use case:** Testing accident scenarios with detours

---

### 4. 🚗 Korek tramwajowy

```typescript
{
  title: "Korek na trasie tramwajowej",
  description: "Zwiększony ruch - tramwaje opóźnione",
  kind: "TRAFFIC_JAM",
  delayMinutes: "10",
  transportType: "RAIL",
  lineCount: 3  // Auto-selects first 3 rail lines
}
```

**Use case:** Testing traffic congestion affecting multiple tram lines

---

### 5. 🔧 Awaria infrastruktury

```typescript
{
  title: "Awaria sieci trakcyjnej",
  description: "Problemy z infrastrukturą - ruch wstrzymany",
  kind: "NETWORK_FAILURE",
  delayMinutes: "45",
  transportType: "RAIL",
  lineCount: 2  // Auto-selects first 2 rail lines
}
```

**Use case:** Testing major infrastructure failures with long delays

---

## How It Works

### Preset Application Logic

```typescript
const applyPreset = (preset) => {
  // 1. Fill form fields
  setTitle(preset.title);
  setDescription(preset.description);
  setKind(preset.kind);
  setDelayMinutes(preset.delayMinutes);

  // 2. Filter lines by transport type
  const linesOfType = lines.filter(
    (line) => line.transportType === preset.transportType
  );

  // 3. Select first N lines (N = lineCount)
  const linesToSelect = linesOfType.slice(0, preset.lineCount);
  setSelectedLines(linesToSelect);

  // 4. Update transport filter
  setTransportFilter(preset.transportType);

  // 5. Show success notification
  toast.success("Preset zastosowany!", {
    description: `Wybrano ${linesToSelect.length} linii`,
  });
};
```

### Selection Strategy

- **BUS presets** → Automatically filter and select bus lines
- **RAIL presets** → Automatically filter and select rail/tram lines
- **lineCount** → Determines how many lines to auto-select (1-3)
- **Transport filter** → Automatically set to match preset type

### UI Features

- ✅ 5 preset buttons in a flex-wrap layout
- ✅ Emoji icons for visual identification
- ✅ Disabled state during loading/submitting
- ✅ Toast notification on successful preset application
- ✅ Help text: "Presety automatycznie wybierają odpowiednie linie"

## Testing Scenarios

### Scenario 1: Bus Delay (Multiple Lines)

1. Click "🚌 Opóźnienie autobusu"
2. **Result:**
   - Form filled with bus delay details
   - First 2 bus lines automatically selected
   - Transport filter set to "BUS"
   - Badge display shows selected bus lines

### Scenario 2: Train Infrastructure Failure

1. Click "🔧 Awaria infrastruktury"
2. **Result:**
   - Form filled with network failure details
   - First 2 rail lines automatically selected
   - Transport filter set to "RAIL"
   - 45-minute delay pre-filled

### Scenario 3: Traffic Jam (Multiple Trams)

1. Click "🚗 Korek tramwajowy"
2. **Result:**
   - Form filled with traffic jam details
   - First 3 rail lines automatically selected
   - 10-minute delay pre-filled

## Benefits

### For Developers

- **Fast Testing** - One click to populate entire form
- **Realistic Scenarios** - Pre-configured with appropriate delays and descriptions
- **Type Safety** - Transport type filtering ensures correct line selection

### For Testers

- **Quick WebSocket Testing** - Rapidly create incidents for different line types
- **Scenario Consistency** - Standardized test cases
- **Multi-Line Testing** - Easy to test broadcast to multiple lines

### For Admins

- **Training Tool** - Learn incident types and appropriate delays
- **Quick Incident Creation** - Speed up manual incident reporting

## Implementation Details

### State Management

```typescript
// Preset modifies these states:
setTitle(); // Incident title
setDescription(); // Incident description
setKind(); // Incident type (VEHICLE_FAILURE, ACCIDENT, etc.)
setDelayMinutes(); // Delay duration
setSelectedLines(); // Array of Line objects
setTransportFilter(); // "BUS" or "RAIL"
```

### Line Selection Algorithm

```typescript
// Step 1: Filter all lines by transport type
const linesOfType = lines.filter(
  (line) => line.transportType === preset.transportType
);

// Step 2: Take first N lines (prevents selecting too many)
const linesToSelect = linesOfType.slice(0, preset.lineCount);

// Step 3: Set as selected (triggers badge display)
setSelectedLines(linesToSelect);
```

### Error Handling

- **No lines available**: Preset still fills form, just no lines selected
- **Fewer lines than lineCount**: Selects all available lines (e.g., only 1 bus exists but preset wants 2)
- **Loading state**: Presets disabled during line fetch
- **Submitting state**: Presets disabled during form submission

## Future Enhancements

### Possible Additions

1. **Custom Presets** - Allow users to save their own presets
2. **Random Line Selection** - Select random lines instead of first N
3. **Time-based Presets** - Morning rush hour vs. evening scenarios
4. **Severity Levels** - Minor/Medium/Critical presets with appropriate delays
5. **Multi-Transport Presets** - Select both BUS and RAIL lines

### Configuration Options

```typescript
{
  name: "Rush Hour Chaos",
  title: "Multiple delays - rush hour",
  kind: "TRAFFIC_JAM",
  delayMinutes: "20",
  transportTypes: ["BUS", "RAIL"],  // Both types
  lineCountPerType: { BUS: 3, RAIL: 2 },  // Different counts
  timeRestriction: "07:00-09:00"  // Only show in morning
}
```

## Testing Checklist

- [ ] All 5 presets apply correctly
- [ ] Line badges display after preset selection
- [ ] Transport filter updates to match preset
- [ ] Form validation still works after preset
- [ ] Can remove auto-selected lines manually
- [ ] Can add more lines after preset
- [ ] Presets work with empty line database (graceful degradation)
- [ ] Toast notifications appear
- [ ] Submit button enables after preset
- [ ] WebSocket broadcast works for preset-selected lines

## Code Location

**File:** `src/components/incident-simulator.tsx`

**Key Sections:**

- Lines 196-244: Preset configuration array
- Lines 246-273: `applyPreset()` function
- Lines 285-302: Preset buttons UI
