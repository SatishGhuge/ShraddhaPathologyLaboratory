# Charges System - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Set Default Charges (2 minutes)
```
1. Go to Master → Charges
2. Enter charges for all tests
3. Click Save
✅ Done! Default charges are set
```

### Step 2: Create Organization (1 minute)
```
1. Go to Master → Organization → New Organization
2. Enter name, location, email
3. Click Save
✅ Done! Organization created with auto-copied charges
```

### Step 3: Edit Organization Charges (1 minute)
```
1. Go to Master → Organization List
2. Find organization
3. Click "Charges" button
4. Edit charges
5. Click Save
✅ Done! Organization charges updated
```

### Step 4: Export Charges (1 minute)
```
1. Go to Master → Charges (or Organization → Charges)
2. Click "Excel" or "PDF" button
3. File downloads
✅ Done! Charges exported
```

---

## 📋 Key Concepts

### Default Charges
- Set in Master → Charges
- Applied to all new organizations automatically
- Stored with `organizationId = NULL`

### Organization Charges
- Specific to each organization
- Edited in Organization → Charges
- Independent from other organizations
- Stored with `organizationId = ORG-XXX`

### Isolation
- Each organization has its own charges
- Changing one org's charges doesn't affect others
- Changing default charges doesn't affect existing orgs

---

## 🎯 Common Tasks

### Task 1: Set Charges for All Tests
```
Master → Charges
├─ Enter B2C and B2B for each test
├─ OR use "Bulk Apply" for all tests at once
└─ Click Save
```

### Task 2: Create New Organization
```
Master → Organization → New Organization
├─ Enter name, location, email
├─ System auto-copies default charges
└─ Click Save
```

### Task 3: Change Charges for One Organization
```
Master → Organization List
├─ Find organization
├─ Click "Charges" button
├─ Edit charges
└─ Click Save
```

### Task 4: Bulk Update Charges
```
Master → Charges (or Organization → Charges)
├─ Click "Bulk Apply" button
├─ Enter B2C and B2B charges
├─ Click "Apply to All"
└─ Click Save
```

### Task 5: Export Charges
```
Master → Charges (or Organization → Charges)
├─ Click "Excel" for Excel file
├─ OR Click "PDF" for PDF file
└─ File downloads to your computer
```

---

## ⚠️ Important Rules

### ✅ DO
- Set default charges first
- Create organizations after setting defaults
- Edit organization charges independently
- Use bulk apply for faster updates
- Export charges regularly

### ❌ DON'T
- Set B2B higher than B2C
- Expect org charges to update when defaults change
- Delete default charges if orgs depend on them
- Modify charges without saving

---

## 🔍 Verification

### How to Verify Default Charges
```
Master → Charges
├─ Should show all tests
├─ Should show B2C and B2B charges
└─ Should save successfully
```

### How to Verify Organization Charges
```
Master → Organization List
├─ Find organization
├─ Click "Charges" button
├─ Should show charges for that org only
└─ Should save successfully
```

### How to Verify Isolation
```
1. Edit charges for Organization A
2. Go to Organization B → Charges
3. Verify Organization B charges are unchanged
4. Go to Master → Charges
5. Verify default charges are unchanged
✅ Isolation working correctly
```

---

## 🐛 Troubleshooting

### Problem: Organization has no charges
**Solution**: Set default charges first, then create organization

### Problem: Can't save charges - B2B error
**Solution**: Make sure B2B ≤ B2C for all tests

### Problem: Changes to default charges don't affect organizations
**Solution**: This is correct! Edit each organization separately

### Problem: Can't find Charges button
**Solution**: Go to Master → Organization List, scroll right in table

---

## 📊 Database Queries

### View Default Charges
```sql
SELECT * FROM test_charges WHERE organizationId IS NULL;
```

### View Organization Charges
```sql
SELECT * FROM test_charges WHERE organizationId = 'ORG-AAA';
```

### View All Charges
```sql
SELECT * FROM test_charges;
```

### Count Charges
```sql
SELECT organizationId, COUNT(*) as count FROM test_charges GROUP BY organizationId;
```

---

## 🎓 Learning Path

1. **Beginner**: Read this Quick Start guide
2. **Intermediate**: Read CHARGES_SYSTEM_GUIDE.md
3. **Advanced**: Read CHARGES_WORKFLOW.md
4. **Expert**: Read IMPLEMENTATION_SUMMARY.md

---

## 📞 Support

### For Questions About:
- **How to use**: See CHARGES_SYSTEM_GUIDE.md
- **Workflow**: See CHARGES_WORKFLOW.md
- **Technical details**: See IMPLEMENTATION_SUMMARY.md
- **Testing**: See TESTING_CHECKLIST.md

---

## ✅ Checklist

- [ ] Read this Quick Start guide
- [ ] Set default charges
- [ ] Create test organization
- [ ] Edit organization charges
- [ ] Verify isolation
- [ ] Export charges
- [ ] Read full documentation
- [ ] Run testing checklist

---

## 🎉 You're Ready!

You now understand the charges system. Start using it:

1. **Master → Charges** - Set default charges
2. **Master → Organization** - Create organizations
3. **Master → Organization → Charges** - Edit org charges
4. **Export** - Backup charges regularly

**Questions?** See the full documentation files.

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| QUICK_START.md | This file - Get started quickly |
| CHARGES_SYSTEM_GUIDE.md | Complete system overview |
| CHARGES_WORKFLOW.md | Detailed step-by-step workflow |
| IMPLEMENTATION_SUMMARY.md | Technical implementation details |
| TESTING_CHECKLIST.md | Comprehensive testing guide |
| CHANGES_MADE.md | List of all changes made |

---

## 🚀 Next Steps

1. ✅ Understand the system (this guide)
2. ⏳ Set up default charges
3. ⏳ Create organizations
4. ⏳ Test the system
5. ⏳ Train users
6. ⏳ Go live

---

**Happy charging! 💰**
