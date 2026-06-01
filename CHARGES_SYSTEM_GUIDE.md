# Charges System - Quick Reference Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CHARGES SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DEFAULT CHARGES (Master → Charges)                         │
│  ├─ Set charges for all tests                               │
│  ├─ Stored with organizationId = NULL                       │
│  └─ Used as template for new organizations                  │
│                                                              │
│  ORGANIZATION-SPECIFIC CHARGES                              │
│  ├─ Organization A → Charges (organizationId = ORG-AAA)     │
│  ├─ Organization B → Charges (organizationId = ORG-BBB)     │
│  └─ Each organization has independent charges               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### Step 1: Set Default Charges
1. Go to **Master → Charges**
2. Enter B2C and B2B charges for all tests
3. Click **Save**
4. ✅ Default charges are now set

### Step 2: Create Organization
1. Go to **Master → Organization → New Organization**
2. Enter organization details
3. Click **Save**
4. ✅ System automatically copies all default charges to this organization

### Step 3: Edit Organization Charges
1. Go to **Master → Organization List**
2. Find the organization
3. Click **Charges** button
4. Edit charges for that organization
5. Click **Save**
6. ✅ Only this organization's charges are updated

## Key Features

### Default Charges Page (Master → Charges)
- ✅ View all tests with their default charges
- ✅ Edit B2C and B2B charges
- ✅ Bulk apply charges to all tests
- ✅ Search by test name, code, or group
- ✅ Export to Excel/PDF
- ✅ Validation: B2B ≤ B2C

### Organization Charges Page (Master → Organization → Charges)
- ✅ View all tests with organization-specific charges
- ✅ Edit B2C and B2B charges for this organization only
- ✅ Bulk apply charges to all tests
- ✅ Search by test name, code, or group
- ✅ Export to Excel/PDF
- ✅ Validation: B2B ≤ B2C

## Important Rules

### ✅ DO
- Set default charges first in Master → Charges
- Create organizations after setting defaults (auto-copies charges)
- Edit organization charges independently
- Use bulk apply for faster updates
- Export charges for backup/reference

### ❌ DON'T
- Modify default charges after creating organizations (won't affect existing orgs)
- Expect organization charges to update when defaults change
- Set B2B charge higher than B2C charge
- Delete default charges if organizations depend on them

## Charge Isolation Example

```
DEFAULT CHARGES (organizationId = NULL)
├─ Test 1: B2C=100, B2B=80
├─ Test 2: B2C=200, B2B=150
└─ Test 3: B2C=300, B2B=250

ORGANIZATION A (ORG-AAA)
├─ Test 1: B2C=100, B2B=80      ← Copied from default
├─ Test 2: B2C=200, B2B=150     ← Copied from default
└─ Test 3: B2C=300, B2B=250     ← Copied from default

ORGANIZATION B (ORG-BBB)
├─ Test 1: B2C=100, B2B=80      ← Copied from default
├─ Test 2: B2C=200, B2B=150     ← Copied from default
└─ Test 3: B2C=300, B2B=250     ← Copied from default

AFTER EDITING ORG-A TEST 1 TO B2C=120, B2B=90:

DEFAULT CHARGES (organizationId = NULL)
├─ Test 1: B2C=100, B2B=80      ← UNCHANGED
├─ Test 2: B2C=200, B2B=150
└─ Test 3: B2C=300, B2B=250

ORGANIZATION A (ORG-AAA)
├─ Test 1: B2C=120, B2B=90      ← CHANGED
├─ Test 2: B2C=200, B2B=150
└─ Test 3: B2C=300, B2B=250

ORGANIZATION B (ORG-BBB)
├─ Test 1: B2C=100, B2B=80      ← UNCHANGED
├─ Test 2: B2C=200, B2B=150
└─ Test 3: B2C=300, B2B=250
```

## API Endpoints

### Default Charges
```
GET  /api/master/test-charges/all
     → Returns all charges (default + organization-specific)

POST /api/master/test-charges/bulk
     Body: { charges: [...] }
     → Saves default charges (no organizationId)
```

### Organization Charges
```
GET  /api/master/organizations/:organizationId/charges
     → Returns charges for specific organization

POST /api/master/test-charges/bulk
     Body: { organizationId: "ORG-AAA", charges: [...] }
     → Saves organization-specific charges
```

## Troubleshooting

### Q: I created an organization but it has no charges
**A**: Make sure you set default charges first in Master → Charges before creating the organization.

### Q: I edited default charges but organization charges didn't change
**A**: This is correct behavior! Organization charges are independent. You need to edit them separately in Organization → Charges.

### Q: Can I set different charges for the same test in different organizations?
**A**: Yes! Each organization has its own independent charges. This is the whole point of the system.

### Q: What happens if I delete default charges?
**A**: Existing organization charges are not affected. But new organizations won't have charges copied.

### Q: Can I bulk update charges for multiple organizations at once?
**A**: Not directly. You need to edit each organization's charges separately. But you can use Bulk Apply within each organization.

## Best Practices

1. **Set defaults first**: Always set default charges before creating organizations
2. **Use bulk apply**: For faster updates, use Bulk Apply instead of editing each test
3. **Regular backups**: Export charges to Excel/PDF regularly for backup
4. **Document changes**: Keep track of why charges were changed
5. **Test before saving**: Review changes before clicking Save
6. **Validate charges**: Ensure B2B ≤ B2C for all tests

## Support

For issues or questions:
1. Check the IMPLEMENTATION_SUMMARY.md for technical details
2. Review the database schema in prisma/schema.prisma
3. Check backend logs for API errors
4. Verify database migrations are applied: `npx prisma migrate deploy`
