# Quick Start Guide - Charges System

## What's New?

The charges system now works with a **two-tier hierarchy**:

### Tier 1: Default Charges (Master Module)
- **Where**: Master → Charges
- **What**: Set charges that apply to ALL new organizations by default
- **Who**: Admin sets these once
- **Impact**: Only affects NEW organizations created after this point

### Tier 2: Organization-Specific Charges
- **Where**: Master → Organization → [Select Org] → Charges
- **What**: Modify charges for a specific organization
- **Who**: Admin can change per organization
- **Impact**: Only affects that specific organization

---

## Step-by-Step Guide

### Step 1: Set Default Charges (First Time Setup)

1. Go to **Master → Charges**
2. You'll see all tests in the system
3. For each test, enter:
   - **Charges**: B2C price (customer price)
   - **B2B**: B2B price (corporate price)
4. Use **Bulk Apply** to quickly set same charges for multiple tests
5. Click **Save**

✅ **Result**: Default charges are now set. All new organizations will get these charges automatically.

---

### Step 2: Create New Organization

1. Go to **Master → Organization → New Organization**
2. Fill in organization details:
   - Name
   - Location
   - Email
   - Mobile
   - Address
   - Date of Establishment
3. **(Optional)** Add specific charges in the "Test Charges" table
   - If you add charges here, they'll be used instead of defaults
   - If you leave it empty, default charges will be copied automatically
4. Click **Save**

✅ **Result**: Organization created with charges (either provided or copied from defaults)

---

### Step 3: Modify Organization Charges

1. Go to **Master → Organization**
2. Find the organization in the list
3. Click **Charges** button
4. Modify charges for that organization:
   - Search for specific tests
   - Change B2C and B2B prices
   - Use **Bulk Apply** for multiple tests
5. Click **Save**

✅ **Result**: Only this organization's charges are updated. Other organizations are NOT affected.

---

### Step 4: Update Default Charges

1. Go to **Master → Charges**
2. Modify the charges
3. Click **Save**

⚠️ **Important**: This only affects NEW organizations created after this point. Existing organizations keep their current charges.

---

## Key Points to Remember

| Feature | Default Charges | Organization Charges |
|---------|-----------------|----------------------|
| **Location** | Master → Charges | Master → Organization → Charges |
| **Affects** | New organizations only | Specific organization only |
| **Isolation** | Shared template | Independent per org |
| **Edit Impact** | Only new orgs | Only that org |
| **Use Case** | Set company-wide baseline | Customize per location/client |

---

## Common Scenarios

### Scenario 1: New Lab Branch
1. Set default charges in Master → Charges
2. Create new organization for branch
3. System automatically copies default charges
4. Done! Branch has same charges as main lab

### Scenario 2: Special Pricing for VIP Client
1. Create organization for VIP client
2. Go to Organization → Charges
3. Modify charges (e.g., 10% discount)
4. Save
5. Only this client gets special pricing

### Scenario 3: Update All Charges
1. Go to Master → Charges
2. Use Bulk Apply to set new charges for all tests
3. Save
4. **Note**: Only affects new organizations created after this
5. For existing orgs, update each one individually or use bulk API

### Scenario 4: Copy Charges from One Org to Another
1. Go to Organization A → Charges
2. Export to Excel
3. Go to Organization B → Charges
4. Manually enter or import charges
5. Save

---

## API Usage (For Developers)

### Get Default Charges
```bash
GET /api/master/test-charges/all
```

### Get Organization Charges
```bash
GET /api/master/organizations/{orgId}/charges
```

### Create Organization with Charges
```bash
POST /api/master/organizations
{
  "name": "Branch Lab",
  "location": "Pune",
  "email": "branch@lab.com",
  "mobile": "9876543210",
  "address": "123 Main St",
  "date": "2026-05-31",
  "testCharges": [
    {
      "testId": 1,
      "b2cCharge": 500,
      "b2bCharge": 400
    }
  ]
}
```

### Bulk Update Charges
```bash
POST /api/master/test-charges/bulk
{
  "organizationId": "ORG-AAA",
  "charges": [
    {
      "testId": 1,
      "b2cCharge": 500,
      "b2bCharge": 400
    },
    {
      "testId": 2,
      "b2cCharge": 300,
      "b2bCharge": 250
    }
  ]
}
```

---

## Troubleshooting

### Q: I created an organization but it has no charges
**A**: Check if default charges exist. Go to Master → Charges and add some charges first.

### Q: I modified default charges but existing organizations weren't affected
**A**: That's correct! Default charges only apply to NEW organizations. To update existing orgs, go to each organization's charges page.

### Q: Can I have different charges for the same test in different organizations?
**A**: Yes! Each organization has completely independent charges. You can set any price for any test per organization.

### Q: What happens if I delete an organization?
**A**: The organization and all its charges are deleted. Default charges are NOT affected.

---

## Support

For issues or questions:
1. Check the full documentation: `CHARGES_SYSTEM_IMPLEMENTATION.md`
2. Review the API endpoints in the backend routes
3. Check the database schema in `prisma/schema.prisma`
