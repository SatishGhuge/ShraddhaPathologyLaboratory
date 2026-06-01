# Complete Charges System Workflow

## Workflow Overview

```
START
  ↓
[1] Set Default Charges (Master → Charges)
  ├─ Enter charges for all tests
  ├─ Click Save
  └─ ✅ Default charges saved (organizationId = NULL)
  ↓
[2] Create Organization (Master → Organization → New)
  ├─ Enter organization details
  ├─ Click Save
  └─ ✅ System auto-copies default charges to new org
  ↓
[3] Edit Organization Charges (Master → Organization → Charges)
  ├─ Select organization
  ├─ Edit charges for that org only
  ├─ Click Save
  └─ ✅ Organization charges updated (doesn't affect others)
  ↓
[4] View/Export Charges
  ├─ Export to Excel
  ├─ Export to PDF
  └─ ✅ Charges exported
  ↓
END
```

## Detailed Step-by-Step Guide

### STEP 1: Set Default Charges

**Location**: Master → Charges

**What to do**:
1. Click on "Master" in sidebar
2. Click on "Charges"
3. You'll see a table with all tests
4. For each test, enter:
   - **Charges**: B2C charge (customer price)
   - **B2B**: B2B charge (business price)
5. Use "Bulk Apply" to set same charges for multiple tests
6. Click "Save" button

**What happens**:
- Charges are saved to database with `organizationId = NULL`
- These become the DEFAULT charges
- All new organizations will copy these charges

**Example**:
```
Test Name          | Charges | B2B
Blood Test         | 100     | 80
Urine Test         | 150     | 120
X-Ray              | 500     | 400
```

---

### STEP 2: Create Organization

**Location**: Master → Organization → New Organization

**What to do**:
1. Click on "Master" in sidebar
2. Click on "Organization"
3. Click "+ New Organization" button
4. Fill in organization details:
   - Name (required)
   - Code (optional)
   - Location (optional)
   - Address (optional)
   - Mobile (optional)
   - Email (optional)
5. Click "Save" button

**What happens**:
- Organization is created with a unique ID (e.g., ORG-AAA)
- System automatically fetches all DEFAULT charges
- System copies all default charges to this new organization
- Organization now has its own independent set of charges
- User account is created for the organization

**Example**:
```
Organization Created: Main Lab (ORG-AAA)
Charges Copied: 3 charges
├─ Blood Test: B2C=100, B2B=80
├─ Urine Test: B2C=150, B2B=120
└─ X-Ray: B2C=500, B2B=400
```

---

### STEP 3: Edit Organization Charges

**Location**: Master → Organization List → [Organization] → Charges

**What to do**:
1. Click on "Master" in sidebar
2. Click on "Organization"
3. Find the organization in the list
4. Click "Charges" button (purple button)
5. You'll see charges for that organization
6. Edit charges as needed:
   - Change B2C charge
   - Change B2B charge
   - Use "Bulk Apply" for multiple tests
7. Click "Save" button

**What happens**:
- Only this organization's charges are updated
- Default charges remain unchanged
- Other organizations' charges remain unchanged
- Changes are saved to database with `organizationId = ORG-XXX`

**Example**:
```
BEFORE:
Organization A (ORG-AAA)
├─ Blood Test: B2C=100, B2B=80
├─ Urine Test: B2C=150, B2B=120
└─ X-Ray: B2C=500, B2B=400

AFTER EDITING:
Organization A (ORG-AAA)
├─ Blood Test: B2C=120, B2B=90      ← CHANGED
├─ Urine Test: B2C=150, B2B=120
└─ X-Ray: B2C=500, B2B=400

DEFAULT CHARGES (unchanged):
├─ Blood Test: B2C=100, B2B=80
├─ Urine Test: B2C=150, B2B=120
└─ X-Ray: B2C=500, B2B=400

Organization B (unchanged):
├─ Blood Test: B2C=100, B2B=80
├─ Urine Test: B2C=150, B2B=120
└─ X-Ray: B2C=500, B2B=400
```

---

### STEP 4: View/Export Charges

**Location**: Master → Charges OR Master → Organization → Charges

**What to do**:
1. Go to charges page (default or organization-specific)
2. Click "Excel" button to export to Excel file
3. Click "PDF" button to export to PDF file
4. File will be downloaded to your computer

**What happens**:
- Excel file contains all charges in table format
- PDF file contains formatted report with charges
- Files are named with date: `Lab_Charges_2026-05-31.xlsx`

---

## Common Scenarios

### Scenario 1: New Lab Setup

**Goal**: Set up charges for a new lab with multiple organizations

**Steps**:
1. Go to Master → Charges
2. Enter default charges for all tests
3. Click Save
4. Go to Master → Organization
5. Create "Main Lab" organization
   - System auto-copies default charges
6. Create "Branch Lab" organization
   - System auto-copies default charges
7. Go to Organization List
8. Click Charges for "Branch Lab"
9. Edit charges if needed (e.g., lower prices for branch)
10. Click Save

