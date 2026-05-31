# Visual Guide - Charges System

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SHRADDHA PATHOLOGY LAB                   │
│                      CHARGES SYSTEM                         │
└─────────────────────────────────────────────────────────────┘

                          MASTER MODULE
                                │
                    ┌───────────┴───────────┐
                    │                       │
              CHARGES (Default)      ORGANIZATION
                    │                       │
         ┌──────────┴──────────┐    ┌──────┴──────┐
         │                     │    │             │
    Set Charges          Bulk Apply  Create Org  Manage Charges
    for all tests        to tests    with charges per org
         │                     │    │             │
         └──────────┬──────────┘    └──────┬──────┘
                    │                      │
            organizationId = NULL   organizationId = "ORG-AAA"
            (Default charges)       (Organization charges)
```

---

## 📍 Navigation Map

```
DASHBOARD
    │
    └─ MASTER
        │
        ├─ Tests
        ├─ Test Template
        ├─ Department
        ├─ Packages
        ├─ Charges ✅ NEW
        │   └─ Set default charges for all tests
        │   └─ Bulk apply charges
        │   └─ Export to Excel/PDF
        │
        ├─ Roles
        ├─ Users
        ├─ Referral Doctors
        ├─ Organization
        │   ├─ List all organizations
        │   ├─ Create new organization
        │   │   └─ Add test charges (optional)
        │   ├─ Edit organization
        │   ├─ View organization
        │   └─ Charges ✅ NEW
        │       └─ Manage charges for specific organization
        │       └─ Bulk apply charges
        │       └─ Export to Excel/PDF
        │
        ├─ Specimen Type
        └─ Units
```

---

## 🔄 Workflow Diagram

### Workflow 1: Set Default Charges

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Go to Master → Charges                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: View all tests with search filters                  │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Test Name    │ Code  │ Group      │ Charges │ B2B   │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ Blood Test   │ BT001 │ Hematology │ 500     │ 400   │   │
│ │ Urine Test   │ UT001 │ Pathology  │ 300     │ 250   │   │
│ │ Sugar Test   │ ST001 │ Biochem    │ 200     │ 150   │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Enter charges for each test                         │
│ - B2C Charge: Customer price                                │
│ - B2B Charge: Corporate price                               │
│ - Use Bulk Apply for multiple tests                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Click Save                                          │
│ ✅ Default charges saved (organizationId = NULL)            │
└─────────────────────────────────────────────────────────────┘
```

### Workflow 2: Create Organization

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Go to Master → Organization → New Organization     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Fill organization details                           │
│ - Name: Main Lab                                            │
│ - Location: Pune                                            │
│ - Email: mainlab@shraddha.com                               │
│ - Mobile: 9876543210                                        │
│ - Address: 123 Main Street                                  │
│ - Date: 2026-05-31                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: (Optional) Add test charges                         │
│ - Click "Add Charge" button                                 │
│ - Select test from dropdown                                 │
│ - Enter B2C and B2B charges                                 │
│ - Repeat for more tests                                     │
│                                                              │
│ If NO charges added:                                        │
│ → System copies all DEFAULT charges                         │
│                                                              │
│ If charges added:                                           │
│ → System uses provided charges                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Click Save                                          │
│ ✅ Organization created with charges                        │
│ ✅ Login credentials sent to email                          │
└─────────────────────────────────────────────────────────────┘
```

### Workflow 3: Modify Organization Charges

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Go to Master → Organization                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Find organization in list                           │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ID      │ Name      │ Location │ Actions            │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ ORG-AAA │ Main Lab  │ Pune     │ View Edit Charges  │   │
│ │ ORG-BBB │ Branch    │ Mumbai   │ View Edit Charges  │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Click "Charges" button                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: View charges for this organization                  │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Test Name    │ Code  │ Group      │ Charges │ B2B   │   │
│ ├──────────────────────────────────────────────────────┤   │
│ │ Blood Test   │ BT001 │ Hematology │ 500     │ 400   │   │
│ │ Urine Test   │ UT001 │ Pathology  │ 300     │ 250   │   │
│ │ Sugar Test   │ ST001 │ Biochem    │ 200     │ 150   │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Modify charges                                      │
│ - Edit individual charges                                   │
│ - Use Bulk Apply for multiple tests                         │
│ - Search for specific tests                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Click Save                                          │
│ ✅ Only this organization's charges updated                 │
│ ✅ Other organizations NOT affected                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Structure

### Default Charges (organizationId = NULL)

```
┌─────────────────────────────────────────────────────────────┐
│                    DEFAULT CHARGES                          │
│                  (organizationId = NULL)                    │
├─────────────────────────────────────────────────────────────┤
│ Test ID │ Test Name    │ B2C Charge │ B2B Charge │ Active  │
├─────────────────────────────────────────────────────────────┤
│ 1       │ Blood Test   │ 500        │ 400        │ Yes     │
│ 2       │ Urine Test   │ 300        │ 250        │ Yes     │
│ 3       │ Sugar Test   │ 200        │ 150        │ Yes     │
│ 4       │ Thyroid Test │ 600        │ 500        │ Yes     │
└─────────────────────────────────────────────────────────────┘
         ↓
    Used as template for new organizations
