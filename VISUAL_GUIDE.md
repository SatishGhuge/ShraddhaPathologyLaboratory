# Visual Guide - Barcode Card Structure

## 📱 Current Barcode Card Display

### On Screen (Modal View)
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                              SPL ┃ ← Org Code (top-right)
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                 ┃
┃  ║║║║║║║║║║║║║║║║║║║║║║║║║║║║║  ┃
┃  ║║║║║║║║║║║║║║║║║║║║║║║║║║║║║  ┃ ← Barcode SVG (28px)
┃  ║║║║║║║║║║║║║║║║║║║║║║║║║║║║║  ┃
┃                                 ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃         20260614000              ┃ ← Visit ID (8px, centered, bold)
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃     25/06/2026 (Body Fluid)      ┃ ← Date & Specimen (6px)
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃             M/25Y                ┃ ← Age/Gender (6px) ✅ NEW!
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃     MR HARSHAD GAIKWAD           ┃ ← Patient Name (6px, bold)
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃   COMPLETE BLOOD COUNT           ┃ ← Test Names (6px, gray)
┃   URINE ROUTINE                  ┃
┃   LIVER FUNCTION TEST            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

Dimensions: 220px width × ~120px height (compact)
```

---

### Print Preview (Identical Layout)
```
Same exact structure as above when printed:
- All text sizes match
- All spacing matches
- All colors match (BLUE or RED border)
- Barcode size matches
- Organization code position matches
```

---

## 🎨 Color States

### BLUE Background (Selected or Printed)
```
┌─────────────────────────────────┐
│ BLUE BORDER (border-blue-600)   │
│ BLUE BACKGROUND (bg-blue-100)   │
│                                 │
│  Content (all visible)          │
│                                 │
└─────────────────────────────────┘

Meaning:
✓ Selected in modal (will print & update)
✓ Already printed in database (persistent)
```

### RED Background (Unselected or Unprinted)
```
┌─────────────────────────────────┐
│ RED BORDER (border-red-500)     │
│ RED BACKGROUND (bg-red-100)     │
│                                 │
│  Content (all visible)          │
│                                 │
└─────────────────────────────────┘

Meaning:
✗ Not selected in modal (print only)
✗ Not printed in database (unprinted)
```

---

## 📊 Age/Gender Format Examples

### What Gets Displayed
```
Patient Age: 25   Gender: Male     →  M/25Y
Patient Age: 32   Gender: Female   →  F/32Y
Patient Age: 8    Gender: Male     →  M/8Y
Patient Age: 65   Gender: Female   →  F/65Y
Patient Age: 18   Gender: Male     →  M/18Y
```

### Format Breakdown
```
M           ← First letter of Gender (M or F)
/           ← Separator
25          ← Age in years
Y           ← Year suffix
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result: M/25Y
```

---

## 🖨️ Print Layout - A4 Page

### Multiple Cards on One Page
```
┌────────────────────────────────────────────┐
│ Margin: 8mm                                │
│                                            │
│  ┏━━━━━━━━┓   Margin 6mm  ┏━━━━━━━━┓     │
│  ┃ Card 1 ┃                ┃ Card 2 ┃     │
│  ┃ 58mm   ┃                ┃ 58mm   ┃     │
│  ┗━━━━━━━━┛                ┗━━━━━━━━┛     │
│                                            │
│  Margin 6mm (vertical)                     │
│                                            │
│  ┏━━━━━━━━┓   Margin 6mm  ┏━━━━━━━━┓     │
│  ┃ Card 3 ┃                ┃ Card 4 ┃     │
│  ┃ 58mm   ┃                ┃ 58mm   ┃     │
│  ┗━━━━━━━━┛                ┗━━━━━━━━┛     │
│                                            │
│ Margin: 8mm                                │
└────────────────────────────────────────────┘

Result: ~3 cards per row, multiple rows
```

---

## 🔄 Modal Header

### Header Bar (While Selecting)
```
╔═══════════════════════════════════════════════╗
║ 📋 Barcode Labels — MR HARSHAD GAIKWAD | 20260614000
║                                    [2/2 selected]
║  [Print Only]  [Print & Update (2)]  [✕ Close]
╚═══════════════════════════════════════════════╝

Information shown:
- Patient name
- Visit ID
- Number selected / total
- Action buttons
```

---

## 📋 Complete Card with All Fields

### Full Visual Representation
```
┌─────────────────────────────────────────┐
│                                   SPL   │◄─ Org Code (6px, top-right)
├─────────────────────────────────────────┤
│   ║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║  │◄─ Barcode (28px height)
│   ║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║  │
│   ║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║  │
├─────────────────────────────────────────┤
│          20260614000                    │◄─ Visit ID (8px, bold, centered)
├─────────────────────────────────────────┤
│      25/06/2026 (Body Fluid)            │◄─ Date & Specimen (6px)
├─────────────────────────────────────────┤
│              M/25Y                      │◄─ Age/Gender (6px) ✅ NEW!
├─────────────────────────────────────────┤
│       MR HARSHAD GAIKWAD                │◄─ Patient Name (6px, bold)
├─────────────────────────────────────────┤
│    COMPLETE BLOOD COUNT                 │◄─ Test Names (6px, gray)
│    URINE ROUTINE ROUTINE                │
│    LIVER FUNCTION TEST                  │
└─────────────────────────────────────────┘

