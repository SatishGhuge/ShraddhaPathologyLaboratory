# Complete Workflow Guide - Charges System

## 🎯 Overview

The charges system works in 3 simple steps:

1. **Set Default Charges** (Master → Charges)
2. **Create Organizations** (Master → Organization)
3. **Modify Organization Charges** (Master → Organization → Charges)

---

## 📋 Detailed Workflows

### Workflow 1: Initial Setup - Set Default Charges

**Goal**: Set charges that will be used as default for all new organizations

**Steps**:
1. Click **Master** in sidebar
2. Click **Charges**
3. You'll see all tests in the system
4. For each test, enter:
   - **Charges**: B2C price (what customers pay)
   - **B2B**: B2B price (what corporate clients pay)
5. Use **Bulk Apply** button to quickly set same charges for multiple tests
6. Click **Save**

**Result**: ✅ Default charges are now set

**Example**:
```
Test: Blood Test
- B2C Charge: 500
- B2B Charge: 400

Test: Urine Test
- B2C Charge: 300
- B2B Charge: 250
```

---

### Workflow 2: Create New Organization

**Goal**: Create a new organization (e.g., new lab branch)

**Steps**:
1. Click **Master** in sidebar
2. Click **Organization**
3. Click **+ New Organization** button
4. Fill in organization details:
   - **Name**: e.g., "Main Lab" or "Branch Lab"
   - **Code**: e.g., "ML" or "BL"
   - **Location**: e.g., "Pune"
   - **Mobile**: 10-digit number
   - **Email**: Valid email address
   - **Address**: Full address
   - **Date of Establishment**: Select date
5. **(Optional)** Add specific test charges:
   - Click **Add Charge** button
   - Select test from dropdown
   - Enter B2C and B2B charges
   - Repeat for more tests
6. Click **Save**

**Result**: ✅ Organization created with:
- Login credentials sent to email
- Default charges copied (if no custom charges provided)
- OR custom charges applied (if provided)

**Example 1 - With Default Charges**:
```
Organization: Main Lab
- No custom charges provided
- System copies all default charges
- Main Lab now has same charges as defaults
```

**Example 2 - With Custom Charges**:
```
Organization: VIP Client
- Custom charges provided:
  - Blood Test: 450 (B2C), 350 (B2B)
  - Urine Test: 250 (B2C), 200 (B2B)
- VIP Client has different charges than defaults
```

---

### Workflow 3: Modify Organization Charges

**Goal**: Change charges for a specific organization

**Steps**:
1. Click **Master** in sidebar
2. Click **Organization**
3. Find the organization in the list
4. Click **Charges** button
5. You'll see all tests with current charges for this organization
6. Modify charges:
   - Search for specific tests
   - Change B2C and B2B prices
   - Use **Bulk Apply** for multiple tests
7. Click **Save**

**Result**: ✅ Only this organization's charges are updated

**Important**: Other organizations are NOT affected!

**Example**:
```
Before:
- Organization A: Blood Test = 500 (B2C), 400 (B2B)
- Organization B: Blood Test = 500 (B2C), 400 (B2B)

Modify Organization A:
- Blood Test = 450 (B2C), 350 (B2B)

After:
- Organization A: Blood Test = 450 (B2C), 350 (B2B) ✅ CHANGED
- Organization B: Blood Test = 500 (B2C), 400 (B2B) ✅ UNCHANGED
```

---

### Workflow 4: Update Default Charges

**Goal**: Change the default charges that apply to new organizations

**Steps**:
1. Click **Master** in sidebar
2. Click **Charges**
3. Modify charges
4. Click **Save**

**Important**: 
- ⚠️ This only affects NEW organizations created after this point
- Existing organizations keep their current charges
- To update existing organizations, modify each one individually

**Example**:
```
Before:
- Default: Blood Test = 500 (B2C), 400 (B2B)
- Organization A: Blood Test = 500 (B2C), 400 (B2B)
- Organization B: Blood Test = 500 (B2C), 400 (B2B)

Update Default:
- Blood Test = 550 (B2C), 450 (B2B)

After:
- Default: Blood Test = 550 (B2C), 450 (B2B) ✅ CHANGED
- Organization A: Blood Test = 500 (B2C), 400 (B2B) ✅ UNCHANGED
- Organization B: Blood Test = 500 (B2C), 400 (B2B) ✅ UNCHANGED
- New Organization C: Blood Test = 550 (B2C), 450 (B2B) ✅ Gets new defaults
```

---

## 🔄 Common Scenarios

### Scenario 1: New Lab Branch with Same Charges

**Situation**: Opening a new branch with same charges as main lab

**Steps**:
1. Go to Master → Charges (verify defaults are set)
2. Go to Master → Organization → New Organization
3. Enter branch details
4. Leave "Test Charges" empty
5. Save
6. ✅ Branch automatically gets all default charges

---

### Scenario 2: VIP Client with Special Pricing

**Situation**: VIP client needs 10% discount on all tests

**Steps**:
1. Go to Master → Organization → New Organization
2. Enter VIP client details
3. Add test charges with 10% discount:
   - Blood Test: 450 (instead of 500)
   - Urine Test: 270 (instead of 300)
   - etc.
