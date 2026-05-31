# Charges System - Testing Checklist

## Pre-Testing Setup

- [ ] Backend is running on port 5000
- [ ] Frontend is running on port 3000
- [ ] Database migrations are applied: `npx prisma migrate deploy`
- [ ] Logged in as admin user
- [ ] At least 3 tests exist in the system

---

## Test 1: Set Default Charges

**Objective**: Verify that default charges can be set and saved

**Steps**:
1. [ ] Navigate to Master → Charges
2. [ ] Verify page loads with all tests displayed
3. [ ] Enter B2C charge for Test 1 (e.g., 100)
4. [ ] Enter B2B charge for Test 1 (e.g., 80)
5. [ ] Enter B2C charge for Test 2 (e.g., 200)
6. [ ] Enter B2B charge for Test 2 (e.g., 150)
7. [ ] Click "Save" button
8. [ ] Verify success message appears
9. [ ] Refresh page
10. [ ] Verify charges are still there

**Expected Result**: ✅ Default charges are saved and persist after refresh

**Notes**:
- Charges should be saved with `organizationId = NULL` in database
- Can verify in database: `SELECT * FROM test_charges WHERE organizationId IS NULL;`

---

## Test 2: Bulk Apply Charges

**Objective**: Verify bulk apply functionality works

**Steps**:
1. [ ] Navigate to Master → Charges
2. [ ] Click "Bulk Apply" button
3. [ ] Enter B2C charge (e.g., 500)
4. [ ] Enter B2B charge (e.g., 400)
5. [ ] Click "Apply to All" button
6. [ ] Verify all tests now have these charges
7. [ ] Click "Save" button
8. [ ] Verify success message

**Expected Result**: ✅ All tests have the bulk charges applied

**Notes**:
- Bulk apply should update all visible tests
- Should work with search filters too

---

## Test 3: B2B Validation

**Objective**: Verify B2B ≤ B2C validation works

**Steps**:
1. [ ] Navigate to Master → Charges
2. [ ] Find a test with B2C = 100
3. [ ] Try to set B2B = 150 (higher than B2C)
4. [ ] Click "Save" button
5. [ ] Verify error message appears: "B2B charge cannot be greater than B2C charge"
6. [ ] Fix the charge (set B2B = 80)
7. [ ] Click "Save" button
8. [ ] Verify success message

**Expected Result**: ✅ System prevents invalid B2B charges

**Notes**:
- Error should appear before saving to database
- Should show which test has the invalid charge

---

## Test 4: Create Organization (Auto-Copy Charges)

**Objective**: Verify that creating an organization auto-copies default charges

**Steps**:
1. [ ] Navigate to Master → Organization
2. [ ] Click "+ New Organization" button
3. [ ] Enter organization name (e.g., "Test Lab 1")
4. [ ] Enter location (e.g., "Pune")
5. [ ] Enter email (e.g., "testlab1@example.com")
6. [ ] Click "Save" button
7. [ ] Verify success message with credentials
8. [ ] Note the organization ID (e.g., ORG-AAA)

**Expected Result**: ✅ Organization is created with auto-copied charges

**Database Verification**:
```sql
-- Verify organization exists
SELECT * FROM organizations WHERE name = 'Test Lab 1';

-- Verify charges were copied
SELECT * FROM test_charges WHERE organizationId = 'ORG-AAA';

-- Should have same number of charges as default charges
SELECT COUNT(*) FROM test_charges WHERE organizationId IS NULL;
SELECT COUNT(*) FROM test_charges WHERE organizationId = 'ORG-AAA';
-- Both counts should be equal
```

---

## Test 5: Edit Organization Charges

**Objective**: Verify that organization charges can be edited independently

**Steps**:
1. [ ] Navigate to Master → Organization
2. [ ] Find "Test Lab 1" in the list
3. [ ] Click "Charges" button (purple button)
4. [ ] Verify page loads with charges for this organization
5. [ ] Edit Test 1 B2C charge (e.g., change 100 to 120)
6. [ ] Edit Test 1 B2B charge (e.g., change 80 to 90)
7. [ ] Click "Save" button
8. [ ] Verify success message
9. [ ] Refresh page
10. [ ] Verify charges are updated

**Expected Result**: ✅ Organization charges are updated independently

**Database Verification**:
```sql
-- Verify organization charges were updated
SELECT * FROM test_charges WHERE organizationId = 'ORG-AAA' AND testId = 1;
-- Should show B2C=120, B2B=90

-- Verify default charges are unchanged
SELECT * FROM test_charges WHERE organizationId IS NULL AND testId = 1;
-- Should still show B2C=100, B2B=80
```

