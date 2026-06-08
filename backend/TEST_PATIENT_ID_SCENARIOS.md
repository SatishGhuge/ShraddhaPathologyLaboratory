# Test Scenarios for Patient ID Generation

## Quick Test Guide

Use these scenarios to test the patient ID generation and existing patient detection.

### Scenario 1: NEW PATIENT (Different Name & Mobile)
**Expected Result:** New Patient ID in format `S260600001`

Steps:
1. Go to Patient Registration
2. Enter: 
   - Name: `JOHN SMITH`
   - Mobile: `9999999999`
3. Select tests
4. Click "Save Registration"

Expected Alert:
```
✅ NEW Patient Registered Successfully
Patient ID: S260600001
Visit ID: 2606080001
```

---

### Scenario 2: SAME PATIENT (Existing Name & Mobile)
**Expected Result:** Reuse existing Patient ID, generate NEW Visit ID

Steps:
1. Go to Patient Registration
2. Enter the EXACT same info as Scenario 1:
   - Name: `JOHN SMITH`
   - Mobile: `9999999999`
3. Select DIFFERENT tests
4. Click "Save Registration"

Expected Alert:
```
✅ Tests Added to Existing Patient
Patient ID: S260600001  (SAME as before)
New Visit ID: 2606080002  (Different from before)
```

---

### Scenario 3: SAME PERSON, DIFFERENT MOBILE
**Expected Result:** Create NEW patient record (different mobile = different person)

Steps:
1. Go to Patient Registration
2. Enter:
   - Name: `JOHN SMITH`
   - Mobile: `8888888888` (DIFFERENT!)
3. Select tests
4. Click "Save Registration"

Expected Alert:
```
✅ NEW Patient Registered Successfully
Patient ID: S260600002  (Next sequential)
Visit ID: 2606080001
```

---

### Scenario 4: SAME PERSON NEXT DAY (Same Name & Mobile, Different Date)
**Expected Result:** Reuse Patient ID, NEW Visit ID with new date

Steps:
1. Register patient on Day 1 (e.g., 2026-06-08)
2. Next day (2026-06-09), register the SAME patient:
   - Name: `JOHN SMITH`
   - Mobile: `9999999999`
   - Visit Date: `2026-06-09`
3. Select tests
4. Click "Save Registration"

Expected Alert:
```
✅ Tests Added to Existing Patient
Patient ID: S260600001  (SAME)
New Visit ID: 2606090001  (New date! Counter resets to 0001)
```

---

### Scenario 5: MULTIPLE VISITS SAME DAY (Same Patient, Same Date)
**Expected Result:** Reuse Patient ID, sequential Visit IDs

Visit 1 on 2026-06-08:
```
Patient ID: S260600001
Visit ID: 2606080001 (0001 = 1st visit this day)
```

Visit 2 on 2026-06-08:
```
Patient ID: S260600001 (SAME)
Visit ID: 2606080002 (0002 = 2nd visit this day)
```

Visit 3 on 2026-06-08:
```
Patient ID: S260600001 (SAME)
Visit ID: 2606080003 (0003 = 3rd visit this day)
```

---

## Database Queries to Verify

### Check all patients with new ID format
```sql
SELECT patientId, firstName, lastName, mobile, createdAt 
FROM patients 
WHERE patientId LIKE 'S%' 
ORDER BY patientId DESC 
LIMIT 10;
```

Expected output:
```
| patientId    | firstName    | lastName    | mobile       | createdAt  |
|-------------|-------------|-------------|--------------|-----------|
| S260600005  | RAJESH      | SHARMA      | 9876543210   | 2026-06-08 |
| S260600004  | PRIYA       | VERMA       | 8765432109   | 2026-06-07 |
| S260600003  | AMIT        | PATEL       | 7654321098   | 2026-06-06 |
| S260600002  | JOHN        | SMITH       | 8888888888   | 2026-06-08 |
| S260600001  | JOHN        | SMITH       | 9999999999   | 2026-06-08 |
```

### Check visits for a specific patient
```sql
SELECT patientId, visitId, testId, visitDate 
FROM patient_tests 
WHERE patientId = 'S260600001' 
ORDER BY visitId DESC;
```

Expected output shows multiple visitIds with same patientId:
```
| patientId    | visitId      | testId | visitDate  |
|-------------|-------------|--------|-----------|
| S260600001  | 2606080003  | 15     | 2026-06-08 |
| S260600001  | 2606080002  | 12     | 2026-06-08 |
| S260600001  | 2606080001  | 8      | 2026-06-08 |
```

---

## Console Logs to Look For

When registering, check browser console (F12) and backend logs for:

**For NEW Patient:**
```
✅ Generated Patient ID: S260600001
✅ Generated Visit ID: 2606080001
📝 Creating patient with data: { firstName: 'JOHN', ... }
```

**For EXISTING Patient:**
```
✅ Found EXISTING patient: S260600001 (JOHN SMITH)
📋 Adding new visit to existing patient. New Visit ID will be generated.
✅ Generated Visit ID: 2606080002
```

---

## Common Issues & Fixes

### Issue: Showing old ID format (P960620001) for new patient
**Cause:** Patient already exists in database from before ID format change
**Fix:** Use a completely different name or mobile number

### Issue: System says "existing patient" when I want a new one
**Cause:** Name and/or mobile match an existing patient
**Fix:** Change the mobile number or first name

### Issue: Visit ID not changing
**Cause:** Might be registering same patient on same date
**Fix:** Change the visit date or register a different patient

---

## Visual Workflow

```
Register Patient
    ↓
Name + Mobile match?
    ├─ YES → Existing Patient
    │        ├─ Reuse Patient ID
    │        ├─ Generate NEW Visit ID
    │        └─ Alert: "Tests Added to Existing Patient"
    │
    └─ NO → New Patient
             ├─ Generate NEW Patient ID (S260600XXX)
             ├─ Generate NEW Visit ID
             └─ Alert: "NEW Patient Registered Successfully"
```
