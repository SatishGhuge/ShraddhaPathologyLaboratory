# Testing Guide: Age Range Matching for Child Patients (1-3 Months)

## Overview
This document guides testing the complete age range matching system for child patients aged 1-3 months with "Both" gender selection.

---

## Prerequisites

1. **Parameter Setup**: RED BLOOD CELL COUNT with age range:
   - Label: "Between Both"
   - Gender: Both
   - From: 1, To: 3 (months)
   - Time Unit: Month(s)
   - LL (Low Limit): 11000
   - UL (Upper Limit): 16000

2. **Test Patient 1**: Male child, 2 months old
   - DOB: 2 months ago (calculated from today)
   - Age: 0Y 2M 0D (approximately)
   - Gender: Male

3. **Test Patient 2**: Female child, 1.5 months old
   - DOB: 1.5 months ago
   - Age: 0Y 1M 15D (approximately)
   - Gender: Female

---

## Test Execution Steps

### Step 1: Create/Register Test for Patient 1 (Male, 2 months)

1. Go to **Patient Registration**
2. Create new patient with:
   - Name: "Test Child Male"
   - DOB: [2 months ago date]
   - Gender: **Male**
3. Register test: RED BLOOD CELL COUNT
4. Navigate to **Result Page**

### Step 2: Check Backend Logs (Patient 1)

When result page loads, check backend console for:

```
🔴 DEBUG getNormalRange - Parameter: RED BLOOD CELL COUNT
   Patient Age: 0Y 2M 0D
   Patient Gender: Male
   Has ageRanges: true

   🔍 CHECKING 1 AGE RANGES:

   📋 Range: "Between Both"
      ❌ DISABLED - skipping
      OR
      Gender Check: range="both", patient="male"
      ✅ GENDER OK
      Age Check: "Between" - ageToCheck(Month(s))=2 in [1, 3] = true
      Range Values: LL=11000, UL=16000, valid=true
      ✅✅✅ MATCH FOUND! RETURNING: 11000 - 16000
```

### Step 3: Check Frontend Logs (Patient 1)

Check browser console (F12) for:

```
🔴 Frontend getAgeAppropriateRange called for:
   parameterName: RED BLOOD CELL COUNT
   patientName: Test Child Male
   patientAge: 0Y 2M 0D
   gender: Male

   ageRanges found: 1 ranges

   📋 Range: "Between Both"
      ❌ DISABLED - skipping
      OR
      Gender Check: range="both", patient="male"
      ✅ GENDER OK
      Age Check: "Between" - ageToCheck(Month(s))=2 in [1, 3] = true
      Range Values: LL=11000, UL=16000, valid=true
      ✅✅✅ MATCH FOUND! RETURNING: 11000 - 16000
```

### Step 4: Verify Result Page Display (Patient 1)

**Expected in Result Table:**
- Age Column: "2M" (since age < 1 year, shows only months and days)
- Normal Range Column: **11000 - 16000** ✅

### Step 5: Repeat for Patient 2 (Female, 1.5 months)

1. Register another test for female child, ~1.5 months old
2. Check same logs - should match the "Between Both" range
3. Check result table - should also show **11000 - 16000** ✅

---

## Expected Behavior Summary

| Scenario | Expected Result |
|----------|-----------------|
| Male child, 2 months old | **11000 - 16000** (from Between Both range) |
| Female child, 2 months old | **11000 - 16000** (from Between Both range) |
| Male child, 0.5 months old | **-** (outside range) or fallback range |
| Male child, 5 months old | **-** (outside range) or fallback range |
| Male adult, 25 years old | Different range (male adult range) |
| Female adult, 25 years old | Different range (female adult range) |

---

## What Each Log Message Means

### Backend Logs

| Message | Meaning |
|---------|---------|
| `❌ DISABLED - skipping` | Range is disabled in database, won't be used |
| `❌ GENDER MISMATCH - skipping` | Range gender doesn't match patient (shouldn't happen with "Both") |
| `✅ GENDER OK` | Gender matches (either "both" or exact match) |
| `Age Check: "Between"...` | Checking if age falls in the range |
| `✅✅✅ MATCH FOUND!` | **Age AND gender match, returning this range** |
| `❌ NO AGE RANGE MATCHED` | No matching range, falling back to BySex/ByGenderAndAge |

### Frontend Logs

Same meanings as backend logs - they follow the same logic.

---

## Troubleshooting

### Issue: Normal Range Shows "-" Instead of "11000 - 16000"

**Check in order:**

1. **Backend logs show "❌ DISABLED - skipping"**
   - Fix: Ensure "Between Both" range has `enabled=true` in database
   - Check: Navigate to parameter master and verify range is enabled

2. **Backend logs show "❌ GENDER MISMATCH"**
   - Fix: Ensure gender is saved as "both" (lowercase) in database
   - Check: Run: `SELECT ageRanges FROM TestParameter WHERE parameterName='RED BLOOD CELL COUNT'`
   - Should show: `"gender":"both"` in JSON

3. **Backend logs show "Age Check...matches=false"**
   - Fix: Verify age calculation is correct
   - Example: For 2-month-old, ageToCheck(Month(s))=2 should match [1,3]
   - Check: Are ageYears, ageMonths, ageDays being calculated?

4. **Age Check shows wrong value**
   - Fix: Verify DOB is correct and ageYears/ageMonths/ageDays are populated
   - Check: `SELECT ageYears, ageMonths, ageDays, dob FROM Patient WHERE patientId='...'`

5. **No logs appear at all**
   - Fix: Ensure browser console is open (F12)
   - Ensure backend is running with console visible
   - Check network tab to see API response

---

## Data Flow Verification Checklist

- [ ] Parameter "RED BLOOD CELL COUNT" exists in database
- [ ] ageRanges JSON contains "Between Both" range
- [ ] Range has `enabled=true`
- [ ] Range has `gender="both"` (lowercase)
- [ ] Range has `from=1, to=3`
- [ ] Range has `ll=11000, ul=16000`
- [ ] Range has `timeUnit="Month(s)"`
- [ ] Test patient has DOB set (not null)
- [ ] Patient record has ageYears, ageMonths, ageDays populated
- [ ] Patient gender is "Male" or "Female" (exact case match in database)
- [ ] Backend console shows debug logs
- [ ] Frontend console shows debug logs
- [ ] Result table displays correct range

---

## Sample Database Query

To verify everything is saved correctly:

```sql
SELECT 
  id,
  parameterName,
  ageRanges,
  childLowValue,
  childHighValue,
  maleLowValue,
  maleHighValue,
  femaleLowValue,
  femaleHighValue
FROM TestParameter
WHERE parameterName = 'RED BLOOD CELL COUNT'
LIMIT 1;
```

Expected ageRanges JSON:
```json
[
  {
    "label": "Between Both",
    "gender": "both",
    "enabled": true,
    "from": 1,
    "to": 3,
    "ll": 11000,
    "ul": 16000,
    "timeUnit": "Month(s)"
  }
]
```

---

## Success Indicators

✅ **Test Passes When:**
1. Male child (2 months) shows "11000 - 16000" in Normal Range column
2. Female child (2 months) shows "11000 - 16000" in Normal Range column
3. Both backend and frontend console logs show "✅✅✅ MATCH FOUND!"
4. Age is displayed correctly as "2M" (for 2 months old, < 1 year)
5. Gender is correctly identified as "Male" or "Female"

---

## Quick Reference: Expected Age Display Formats

- Child < 1 year: `2M` or `2M 15D` (only months and days)
- Child 1-12 years: `4Y 3M 15D` (years, months, days)
- Adult >= 12 years: `12.6` (decimal format)
