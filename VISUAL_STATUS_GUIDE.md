# Visual Status Workflow Guide - Color Reference

## 🎨 Color Palette Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SAMPLE STATUS WORKFLOW                        │
│                     (7 Stages, Color Coded)                      │
└─────────────────────────────────────────────────────────────────┘

  1️⃣               2️⃣               3️⃣               4️⃣
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│          │    │          │    │          │    │          │
│ Registered    Received      Entered      Validation
│ (GRAY)       (BLUE)         (YELLOW)     (PURPLE)
│ 📄 #9CA3AF  📦 #3B82F6    ✏️  #F59E0B    ✓ #8B5CF6
│ #F3F4F6      #EFF6FF       #FFFBEB      #F5F3FF
│  Awaiting     Sample        Results      Under
│  Sample       Received      Entered      Review
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      ↓
  5️⃣               6️⃣               7️⃣
┌──────────┐    ┌──────────┐    ┌──────────┐
│          │    │          │    │          │
│ Authorized   Delivered      Rectified
│ (GREEN)      (CYAN)         (RED)
│ 🛡️  #10B981 📤 #06B6D4   ⚠️  #EF4444
│ #ECFDF5      #ECFDFD       #FEF2F2
│ Approved     Report        Changes
│ & Ready      Sent          After
└──────────┘    └──────────┘    └──────────┘
```

---

## 📊 Detailed Color Specifications

### Stage 1: REGISTERED (Gray)
```
Status: Registered
Color Code: Gray #9CA3AF
Background: Light Gray #F3F4F6
Text: Dark Gray #374151
Icon: 📄 (Document)
Description: Patient registered, awaiting sample collection
Tailwind: bg-gray-100 text-gray-700 border-gray-300

[  📄  Registered  ]  <- Appears as gray badge
Awaiting sample collection

Progress: ━━━━━━━━━━━━━━ 0% Complete
Status: Initial state when test is created
Can Edit Results: ❌ No
```

---

### Stage 2: RECEIVED (Blue)
```
Status: Received
Color Code: Blue #3B82F6
Background: Light Blue #EFF6FF
Text: Dark Blue #1D4ED8
Icon: 📦 (Package)
Description: Sample has arrived at the lab
Tailwind: bg-blue-100 text-blue-700 border-blue-300

[  📦  Received  ]  <- Appears as blue badge
Sample received at lab

Progress: ━━━━━━━━━━━━━━ 14% Complete
Trigger: AUTOMATIC when barcode is printed
Can Print Multiple Times: ✅ Yes
Can Edit Results: ❌ No
```

---

### Stage 3: ENTERED (Yellow/Amber)
```
Status: Entered
Color Code: Amber #F59E0B
Background: Light Yellow #FFFBEB
Text: Dark Amber #D97706
Icon: ✏️ (Pencil/Edit)
Description: Test values have been entered into the system
Tailwind: bg-yellow-100 text-yellow-700 border-yellow-300

[  ✏️  Entered  ]  <- Appears as yellow badge
Results entered in system

Progress: ━━━━━━━━━━━━━━ 28% Complete
Trigger: AUTOMATIC when first result value is saved
Partial Entry: ✅ Allowed (even 1 of 5 values triggers transition)
Can Edit Results: ✅ YES - Can modify before next stage
```

---

### Stage 4: VALIDATION (Purple)
```
Status: Validation
Color Code: Purple #8B5CF6
Background: Light Purple #F5F3FF
Text: Dark Purple #6D28D9
Icon: ✓ (Checkmark)
Description: Lab technician is reviewing and validating results
Tailwind: bg-purple-100 text-purple-700 border-purple-300

[  ✓  Validation  ]  <- Appears as purple badge
Under validation by technician

Progress: ━━━━━━━━━━━━━━ 42% Complete
Trigger: MANUAL - Click "✓ Validate" button
Role: Lab Technician
Can Edit Results: ✅ YES - Can correct values if needed
Next Stage: Authorized
```

---

### Stage 5: AUTHORIZED (Green)
```
Status: Authorized
Color Code: Green #10B981
Background: Light Green #ECFDF5
Text: Dark Green #047857
Icon: 🛡️ (Shield)
Description: Senior technician has reviewed and approved results
Tailwind: bg-green-100 text-green-700 border-green-300

[  🛡️  Authorized  ]  <- Appears as green badge
Approved by senior technician