**Result**:
- Main Lab has default charges
- Branch Lab has its own charges (can be different)
- Both organizations are independent

---

### Scenario 2: Update Charges for One Organization

**Goal**: Increase charges for Organization A only

**Steps**:
1. Go to Master → Organization List
2. Find Organization A
3. Click "Charges" button
4. Edit charges (increase B2C and B2B)
5. Click "Bulk Apply" to apply to all tests at once
6. Click Save

**Result**:
- Organization A charges are increased
- Default charges unchanged
- Other organizations unchanged

---

### Scenario 3: Bulk Update Multiple Organizations

**Goal**: Update charges for multiple organizations

**Steps**:
1. Go to Master → Organization List
2. For each organization:
   - Click "Charges" button
   - Edit charges
   - Click Save
3. Repeat for all organizations

**Result**:
- Each organization has updated charges
- All changes are independent

---

### Scenario 4: Export Charges for Backup

**Goal**: Backup all charges to Excel

**Steps**:
1. Go to Master → Charges (for default charges)
2. Click "Excel" button
3. File is downloaded
4. For each organization:
   - Go to Master → Organization → Charges
   - Click "Excel" button
   - File is downloaded

**Result**:
- All charges are backed up in Excel files
- Can be used for reference or import later

---

## Database Structure

### How Charges Are Stored

```sql
-- DEFAULT CHARGES (organizationId = NULL)
SELECT * FROM test_charges WHERE organizationId IS NULL;
Result:
id | testId | organizationId | b2cCharge | b2bCharge
1  | 1      | NULL           | 100       | 80
2  | 2      | NULL           | 150       | 120
3  | 3      | NULL           | 500       | 400

-- ORGANIZATION A CHARGES (organizationId = 'ORG-AAA')
SELECT * FROM test_charges WHERE organizationId = 'ORG-AAA';
Result:
id | testId | organizationId | b2cCharge | b2bCharge
4  | 1      | ORG-AAA        | 100       | 80
5  | 2      | ORG-AAA        | 150       | 120
6  | 3      | ORG-AAA        | 500       | 400

-- ORGANIZATION B CHARGES (organizationId = 'ORG-BBB')
SELECT * FROM test_charges WHERE organizationId = 'ORG-BBB';
Result:
id | testId | organizationId | b2cCharge | b2bCharge
7  | 1      | ORG-BBB        | 100       | 80
8  | 2      | ORG-BBB        | 150       | 120
9  | 3      | ORG-BBB        | 500       | 400
```

### Unique Constraint

```sql
UNIQUE KEY `test_charges_testId_organizationId_key` (`testId`, `organizationId`)
```

This ensures:
- Only ONE default charge per test (organizationId = NULL)
- Only ONE charge per test per organization
- Multiple organizations can have charges for the same test

---

## Validation Rules

### B2B ≤ B2C Rule
- B2B charge must be less than or equal to B2C charge
- System will show error if violated
- Cannot save charges if this rule is broken

### Example:
```
✅ VALID:
Test 1: B2C=100, B2B=80   (80 ≤ 100)

❌ INVALID:
Test 1: B2C=100, B2B=120  (120 > 100) ← ERROR!
```

---

## Troubleshooting

### Issue: Organization has no charges after creation
**Solution**: 
1. Make sure default charges are set in Master → Charges
2. Create organization after setting defaults
3. If already created, manually add charges in Organization → Charges

### Issue: Can't save charges - B2B error
**Solution**:
1. Check that B2B ≤ B2C for all tests
2. Fix any invalid charges
3. Try saving again

### Issue: Changes to default charges don't affect organizations
**Solution**:
1. This is correct behavior - organizations are independent
2. Edit each organization's charges separately
3. Or delete and recreate organization to get new defaults

### Issue: Can't find organization charges page
**Solution**:
1. Go to Master → Organization
2. Find organization in list
3. Click "Charges" button (purple button)
4. If button not visible, scroll right in table

---

## Performance Tips

1. **Use Bulk Apply**: Instead of editing each test individually, use Bulk Apply to set charges for all tests at once
2. **Search before editing**: Use search to filter tests, then bulk apply to filtered results
3. **Export regularly**: Export charges to Excel for backup and reference
4. **Batch operations**: Create multiple organizations at once, then edit charges as needed

---

## Security Notes

1. **Organization Isolation**: Each organization's charges are completely isolated
2. **User Accounts**: Each organization gets a user account with credentials
3. **Audit Trail**: All changes are tracked with timestamps
4. **Validation**: All inputs are validated before saving

---

## Summary

The charges system provides:
- ✅ Default charges for all tests
- ✅ Organization-specific charges
- ✅ Complete isolation between organizations
- ✅ Automatic charge copying when creating organizations
- ✅ Bulk operations for faster updates
- ✅ Export functionality for backup
- ✅ Validation to prevent errors

This ensures that each organization can have independent pricing while maintaining a default template for new organizations.