---

## Test 6: Verify Charge Isolation

**Objective**: Verify that charges are isolated between organizations

**Steps**:
1. [ ] Create second organization (e.g., "Test Lab 2")
2. [ ] Verify it has default charges copied
3. [ ] Edit charges for "Test Lab 1" (increase by 10%)
4. [ ] Go to "Test Lab 2" charges
5. [ ] Verify "Test Lab 2" charges are unchanged
6. [ ] Go to Master → Charges (default charges)
7. [ ] Verify default charges are unchanged

**Expected Result**: ✅ Each organization has independent charges

**Database Verification**:
```sql
-- Verify all three have different charges
SELECT organizationId, testId, b2cCharge FROM test_charges WHERE testId = 1;
-- Should show 3 rows:
-- NULL (default)
-- ORG-AAA (Test Lab 1)
-- ORG-BBB (Test Lab 2)
```

---

## Test 7: Search and Filter

**Objective**: Verify search functionality works

**Steps**:
1. [ ] Navigate to Master → Charges
2. [ ] Enter test name in search box (e.g., "Blood")
3. [ ] Verify only matching tests are shown
4. [ ] Clear search
5. [ ] Enter test code in search box
6. [ ] Verify only matching tests are shown
7. [ ] Enter group in search box
8. [ ] Verify only matching tests are shown
9. [ ] Click "Reset" button
10. [ ] Verify all tests are shown again

**Expected Result**: ✅ Search and filter work correctly

---

## Test 8: Export to Excel

**Objective**: Verify Excel export functionality

**Steps**:
1. [ ] Navigate to Master → Charges
2. [ ] Click "Excel" button
3. [ ] Verify file is downloaded (check Downloads folder)
4. [ ] Open Excel file
5. [ ] Verify all tests are in the file
6. [ ] Verify columns: Sr.No, Test Name, Test Code, Group, Charges, B2B
7. [ ] Verify data matches what's on screen

**Expected Result**: ✅ Excel file is generated with correct data

**Notes**:
- File name should be: `Lab_Charges_YYYY-MM-DD.xlsx`
- Should work for both default charges and organization charges

---

## Test 9: Export to PDF

**Objective**: Verify PDF export functionality

**Steps**:
1. [ ] Navigate to Master → Charges
2. [ ] Click "PDF" button
3. [ ] Verify file is downloaded (check Downloads folder)
4. [ ] Open PDF file
5. [ ] Verify title and date are shown
6. [ ] Verify table with all tests is shown
7. [ ] Verify data matches what's on screen

**Expected Result**: ✅ PDF file is generated with correct data

**Notes**:
- File name should be: `Lab_Charges_YYYY-MM-DD.pdf`
- Should have orange header color (#F24E1E)

---

## Test 10: Organization List with Charges Button

**Objective**: Verify organization list shows Charges button

**Steps**:
1. [ ] Navigate to Master → Organization
2. [ ] Verify list shows all organizations
3. [ ] For each organization, verify "Charges" button is visible
4. [ ] Click "Charges" button
5. [ ] Verify it navigates to organization charges page
6. [ ] Verify page title shows organization name

**Expected Result**: ✅ Charges button works and navigates correctly

---

## Test 11: Bulk Apply in Organization Charges

**Objective**: Verify bulk apply works in organization charges page

**Steps**:
1. [ ] Navigate to Master → Organization → Charges for an organization
2. [ ] Click "Bulk Apply" button
3. [ ] Enter B2C charge (e.g., 600)
4. [ ] Enter B2B charge (e.g., 500)
5. [ ] Click "Apply to All" button
6. [ ] Verify all tests now have these charges
7. [ ] Click "Save" button
8. [ ] Verify success message

**Expected Result**: ✅ Bulk apply works in organization charges page

---

## Test 12: API Endpoint - Get Default Charges

**Objective**: Verify API returns default charges correctly

**Steps**:
1. [ ] Open browser console or use Postman
2. [ ] Make GET request to: `http://localhost:5000/api/master/test-charges/all`
3. [ ] Verify response includes charges with `organizationId: null`
4. [ ] Verify response includes charges with `organizationId: "ORG-AAA"`, etc.

**Expected Result**: ✅ API returns all charges correctly

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "testId": 1,
      "organizationId": null,
      "b2cCharge": 100,
      "b2bCharge": 80
    },
    {
      "id": 4,
      "testId": 1,
      "organizationId": "ORG-AAA",
      "b2cCharge": 100,
      "b2bCharge": 80
    }
  ]
}
```

---

## Test 13: API Endpoint - Get Organization Charges

**Objective**: Verify API returns organization charges correctly

**Steps**:
1. [ ] Open browser console or use Postman
2. [ ] Make GET request to: `http://localhost:5000/api/master/organizations/ORG-AAA/charges`
3. [ ] Verify response includes only charges for ORG-AAA
4. [ ] Verify response does NOT include default charges or other org charges