Progress: ━━━━━━━━━━━━━━ 56% Complete
Trigger: MANUAL - Click "✓ Authorize" button
Role: Senior Technician / Lab Manager
Can Edit Results: ✅ YES - Can edit before delivery
Next Stage: Delivered
```

---

### Stage 6: DELIVERED (Cyan)
```
Status: Delivered
Color Code: Cyan #06B6D4
Background: Light Cyan #ECFDFD
Text: Dark Cyan #0369A1
Icon: 📤 (Send/Upload)
Description: Report has been sent to patient or printed
Tailwind: bg-cyan-100 text-cyan-700 border-cyan-300

[  📤  Delivered  ]  <- Appears as cyan badge
Report delivered to patient

Progress: ━━━━━━━━━━━━━━ 70% Complete
Trigger: MANUAL - Click "📤 Mark as Delivered" button
Role: Lab Admin / Delivery Staff
Delivery Methods: Print, WhatsApp, Email
Can Edit Results: ✅ YES - Can edit if issues found
If Changes: Moves to "Rectified" stage
```

---

### Stage 7: RECTIFIED (Red)
```
Status: Rectified
Color Code: Red #EF4444
Background: Light Red #FEF2F2
Text: Dark Red #B91C1C
Icon: ⚠️ (Alert)
Description: Changes have been made to report after delivery
Tailwind: bg-red-100 text-red-700 border-red-300

[  ⚠️  Rectified  ]  <- Appears as red badge
Changes made after delivery

Progress: ━━━━━━━━━━━━━━ 85% Complete
Trigger: MANUAL - Click "⚠️ Rectify" button (after Delivered)
Role: Senior Technician / Lab Manager
Reason: To correct errors found after initial delivery
Can Edit Results: ✅ YES - REQUIRED to make corrections
Next Stage: Authorized → Delivered (loop back for revalidation)
```

---

## 📈 Complete Workflow Timeline

```
Day 1: Registration
│
├─ 10:00 AM
│  └─ Patient Registration Complete
│     Status: [  📄  Registered  ]  (Gray)
│     └─ "Awaiting sample collection"
│
├─ 11:00 AM  
│  └─ Barcode Printed in Lab
│     Status: [  📄  Registered  ] → [  📦  Received  ]  (Auto-transition)
│     └─ "Sample received at lab"
│
Day 2: Sample Processing
│
├─ 2:00 PM
│  └─ Blood Test Results Entered
│     Status: [  📦  Received  ] → [  ✏️  Entered  ]  (Auto-transition)
│     └─ "Results entered in system"
│
├─ 3:00 PM
│  └─ Click "✓ Validate" Button
│     Status: [  ✏️  Entered  ] → [  ✓  Validation  ]  (Manual)
│     └─ "Under validation by technician"
│
├─ 4:00 PM
│  └─ Click "✓ Authorize" Button
│     Status: [  ✓  Validation  ] → [  🛡️  Authorized  ]  (Manual)
│     └─ "Approved by senior technician"
│
├─ 5:00 PM
│  └─ Click "📤 Mark Delivered" Button
│     Status: [  🛡️  Authorized  ] → [  📤  Delivered  ]  (Manual)
│     └─ "Report sent via WhatsApp"
│
Day 3: Issue Found
│
└─ 9:00 AM
   └─ Doctor Reports Error, Click "⚠️ Rectify"
      Status: [  📤  Delivered  ] → [  ⚠️  Rectified  ]  (Manual)
      └─ Edit Value & Re-authorize
      └─ Status: [  ⚠️  Rectified  ] → [  🛡️  Authorized  ] → [  📤  Delivered  ]
```

---

## 🎯 Quick Reference: Color by Stage Number

| # | Stage | Hex Color | Light Hex | Tailwind | Icon | Progress |
|---|-------|-----------|-----------|----------|------|----------|
| 1 | Registered | #9CA3AF | #F3F4F6 | gray | 📄 | 0% |
| 2 | Received | #3B82F6 | #EFF6FF | blue | 📦 | 14% |
| 3 | Entered | #F59E0B | #FFFBEB | amber | ✏️ | 28% |
| 4 | Validation | #8B5CF6 | #F5F3FF | purple | ✓ | 42% |
| 5 | Authorized | #10B981 | #ECFDF5 | green | 🛡️ | 56% |
| 6 | Delivered | #06B6D4 | #ECFDFD | cyan | 📤 | 70% |
| 7 | Rectified | #EF4444 | #FEF2F2 | red | ⚠️ | 85% |

---

## 🎨 CSS Class Reference

### Status Badge (Small)
```jsx
<span className="px-3 py-1.5 text-sm font-medium rounded bg-blue-100 text-blue-700">
  📦 Received
</span>
```

### Status Pill (Rounded)
```jsx
<span className="px-4 py-2 text-sm font-medium rounded-full bg-green-100 text-green-700">
  🛡️ Authorized
