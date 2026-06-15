# Sample Status Workflow - Complete Guide

## 📋 Workflow Stages

### 1️⃣ **Registered** (Gray #9CA3AF)
- **When**: Patient registered, tests selected
- **Trigger**: Automatic when patient is created
- **What Happens**: Test is created in system, awaiting physical sample collection
- **Who Can Act**: Lab Reception
- **Can Edit Results**: ❌ No
- **Next Stage**: Received (automatic via barcode print)
- **Color Code**: `#9CA3AF` / `#F3F4F6`

---

### 2️⃣ **Received** (Blue #3B82F6)
- **When**: Physical sample arrives at lab
- **Trigger**: ⚡ AUTOMATIC when barcode is printed from:
  - Patient Registration page
  - Search for Test page
  - Result page
- **What Happens**: Sample checked in, prepared for testing
- **Who Can Act**: Lab Collection Staff
- **Can Edit Results**: ❌ No
- **Next Stage**: Entered (automatic when first result value entered)
- **Color Code**: `#3B82F6` / `#EFF6FF`
- **Note**: Can print barcode multiple times without changing stage once in "Received"

---

### 3️⃣ **Entered** (Yellow/Amber #F59E0B)
- **When**: Test values are entered
- **Trigger**: ⚡ AUTOMATIC when first result value is saved
- **What Happens**: Test results entered by data entry staff or machine integration
- **Who Can Act**: Data Entry Staff, Lab Technician
- **Can Edit Results**: ✅ YES - Can modify values at this stage
- **Next Stage**: Validation (manual button click)
- **Color Code**: `#F59E0B` / `#FFFBEB`

---

### 4️⃣ **Validation** (Purple #8B5CF6)
- **When**: Lab Technician reviews results
- **Trigger**: 👤 MANUAL - Click "Move to Validation" button
- **What Happens**: Technician checks results against normal ranges, verifies quality
- **Who Can Act**: Lab Technician
- **Can Edit Results**: ✅ YES - Can correct values if needed
- **Next Stage**: Authorized (manual button click)
- **Color Code**: `#8B5CF6` / `#F5F3FF`

---

### 5️⃣ **Authorized** (Green #10B981)
- **When**: Senior Technician approves results
- **Trigger**: 👤 MANUAL - Click "Move to Authorized" button
- **What Happens**: Senior tech reviews and approves the test results
- **Who Can Act**: Senior Technician, Lab Manager
- **Can Edit Results**: ✅ YES - Can edit if needed before approval
- **Next Stage**: Delivered (manual button click)
- **Color Code**: `#10B981` / `#ECFDF5`

---

### 6️⃣ **Delivered** (Cyan #06B6D4)
- **When**: Report is sent or printed
- **Trigger**: 👤 MANUAL - Click "Mark as Delivered" button
- **What Happens**: Report generated and sent to patient/doctor via print or WhatsApp/Email
- **Who Can Act**: Lab Admin, Report Delivery Staff
- **Can Edit Results**: ✅ YES - Can still edit if needed (will trigger Rectified)
- **Next Stage**: Rectified (if changes needed after delivery)
- **Color Code**: `#06B6D4` / `#ECFDFD`

---

### 7️⃣ **Rectified** (Red #EF4444)
- **When**: Changes made after report delivery
- **Trigger**: 👤 MANUAL - Click "Rectify" button when changes needed
- **What Happens**: Report is recalled, changes made, reauthorization process
- **Who Can Act**: Senior Technician, Lab Manager
- **Can Edit Results**: ✅ YES - Can edit values at this stage
- **Next Stage**: Authorized → Delivered (loop back for re-validation)
- **Color Code**: `#EF4444` / `#FEF2F2`
- **Note**: After editing in Rectified, should move back to Authorized then Delivered

---

## 🔄 Complete Workflow Example