4. Save
5. ✅ VIP client has special pricing

---

### Scenario 3: Bulk Price Increase

**Situation**: Need to increase all charges by 5%

**Steps**:
1. Go to Master → Charges
2. Click **Bulk Apply**
3. Enter new charges (5% higher)
4. Click "Apply to All"
5. Save
6. ✅ All default charges updated
7. ⚠️ Remember: Only affects new organizations

---

### Scenario 4: Copy Charges Between Organizations

**Situation**: Organization B should have same charges as Organization A

**Steps**:
1. Go to Master → Organization → Organization A → Charges
2. Click **Excel** to export charges
3. Go to Master → Organization → Organization B → Charges
4. Manually enter charges from Excel
5. Save
6. ✅ Organization B now has same charges as A

---

## 📊 Charge Hierarchy

```
System Charges
│
├─ Default Charges (Master → Charges)
│  └─ organizationId = NULL
│  └─ Used as template for new organizations
│
└─ Organization Charges (Master → Organization → Charges)
   ├─ Organization A Charges (organizationId = "ORG-AAA")
   ├─ Organization B Charges (organizationId = "ORG-BBB")
   └─ Organization C Charges (organizationId = "ORG-CCC")
```

---

## ✅ Validation Rules

### B2B Charge Validation
- B2B charge cannot be greater than B2C charge
- If B2B > B2C, system shows error
- Example: ❌ B2C=500, B2B=600 (Invalid)
- Example: ✅ B2C=500, B2B=400 (Valid)

### Required Fields
- Test ID: Required
- B2C Charge: At least one charge required
- B2B Charge: At least one charge required

### Unique Constraint
- Only one charge per (test, organization) combination
- Cannot have duplicate charges for same test in same organization

---

## 🎨 UI Features

### Master → Charges Page
- **Search**: Filter tests by name, code, or group
- **Bulk Apply**: Apply same charges to multiple tests
- **Export Excel**: Download charges as Excel file
- **Export PDF**: Download charges as PDF report
- **Save**: Save all changes to database

### Organization → Charges Page
- **Search**: Filter tests by name, code, or group
- **Bulk Apply**: Apply same charges to multiple tests
- **Export Excel**: Download org charges as Excel file
- **Export PDF**: Download org charges as PDF report
- **Save**: Save all changes to database
- **Back**: Return to organization list

---

## 🔐 Data Isolation Example

```
Database Structure:

test_charges table:
┌────┬────────┬────────────────┬──────────┬──────────┐
│ id │ testId │ organizationId  │ b2cCharge│ b2bCharge│
├────┼────────┼────────────────┼──────────┼──────────┤
│ 1  │ 1      │ NULL           │ 500      │ 400      │ ← Default
│ 2  │ 2      │ NULL           │ 300      │ 250      │ ← Default
│ 3  │ 1      │ "ORG-AAA"      │ 500      │ 400      │ ← Org A
│ 4  │ 2      │ "ORG-AAA"      │ 300      │ 250      │ ← Org A
│ 5  │ 1      │ "ORG-BBB"      │ 450      │ 350      │ ← Org B (different)
│ 6  │ 2      │ "ORG-BBB"      │ 300      │ 250      │ ← Org B
└────┴────────┴────────────────┴──────────┴──────────┘

Key Points:
- organizationId = NULL → Default charges
- organizationId = "ORG-AAA" → Organization A charges
- organizationId = "ORG-BBB" → Organization B charges
- Each organization has independent charges
- Modifying one doesn't affect others
```

---

## 🚀 Quick Reference

| Task | Path | Steps |
|------|------|-------|
| Set Default Charges | Master → Charges | Enter charges, Save |
| Create Organization | Master → Organization → New | Fill details, Save |
| Modify Org Charges | Master → Organization → Charges | Edit charges, Save |
| View Org List | Master → Organization | See all organizations |
| Export Charges | Any Charges page | Click Excel/PDF button |
| Bulk Apply | Any Charges page | Click Bulk Apply button |

---

## 📞 Troubleshooting

### Q: New organization has no charges
**A**: Check if default charges exist. Go to Master → Charges and add some.

### Q: Can't modify organization charges
**A**: Make sure organization exists. Go to Master → Organization and verify.

### Q: B2B charge error
**A**: B2B cannot exceed B2C. Example: ❌ B2C=500, B2B=600. Use ✅ B2C=500, B2B=400.

### Q: Changes to default charges affected existing organizations
**A**: This shouldn't happen. Default charges only apply to new organizations.

### Q: Can't find Charges menu
**A**: Refresh browser. Charges should appear in Master module.

---

## 📝 Notes

- All charges are stored in the database with timestamps
- Each charge has effectiveFrom and effectiveTo dates
- Charges can be marked as active/inactive
- Discount percentage can be applied per charge
- Special prices can be set for specific tests
- All operations are logged with createdAt/updatedAt

---

## ✨ Summary

The charges system provides:
1. **Default charges** for consistency
2. **Organization-specific charges** for flexibility
3. **Automatic inheritance** for efficiency
4. **Complete isolation** for independence
5. **Bulk operations** for speed
6. **Export capabilities** for reporting

This ensures every organization can have the exact pricing they need while maintaining a consistent baseline.
