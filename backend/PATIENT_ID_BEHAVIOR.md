# Patient ID Generation & Existing Patient Detection

## Overview
The system intelligently distinguishes between NEW patients and EXISTING patients during registration.

## Patient Matching Logic

### How the System Identifies Existing Patients
When you register a patient, the system checks if a patient **with the same first name AND mobile number** already exists in the database.

**Match Criteria:**
- First Name (case-insensitive comparison)
- Last Name (if provided)
- Mobile Number (exact match)

### Examples

#### ✅ Example 1: Same Patient = EXISTING PATIENT
```
Registration 1:
- Name: MALHAR KUSER
- Mobile: 7876787878
- Result: New Patient Created → ID: P960620001 (old format) or S260600001 (new format)

Registration 2: Same person with same info
- Name: MALHAR KUSER  
- Mobile: 7876787878
- Result: EXISTING PATIENT DETECTED
  - Patient ID: REUSES the same ID
  - New Visit ID: Generated (e.g., 2606080002 for 2nd visit same day)
  - Action: Adds new tests as a new visit
```

#### ✅ Example 2: Different Patient = NEW PATIENT
```
Registration 1:
- Name: MALHAR KUSER
- Mobile: 7876787878
- Result: Patient ID → S260600001

Registration 2: Different person
- Name: RAJESH SHARMA
- Mobile: 9876543210  (different mobile!)
- Result: NEW PATIENT CREATED
  - New Patient ID: S260600002 (next sequential)
  - New Visit ID: Generated (e.g., 2606080001)
```

#### ✅ Example 3: Same Name, Different Mobile = NEW PATIENT
```
Registration 1:
- Name: RAJESH
- Mobile: 9876543210
- Result: Patient ID → S260600001

Registration 2: Same name, different mobile
- Name: RAJESH
- Mobile: 9999999999  (different mobile!)
- Result: NEW PATIENT CREATED
  - Reason: Different mobile means it's a different person
  - New Patient ID: S260600002
```

## ID Format Details

### New Patient IDs (Generated Since Implementation)
**Format:** `S + YY + MM + sequential`
```
Example: S260600001
S     = Prefix (constant)
26    = Year (2026)
06    = Month (June)
00001 = Monthly sequential counter
```
**Resets monthly** - Counter starts from 00001 on the 1st of each month.

### Visit IDs  
**Format:** `YYYYMMDD + sequential`
```
Example: 2606080001
26     = Year (2026)
06     = Month (June)
08     = Day (8th)
0001   = Daily sequential counter
```
**Resets daily** - Counter starts from 0001 each day.

### Old Patient IDs (Legacy)
**Format:** `P + sequential`
```
Example: P960620001
Reason: Old system before ID format update
```

## Backend Logic Flow

```javascript
createPatient(req) {
  1. Check if mobile + firstName match an existing patient
     └─ If MATCH found:
        ├─ isExistingPatient = true
        ├─ Reuse existing Patient ID
        ├─ Generate NEW Visit ID
        └─ Add tests as new visit to existing patient
     
     └─ If NO MATCH found:
        ├─ isExistingPatient = false
        ├─ Generate NEW Patient ID (S260600001 format)
        ├─ Generate NEW Visit ID
        └─ Create brand new patient record
}
```

## Frontend Response Handling

The API response includes:
```json
{
  "success": true,
  "message": "...",
  "data": {
    "patientId": "S260600001",
    "tests": [
      { "visitId": "2606080001", ... }
    ]
  },
  "isExistingPatient": false  ← Indicates if new or existing
}
```

The alert message now clearly indicates:
- ✅ NEW Patient Registered (when `isExistingPatient: false`)
- ✅ Tests Added to Existing Patient (when `isExistingPatient: true`)

## Troubleshooting

### "Why does my new patient have an old ID format?"
- The patient was already in the system from before the ID format change
- Check if the name/mobile matches an existing record

### "Why is the system showing an existing patient instead of creating a new one?"
- Verify that Name and Mobile are different from existing patients
- The system is working correctly - it prevents duplicate registrations

### "I want to register the same person again - should I?"
- No! Just search for the existing patient and add new tests
- This creates a new visit for the same patient
- The Patient ID stays the same, only the Visit ID changes

## Key Points

1. **Patient ID is PERMANENT** - Never changes for the same person
2. **Visit ID changes** - Each visit gets a new ID (same day: sequential, different day: resets)
3. **Duplicate Prevention** - Same name + mobile = same patient (prevents duplicates)
4. **New Patients** - Different name or mobile = create new patient record