</span>
```

### Status Card (Large)
```jsx
<div className="bg-yellow-100 border-l-4 border-yellow-300 p-4 rounded">
  <h3 className="text-yellow-700 font-bold text-lg">✏️ Entered</h3>
  <p className="text-yellow-600 text-sm">Results entered in system</p>
</div>
```

### Status Badge with Background
```jsx
<div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded">
    ✓ Validation
  </span>
</div>
```

---

## 🎬 Status Transitions Visual

```
Manual Transitions (User Clicks Button):
─────────────────────────────────────────

Entered ──────→ Validation ──────→ Authorized ──────→ Delivered
  ✏️              ✓ Click            🛡️ Click           📤 Click
  Yellow         "Validate"         "Authorize"        "Deliver"
                  Button             Button             Button
                                                            ↓
                                                        Delivered
                                                          📤
                                                          Cyan
                                                            ↓
                                                      (If changes needed)
                                                            ↓
                                                        Rectified
                                                          ⚠️
                                                          Red
                                                            ↓
                                                    (Re-authorize & Re-deliver)
                                                            ↓
                                                        Authorized → Delivered
                                                      🛡️ Cyan (Loop back)


Automatic Transitions (No User Action):
────────────────────────────────────────

Registered ────→ Received ────→ Entered
  📄 Gray         📦 Blue         ✏️ Yellow
  (auto on        (auto on first
  barcode print)  result saved)
```

---

## 💾 Database Status Values

All status values stored in database:
```sql
-- Valid values in PatientTest.status column:
"Registered"   -- Stage 1 (Gray)
"Received"     -- Stage 2 (Blue)
"Entered"      -- Stage 3 (Yellow)
"Validation"   -- Stage 4 (Purple)
"Authorized"   -- Stage 5 (Green)
"Delivered"    -- Stage 6 (Cyan)
"Rectified"    -- Stage 7 (Red)
```

---

## 🔐 Role-Based Status Permissions

```
┌──────────────────┬──────────┬────────┬──────────┬───────────┐
│ Stage            │ Lab Tech │ Senior │ Admin    │ Can Edit  │
├──────────────────┼──────────┼────────┼──────────┼───────────┤
│ Registered       │ View     │ View   │ View     │ ❌ No     │
│ Received         │ View     │ View   │ View     │ ❌ No     │
│ Entered          │ ✏️Edit  │ ✏️Edit │ ✏️Edit  │ ✅ Yes    │
│ Validation       │ ✓ Move   │ ✓ View │ ✓ View   │ ✅ Yes    │
│ Authorized       │ ❌ View  │ ✓ Move │ ✓ Move   │ ✅ Yes    │
│ Delivered        │ ❌ View  │ ✓ Move │ ✓ Move   │ ✅ Yes    │
│ Rectified        │ ❌ View  │ ✓ Move │ ✓ Move   │ ✅ Yes    │
└──────────────────┴──────────┴────────┴──────────┴───────────┘
```

---

## 🧪 Testing Color Display

### Test Case 1: View All Status Colors
1. Create 7 different tests
2. Set each to a different status
3. Verify colors display correctly in list

### Test Case 2: Color Changes on Status Update
1. Create a test (Gray - Registered)
2. Print barcode
3. Verify color changes to Blue (Received)
4. Save result
5. Verify color changes to Yellow (Entered)

### Test Case 3: Color Consistency Across Pages
1. View test on Results List → Check color
2. Open test detail page → Check color matches
3. Print report → Check color in print preview
4. View status history → Check colors in timeline

---

## 📝 Implementation Checklist

- [ ] Add STATUS_COLORS export to frontend
- [ ] Create StatusBadge component with color prop
- [ ] Create StatusCard component for large displays
- [ ] Create StatusTimeline component with progress bar
- [ ] Create StatusSummaryDashboard component
- [ ] Update Results List page to show colored badges
- [ ] Update Result Detail page to show status card
- [ ] Add status history viewer with timeline
- [ ] Add transition buttons with status change animations
- [ ] Update barcode print handlers to trigger auto-transitions
- [ ] Add status change notifications
- [ ] Test all colors in light/dark modes (if applicable)

---

## 🎨 Tailwind Color Mapping

For `tailwind.config.ts`:
```javascript
theme: {
  extend: {
    colors: {
      workflow: {
        registered: '#9CA3AF',
        received: '#3B82F6',
        entered: '#F59E0B',
        validation: '#8B5CF6',
        authorized: '#10B981',
        delivered: '#06B6D4',
        rectified: '#EF4444'
      }
    }
  }
}
```

Usage:
```jsx
<div className="bg-workflow-authorized text-white">
  Authorized Status
</div>
```

---

**Ready for Frontend Integration!** 🚀