**Expected Result**: ✅ API returns organization charges correctly

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "testId": 1,
      "organizationId": "ORG-AAA",
      "b2cCharge": 100,
      "b2bCharge": 80
    },
    {
      "id": 5,
      "testId": 2,
      "organizationId": "ORG-AAA",
      "b2cCharge": 150,
      "b2bCharge": 120
    }
  ]
}
```

---

## Test 14: API Endpoint - Bulk Save Default Charges

**Objective**: Verify API saves default charges correctly

**Steps**:
1. [ ] Use Postman or curl
2. [ ] Make POST request to: `http://localhost:5000/api/master/test-charges/bulk`
3. [ ] Send body:
```json
{
  "charges": [
    {"testId": 1, "b2cCharge": 150, "b2bCharge": 120},
    {"testId": 2, "b2cCharge": 250, "b2bCharge": 200}
  ]
}
```
4. [ ] Verify response shows success
5. [ ] Verify charges are saved with `organizationId = null`

**Expected Result**: ✅ API saves default charges correctly

---

## Test 15: API Endpoint - Bulk Save Organization Charges

**Objective**: Verify API saves organization charges correctly

**Steps**:
1. [ ] Use Postman or curl
2. [ ] Make POST request to: `http://localhost:5000/api/master/test-charges/bulk`
3. [ ] Send body:
```json
{
  "organizationId": "ORG-AAA",
  "charges": [
    {"testId": 1, "b2cCharge": 180, "b2bCharge": 140},
    {"testId": 2, "b2cCharge": 280, "b2bCharge": 220}
  ]
}
```
4. [ ] Verify response shows success
5. [ ] Verify charges are saved with `organizationId = "ORG-AAA"`

**Expected Result**: ✅ API saves organization charges correctly

---

## Test 16: End-to-End Workflow

**Objective**: Verify complete workflow works

**Steps**:
1. [ ] Set default charges in Master → Charges
2. [ ] Create Organization A
3. [ ] Verify Organization A has default charges
4. [ ] Create Organization B
5. [ ] Verify Organization B has default charges
6. [ ] Edit Organization A charges (increase by 20%)
7. [ ] Verify Organization B charges are unchanged
8. [ ] Verify default charges are unchanged
9. [ ] Export Organization A charges to Excel
10. [ ] Export Organization B charges to Excel
11. [ ] Verify both files have different charges

**Expected Result**: ✅ Complete workflow works correctly

---

## Test 17: Error Handling

**Objective**: Verify error handling works

**Steps**:
1. [ ] Try to save charges with B2B > B2C
2. [ ] Verify error message appears
3. [ ] Try to create organization without name
4. [ ] Verify error message appears
5. [ ] Try to access non-existent organization charges
6. [ ] Verify error message appears

**Expected Result**: ✅ All errors are handled gracefully

---

## Test 18: Performance

**Objective**: Verify system performs well with large datasets

**Steps**:
1. [ ] Create 10+ organizations
2. [ ] Set charges for 50+ tests
3. [ ] Navigate to Master → Charges
4. [ ] Verify page loads quickly (< 2 seconds)
5. [ ] Search for tests
6. [ ] Verify search is fast (< 1 second)
7. [ ] Export to Excel
8. [ ] Verify export is fast (< 5 seconds)

**Expected Result**: ✅ System performs well

---

## Final Verification

- [ ] All tests passed
- [ ] No console errors
- [ ] No database errors
- [ ] All features working as expected
- [ ] Documentation is complete
- [ ] Ready for production

---

## Sign-Off

**Tested By**: ___________________

**Date**: ___________________

**Status**: ☐ PASS ☐ FAIL

**Notes**: 
```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

## Known Issues (if any)

1. Issue: ___________________
   Status: ___________________
   Workaround: ___________________

2. Issue: ___________________
   Status: ___________________
   Workaround: ___________________

---

## Next Steps

- [ ] Deploy to production
- [ ] Train users on new system
- [ ] Monitor for issues
- [ ] Collect feedback
- [ ] Plan improvements
