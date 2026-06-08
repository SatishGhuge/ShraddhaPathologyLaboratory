# Status Workflow Update Plan for frontend/app/result/page.tsx

## Overview
Replace 5-stage status workflow with 7-stage workflow with new colors and labels.

### Mapping:
**Old Status** → **New Status** | **Color**
- REGISTERED → Registered | Gray #9CA3AF
- RECEIVED → Received | Blue #3B82F6
- PROVISIONAL → Entered | Amber #F59E0B
- AUTHENTICATED → Validation | Purple #8B5CF6
- DELIVERED → Authorized | Green #10B981
- (NEW) → Delivered | Cyan #06B6D4
- (NEW) → Rectified | Red #EF4444

---

## Changes Required

### 1. Update Statistics Object (Lines 299-307)
**Location:** `const [statistics, setStatistics] = useState({...})`

**Current:**
```javascript
const [statistics, setStatistics] = useState({
  total: 0,
  byStatus: {
    REGISTERED: 0,
    RECEIVED: 0,
    PROVISIONAL: 0,
    AUTHENTICATED: 0,
    DELIVERED: 0
  }
});
```

**New:**
```javascript
const [statistics, setStatistics] = useState({
  total: 0,
  byStatus: {
    Registered: 0,
    Received: 0,
    Entered: 0,
    Validation: 0,
    Authorized: 0,
    Delivered: 0,
    Rectified: 0
  }
});
```

---

### 2. Update getStatusBadgeColor Function (Lines 1373-1388)
**Location:** `const getStatusBadgeColor = (status: any) => {...}`

**Current:**
```javascript
const getStatusBadgeColor = (status: any) => {
  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case "REGISTERED":
      return "bg-primary-100 text-primary-800";
    case "RECEIVED":
      return "bg-secondary-100 text-secondary-800";
    case "PROVISIONAL":
      return "bg-pink-100 text-pink-800";
    case "AUTHENTICATED":
      return "bg-purple-100 text-purple-800";
    case "DELIVERED":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
```

**New:** (Using inline colors since these don't match standard Tailwind)
```javascript
const getStatusBadgeColor = (status: any) => {
  switch (status) {
    case "Registered":
      return "bg-gray-100 text-gray-800";
    case "Received":
      return "bg-blue-100 text-blue-800";
    case "Entered":
      return "bg-amber-100 text-amber-800";
    case "Validation":
      return "bg-violet-100 text-violet-800";
    case "Authorized":
      return "bg-emerald-100 text-emerald-800";
    case "Delivered":
      return "bg-cyan-100 text-cyan-800";
    case "Rectified":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
```

---

### 3. Update Status Cards (Lines 1546-1596)
**Location:** Grid with 5 cards that show status cards and counts

**Current:** 5 cards (Registered, Received, Provisional, Authenticated, Delivered)

**New:** 7 cards with updated names, colors, and grid layout

Cards to add:
1. **Registered** - Gray (using `bg-gray-200` / `bg-gray-100` for selected/unselected)
2. **Received** - Blue
3. **Entered** - Amber
4. **Validation** - Violet
5. **Authorized** - Emerald/Green
6. **Delivered** - Cyan
7. **Rectified** - Red

Change from `grid-cols-5` to `grid-cols-7` or use `grid-cols-3 md:grid-cols-7`

---

### 4. Update Filter Dropdown (Lines 1608-1613)
**Location:** First status filter select in top filter bar

**Current Options:**
- All
- REGISTERED
- RECEIVED
- PROVISIONAL
- AUTHENTICATED
- DELIVERED

**New Options:**
- All
- Registered
- Received
- Entered
- Validation
- Authorized
- Delivered
- Rectified

---

### 5. Update Status Column Dropdown (Lines 1678-1682)
**Location:** Status filter dropdown in second location

Same as #4 - update options to match new statuses

---

## Color Mapping (Tailwind)

| Status | Old Color | New Color | Hex | Tailwind Class |
|--------|-----------|-----------|-----|---|
| Registered | primary | Gray | #9CA3AF | bg-gray-400 text-gray-900 / bg-gray-100 text-gray-800 |
| Received | secondary | Blue | #3B82F6 | bg-blue-100 text-blue-800 |
| Entered | pink | Amber | #F59E0B | bg-amber-100 text-amber-800 |
| Validation | purple | Purple | #8B5CF6 | bg-violet-100 text-violet-800 |
| Authorized | green | Green | #10B981 | bg-emerald-100 text-emerald-800 |
| Delivered | green (new) | Cyan | #06B6D4 | bg-cyan-100 text-cyan-800 |
| Rectified | (new) | Red | #EF4444 | bg-red-100 text-red-800 |

---

## Status Values to Search & Replace

Search for uppercase status strings and replace with new ones:
- `"REGISTERED"` → `"Registered"`
- `"RECEIVED"` → `"Received"`
- `"PROVISIONAL"` → `"Entered"` (maps to Provisional)
- `"AUTHENTICATED"` → `"Validation"` (maps to Authenticated)
- `"DELIVERED"` → `"Authorized"` (NEW intermediate stage)
- Add `"Delivered"` and `"Rectified"` handling

**Note:** May need to search for:
- Case-insensitive variations
- References in comments
- Filter logic
- Status comparisons
- API calls

---

## Implementation Strategy

1. ✅ Update statistics object with new status keys
2. ✅ Update getStatusBadgeColor function with case statements for all 7 statuses
3. ✅ Update status cards (line 1546-1596) with 7 cards and new colors
4. ✅ Update filter dropdowns (lines 1608-1613 and 1678-1682)
5. ⚠️ Search for other references to old statuses that may need updating:
   - API calls
   - Filter logic
   - Status comparisons
   - Comments

---

## Testing Checklist

- [ ] All 7 status cards display correctly
- [ ] Colors match design specs
- [ ] Filter dropdowns show all 7 new statuses
- [ ] Statistics count correctly
- [ ] Table status column displays correct colors
- [ ] No console errors
- [ ] Responsive design works on mobile (grid layout)

---

## Line Ranges Summary

| Section | Start Line | End Line | Component |
|---------|-----------|----------|-----------|
| Statistics Object | 299 | 307 | State initialization |
| getStatusBadgeColor Function | 1373 | 1388 | Color logic |
| Status Cards | 1546 | 1596 | UI grid cards |
| Filter Dropdown 1 | 1608 | 1613 | Top filter bar |
| Status Dropdown 2 | 1678 | 1682 | Additional filter |