```
Day 1 - Registration
├─ 10:00 AM: Patient registers for tests
│  └─ Status: Registered (Gray)
│     └─ "Please submit sample"

├─ 11:00 AM: Lab prints barcode (Registered → Received AUTO)
│  └─ Status: Received (Blue)
│     └─ "Sample received, awaiting processing"

Day 2 - Sample Processing
├─ 2:00 PM: Enter blood sugar result = 120 mg/dL (Received → Entered AUTO)
│  └─ Status: Entered (Yellow)
│     └─ "All values entered, awaiting validation"

├─ 3:00 PM: Lab Tech validates (can edit if needed)
│  └─ Click "Move to Validation" button
│  └─ Status: Validation (Purple)
│     └─ "Validated by Lab Technician"

├─ 4:00 PM: Senior Tech authorizes (can edit if needed)
│  └─ Click "Move to Authorized" button
│  └─ Status: Authorized (Green)
│     └─ "Approved by Senior Technician"

├─ 5:00 PM: Report delivered via WhatsApp
│  └─ Click "Mark as Delivered" button
│  └─ Status: Delivered (Cyan)
│     └─ "Report sent to patient"

Day 3 - If changes needed
├─ Next morning: Doctor says result is wrong
│  └─ Click "Rectify" button
│  └─ Status: Rectified (Red)
│  └─ Edit value from 120 to 105 mg/dL
│  
├─ Then: Re-authorize
│  └─ Click "Move to Authorized" button
│  └─ Status: Authorized (Green)
│  
├─ Finally: Redelivery
│  └─ Click "Mark as Delivered" button
│  └─ Status: Delivered (Cyan)
│     └─ "Corrected report sent to patient"
```

---

## 🎨 Color Scheme for UI Display

### Status Badge Colors
```javascript
{
  'Registered': { 
    bgColor: '#F3F4F6',    // Light Gray bg
    textColor: '#9CA3AF',  // Gray text
    icon: '📄'
  },
  'Received': { 
    bgColor: '#EFF6FF',    // Light Blue bg
    textColor: '#3B82F6',  // Blue text
    icon: '📦'
  },
  'Entered': { 
    bgColor: '#FFFBEB',    // Light Yellow bg
    textColor: '#F59E0B',  // Yellow text
    icon: '✏️'
  },
  'Validation': { 
    bgColor: '#F5F3FF',    // Light Purple bg
    textColor: '#8B5CF6',  // Purple text
    icon: '✓'
  },
  'Authorized': { 
    bgColor: '#ECFDF5',    // Light Green bg
    textColor: '#10B981',  // Green text
    icon: '🛡️'
  },
  'Delivered': { 
    bgColor: '#ECFDFD',    // Light Cyan bg
    textColor: '#06B6D4',  // Cyan text
    icon: '📤'
  },
  'Rectified': { 
    bgColor: '#FEF2F2',    // Light Red bg
    textColor: '#EF4444',  // Red text
    icon: '⚠️'
  }
}
```

---

## 🔐 Auto-Transitions (No User Action Needed)

### Transition 1: Registered → Received
**Trigger**: When barcode is printed
**From**: Any page (registration, search, results)
**Automatic**: Yes ✅
**Can Print Multiple Times**: Yes ✅

```
PRINT BARCODE (1st time) → Registered → Received ✅
PRINT BARCODE (2nd time) → Already Received (no change)
PRINT BARCODE (3rd time) → Already Received (no change)
```

### Transition 2: Received → Entered
**Trigger**: When first test result value is entered and saved
**From**: Result entry page
**Automatic**: Yes ✅
**When Result is Partial**: Yes ✅ (even if only 1 value out of 5 entered)

```
Save Result (1st value) → Received → Entered ✅
Save Result (2nd value) → Already Entered (no change)
```

---

## 👤 Manual Stage Transitions (Button Click)

| From | To | Role | Button Text | Edit Allowed |
|------|-----|------|------------|--------------|
| Entered | Validation | Lab Technician | "✓ Validate" | ✅ Before moving |
| Validation | Authorized | Senior Tech | "✓ Authorize" | ✅ Before moving |
| Authorized | Delivered | Admin/Delivery | "📤 Mark Delivered" | ✅ Can edit |
| Delivered | Rectified | Senior Tech | "⚠️ Rectify Changes" | ✅ Required to edit |
| Rectified | Authorized | Senior Tech | "✓ Re-Authorize" | ✅ After editing |