Card Size: 220px width × ~120px height
Padding: 3px all around
Border: 2px solid (color based on state)
```

---

## 🎯 Interaction Flow - Visual

### User Clicks Card
```
Initial State:              After Click:           After Click Again:
┌──────────────┐           ┌──────────────┐       ┌──────────────┐
│ RED Border   │    →      │ BLUE Border  │   →   │ RED Border   │
│ RED BG       │    Click  │ BLUE BG      │  Click│ RED BG       │
│              │           │              │       │              │
│ Content      │           │ Content      │       │ Content      │
│              │           │              │       │              │
└──────────────┘           └──────────────┘       └──────────────┘
(Unselected)               (Selected)             (Unselected)
```

---

## 🖨️ Print vs Modal Comparison

### Side-by-Side View
```
MODAL (Screen)              PRINT (Paper)
┌──────────────┐            ┌──────────────┐
│ 220px width  │            │ 58mm width   │
│              │            │ (≈ 220px)    │
│  [BARCODE]   │            │  [BARCODE]   │
│  20260614000 │      ≈      │  20260614000 │
│  Date (Spec) │     Same    │  Date (Spec) │
│  M/25Y       │    Layout   │  M/25Y       │
│  Patient     │            │  Patient     │
│  Tests       │            │  Tests       │
│              │            │              │
└──────────────┘            └──────────────┘

Result: Print looks exactly like modal!
```

---

## 🎨 Color Reference Card

### Quick Color Guide
```
┌─────────────────────────────────────────┐
│ BLUE (Selected or Printed)              │
│ ┌───────────────────────────────────┐   │
│ │ Border: #2563eb (blue-600)       │   │
│ │ Background: #dbeafe (blue-100)   │   │
│ │ Use: Printed barcodes or Selected│   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ RED (Unselected or Unprinted)           │
│ ┌───────────────────────────────────┐   │
│ │ Border: #ef4444 (red-500)        │   │
│ │ Background: #fee2e2 (red-100)    │   │
│ │ Use: Unprinted barcodes          │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 📱 Responsive View

### Desktop Screen View
```
┌─────────────────────────────────────────────┐
│  [Modal Header - 2/2 selected]              │
├─────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Card 1   │  │ Card 2   │  │ Card 3   │   │
│  │ 220px    │  │ 220px    │  │ 220px    │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│                                             │
│  ┌──────────┐  ┌──────────┐                │
│  │ Card 4   │  │ Card 5   │                │
│  │ 220px    │  │ 220px    │                │
│  └──────────┘  └──────────┘                │
│                                             │
│  [Print Only] [Print & Update (2)]         │
└─────────────────────────────────────────────┘
```

---

## 🎓 Component Hierarchy

### Nested Structure
```
BarcodeModal
├── Header
│   ├── Title with patient name
│   ├── Selection counter
│   └── Action buttons
├── Cards Container
│   ├── BarcodeCard 1
│   │   ├── Organization Code
│   │   ├── Barcode SVG
│   │   ├── Visit ID
│   │   ├── Date & Specimen
│   │   ├── Age/Gender ✅
│   │   ├── Patient Name
│   │   └── Test Names
│   ├── BarcodeCard 2
│   │   └── [Same structure]
│   ├── BarcodeCard 3
│   │   └── [Same structure]
│   └── ...more cards
└── Footer
    └── [Print buttons]
```

---

## 📊 Sizing Reference

### All Dimensions in One View
```
MODAL:
┌─ 220px ─┐
│         │ ← ~120px (depends on content)

PRINT:
├─ 58mm ─┤
│         │ ← ~120px (same relative size)

BARCODE HEIGHT: 28px (both modal & print)
PADDING: 3px (all sides, both)
BORDER: 2px (both)

FONT SIZES:
Org Code: 6px
Visit ID: 8px
Date/Specimen: 6px
Age/Gender: 6px
Patient Name: 6px
Test Names: 6px
```

---

## ✅ Verification Checklist

Use this to verify the barcode card is working correctly:

### Visual Elements
- [ ] Organization code visible in top-right corner
- [ ] Barcode SVG displays clearly
- [ ] Visit ID centered and bold
- [ ] Date shown with specimen type in parentheses
- [ ] **Age/Gender showing in M/25Y format** ✅
- [ ] Patient name in bold
- [ ] Test names visible (gray text)

### Colors
- [ ] Unprinted cards show RED border and background
- [ ] Selected cards show BLUE border and background
- [ ] Clicking changes color RED ↔ BLUE
- [ ] Print preview shows same colors

### Sizing
- [ ] Card width appropriate (220px modal / 58mm print)
- [ ] Card height compact (fits test tubes)
- [ ] All text readable
- [ ] No overlapping elements

### Print
- [ ] Print preview matches modal exactly
- [ ] Multiple cards fit on A4 page
- [ ] Spacing between cards consistent
- [ ] Colors print correctly

---

**Visual Guide Created:** June 17, 2026  
**Status:** ✅ COMPLETE  
**Use for:** Design verification and reference