```

### Organization A Charges (organizationId = "ORG-AAA")

```
┌─────────────────────────────────────────────────────────────┐
│              ORGANIZATION A CHARGES                         │
│            (organizationId = "ORG-AAA")                     │
├─────────────────────────────────────────────────────────────┤
│ Test ID │ Test Name    │ B2C Charge │ B2B Charge │ Active  │
├─────────────────────────────────────────────────────────────┤
│ 1       │ Blood Test   │ 500        │ 400        │ Yes     │
│ 2       │ Urine Test   │ 300        │ 250        │ Yes     │
│ 3       │ Sugar Test   │ 200        │ 150        │ Yes     │
│ 4       │ Thyroid Test │ 600        │ 500        │ Yes     │
└─────────────────────────────────────────────────────────────┘
         ↓
    Independent from other organizations
```

### Organization B Charges (organizationId = "ORG-BBB")

```
┌─────────────────────────────────────────────────────────────┐
│              ORGANIZATION B CHARGES                         │
│            (organizationId = "ORG-BBB")                     │
├─────────────────────────────────────────────────────────────┤
│ Test ID │ Test Name    │ B2C Charge │ B2B Charge │ Active  │
├─────────────────────────────────────────────────────────────┤
│ 1       │ Blood Test   │ 450        │ 350        │ Yes     │ ← Different
│ 2       │ Urine Test   │ 300        │ 250        │ Yes     │
│ 3       │ Sugar Test   │ 200        │ 150        │ Yes     │
│ 4       │ Thyroid Test │ 600        │ 500        │ Yes     │
└─────────────────────────────────────────────────────────────┘
         ↓
    Independent from other organizations
```

---

## 🔄 Charge Inheritance

### Scenario 1: Create Organization with Default Charges

```
DEFAULT CHARGES                    NEW ORGANIZATION
(organizationId = NULL)            (organizationId = "ORG-CCC")
┌──────────────────────┐          ┌──────────────────────┐
│ Blood Test: 500/400  │          │ Blood Test: 500/400  │
│ Urine Test: 300/250  │  ──────→ │ Urine Test: 300/250  │
│ Sugar Test: 200/150  │          │ Sugar Test: 200/150  │
│ Thyroid: 600/500     │          │ Thyroid: 600/500     │
└──────────────────────┘          └──────────────────────┘
                                   (Copied automatically)
```

### Scenario 2: Create Organization with Custom Charges

```
CUSTOM CHARGES PROVIDED            NEW ORGANIZATION
(From user input)                  (organizationId = "ORG-DDD")
┌──────────────────────┐          ┌──────────────────────┐
│ Blood Test: 450/350  │          │ Blood Test: 450/350  │
│ Urine Test: 280/230  │  ──────→ │ Urine Test: 280/230  │
│ Sugar Test: 180/130  │          │ Sugar Test: 180/130  │
│ Thyroid: 550/450     │          │ Thyroid: 550/450     │
└──────────────────────┘          └──────────────────────┘
                                   (Used as provided)
```

### Scenario 3: Modify Organization Charges

```
ORGANIZATION A BEFORE              ORGANIZATION A AFTER
(organizationId = "ORG-AAA")       (organizationId = "ORG-AAA")
┌──────────────────────┐          ┌──────────────────────┐
│ Blood Test: 500/400  │          │ Blood Test: 450/350  │ ← Changed
│ Urine Test: 300/250  │  ──────→ │ Urine Test: 300/250  │
│ Sugar Test: 200/150  │          │ Sugar Test: 200/150  │
│ Thyroid: 600/500     │          │ Thyroid: 600/500     │
└──────────────────────┘          └──────────────────────┘