---

## ✏️ Result Editing Rules

### Where Can You Edit?
- **Entered**: ✅ Can edit (before validation)
- **Validation**: ✅ Can edit (tech corrections)
- **Authorized**: ✅ Can edit (senior review)
- **Delivered**: ✅ Can edit (if rectifying)
- **Rectified**: ✅ Can edit (required step)

### Where Can't You Edit?
- **Registered**: ❌ No results to edit yet
- **Received**: ❌ Results not yet entered

---

## 📊 Database Schema

### PatientTest Changes
```
OLD:                          NEW:
status: "REGISTERED"          status: "Registered"
                             lastUpdatedBy: "john_doe"
                             lastStatusUpdateAt: 2026-06-08T14:30:00Z
```

### New TestStatusHistory Table
Tracks every status change:
```
id: 1
patientTestId: 123
previousStatus: "Received"
newStatus: "Entered"
changedBy: "data_entry_user"
changedAt: 2026-06-08T14:30:00Z
triggerType: "AUTO"  // or "MANUAL" or "SYSTEM"
remarks: "Auto-transitioned when first result value entered"
```

---

## 🔄 API Endpoints

### Update Test Status (Manual)
```
PUT /api/results/:id/status
Body: {
  status: "Validation",
  remarks: "Initial validation completed"
}
Response: { status: "Validation", lastUpdatedAt: "..." }
```

### Auto-Transition (Barcode Print)
```
POST /api/results/:id/auto-transition/barcode-printed
Response: { status: "Received", trigger: "AUTO" }
```

### Get Status History
```
GET /api/results/:id/status-history
Response: [
  { previousStatus: "Registered", newStatus: "Received", changedAt: "...", triggerType: "AUTO" },
  { previousStatus: "Received", newStatus: "Entered", changedAt: "...", triggerType: "AUTO" }
]
```

### Get Status Summary
```
GET /api/results/status/summary
Response: {
  "Registered": 5,
  "Received": 12,
  "Entered": 8,
  "Validation": 3,
  "Authorized": 2,
  "Delivered": 45,
  "Rectified": 1
}
```

---

## ⚙️ User Roles & Permissions

| Role | Can Transition To | Can Edit | Can Rectify |
|------|-------------------|----------|------------|
| Lab Reception | Registered (auto) | - | ❌ |
| Lab Collection | Received (auto) | - | ❌ |
| Data Entry | Entered (auto) | ✅ | ❌ |
| Lab Technician | Validation | ✅ | ❌ |
| Senior Technician | Authorized | ✅ | ✅ |
| Lab Manager | Any | ✅ | ✅ |
| Admin | Any | ✅ | ✅ |

---

## 🧪 Testing the Workflow

### Test Case 1: Full Happy Path
1. Register patient → Status: Registered
2. Print barcode → Auto to Received
3. Enter 1 result value → Auto to Entered
4. Click Validate → Status: Validation
5. Click Authorize → Status: Authorized
6. Click Delivered → Status: Delivered

### Test Case 2: Editing During Validation
1. Follow Test Case 1 through Entered
2. Click Validate → Status: Validation
3. Edit result value in UI
4. Click Authorize → Status: Authorized
5. Verify edited value is preserved

### Test Case 3: Rectification
1. Follow Test Case 1 through Delivered
2. Click Rectify → Status: Rectified
3. Edit result value
4. Click "Re-Authorize" → Status: Authorized
5. Click Delivered → Status: Delivered (with new values)

---

## 📝 Implementation Checklist

- [x] Database schema updated (PatientTest + TestStatusHistory)
- [x] Backend utility functions created (statusWorkflow.js)
- [x] Migration file created
- [ ] Result controller updated for auto-transitions
- [ ] API endpoints for status updates created
- [ ] Frontend: Add status badges with color codes
- [ ] Frontend: Add transition buttons
- [ ] Frontend: Add status history viewer
- [ ] Frontend: Update barcode print handlers
- [ ] Frontend: Update result save handlers
- [ ] Role-based permission checks
- [ ] Testing and QA