OTHER ORGANIZATIONS UNAFFECTED:
┌──────────────────────┐
│ Blood Test: 500/400  │ ← Still 500/400
│ Urine Test: 300/250  │
│ Sugar Test: 200/150  │
│ Thyroid: 600/500     │
└──────────────────────┘
```

---

## 🎨 UI Components

### Master → Charges Page

```
┌─────────────────────────────────────────────────────────────┐
│ LAB CHARGES                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [Search by Name] [Search by Code] [Search by Group]        │
│ [Reset] [Save] [Bulk Apply] [Excel] [PDF]                  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Test Name    │ Code  │ Group      │ Charges │ B2B          │
├─────────────────────────────────────────────────────────────┤
│ Blood Test   │ BT001 │ Hematology │ [500]   │ [400]        │
│ Urine Test   │ UT001 │ Pathology  │ [300]   │ [250]        │
│ Sugar Test   │ ST001 │ Biochem    │ [200]   │ [150]        │
│ Thyroid Test │ TT001 │ Endocrine  │ [600]   │ [500]        │
└─────────────────────────────────────────────────────────────┘
```

### Organization → Charges Page

```
┌─────────────────────────────────────────────────────────────┐
│ MAIN LAB - TEST CHARGES                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [Search by Name] [Search by Code] [Search by Group]        │
│ [Reset] [Save] [Bulk Apply] [Excel] [PDF] [Back]           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Test Name    │ Code  │ Group      │ Charges │ B2B          │
├─────────────────────────────────────────────────────────────┤
│ Blood Test   │ BT001 │ Hematology │ [500]   │ [400]        │
│ Urine Test   │ UT001 │ Pathology  │ [300]   │ [250]        │
│ Sugar Test   │ ST001 │ Biochem    │ [200]   │ [150]        │
│ Thyroid Test │ TT001 │ Endocrine  │ [600]   │ [500]        │
└─────────────────────────────────────────────────────────────┘
```

### Organization Add Page

```
┌─────────────────────────────────────────────────────────────┐
│ ADD ORGANIZATION                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Name: [Main Lab]                                            │
│ Code: [ML]                                                  │
│ Location: [Pune]                                            │
│ Mobile: [9876543210]                                        │
│ Email: [mainlab@shraddha.com]                               │
│ Address: [123 Main Street]                                  │
│ Date: [2026-05-31]                                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ TEST CHARGES (Optional)                                     │
│ [+ Add Charge]                                              │
│                                                              │
│ Test Name    │ B2C Charge │ B2B Charge │ Action            │
│ [Select Test]│ [500]      │ [400]      │ [Delete]          │
│ [Select Test]│ [300]      │ [250]      │ [Delete]          │
│                                                              │
│ No test charges added. Default charges will be copied.     │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ [Save] [Cancel]                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Data Isolation Example

### Before Modification

```
Database: test_charges table

┌────┬────────┬────────────────┬──────────┬──────────┐
│ id │ testId │ organizationId  │ b2cCharge│ b2bCharge│
├────┼────────┼────────────────┼──────────┼──────────┤
│ 1  │ 1      │ NULL           │ 500      │ 400      │ ← Default
│ 2  │ 2      │ NULL           │ 300      │ 250      │ ← Default
│ 3  │ 1      │ "ORG-AAA"      │ 500      │ 400      │ ← Org A
│ 4  │ 2      │ "ORG-AAA"      │ 300      │ 250      │ ← Org A
│ 5  │ 1      │ "ORG-BBB"      │ 500      │ 400      │ ← Org B
│ 6  │ 2      │ "ORG-BBB"      │ 300      │ 250      │ ← Org B
└────┴────────┴────────────────┴──────────┴──────────┘
```

### After Modifying Organization A

```
Database: test_charges table

┌────┬────────┬────────────────┬──────────┬──────────┐
│ id │ testId │ organizationId  │ b2cCharge│ b2bCharge│
├────┼────────┼────────────────┼──────────┼──────────┤
│ 1  │ 1      │ NULL           │ 500      │ 400      │ ← Default (unchanged)
│ 2  │ 2      │ NULL           │ 300      │ 250      │ ← Default (unchanged)
│ 3  │ 1      │ "ORG-AAA"      │ 450      │ 350      │ ← Org A (CHANGED)
│ 4  │ 2      │ "ORG-AAA"      │ 300      │ 250      │ ← Org A (unchanged)
│ 5  │ 1      │ "ORG-BBB"      │ 500      │ 400      │ ← Org B (unchanged)
│ 6  │ 2      │ "ORG-BBB"      │ 300      │ 250      │ ← Org B (unchanged)
└────┴────────┴────────────────┴──────────┴──────────┘

Key Points:
✅ Only Org A's Blood Test charge changed (500→450)
✅ Default charges unchanged
✅ Org B charges unchanged
✅ Complete isolation maintained
```

---

## ✅ Checklist

- [ ] Refresh browser
- [ ] See "Charges" in Master sidebar
- [ ] Go to Master → Charges
- [ ] Set default charges
- [ ] Go to Master → Organization
- [ ] Create new organization
- [ ] Add test charges (optional)
- [ ] Save organization
- [ ] Click Charges button
- [ ] Modify organization charges
- [ ] Verify other organizations unaffected
- [ ] Read documentation

---

## 🎯 Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    CHARGES SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ Default Charges (Master → Charges)                       │
│    └─ Set charges for all tests                             │
│    └─ Used as template for new organizations                │
│                                                              │
│ ✅ Organization Charges (Master → Organization → Charges)   │
│    └─ Modify charges per organization                       │
│    └─ Complete isolation from other organizations           │
│                                                              │
│ ✅ Automatic Inheritance                                    │
│    └─ New organizations get default charges                 │
│    └─ Can be overridden with custom charges                 │
│                                                              │
│ ✅ Independent Management                                   │
│    └─ Each organization has own charges                     │
│    └─ Modifying one doesn't affect others                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**The system is ready to use!**
