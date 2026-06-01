# Charges System Implementation - Complete Guide

## Overview
The charges system has been implemented with a hierarchical structure:
1. **Default Charges** - Set in Master → Charges (applies to all organizations by default)
2. **Organization-Specific Charges** - Set per organization, independent from other organizations

## System Architecture

### 1. Default Charges (Master Module)
**Location**: `/master/charges`

**Features**:
- View all tests with their default charges
- Set B2C and B2B charges for each test
- Bulk apply charges to multiple tests
- Search and filter tests
- Export to Excel/PDF

**How it works**:
- Charges are stored with `organizationId = null` in the database
- When a new organization is created, these default charges are automatically copied to that organization
- Modifying default charges does NOT affect existing organizations

### 2. Organization-Specific Charges
**Location**: `/master/organization/charges/[organizationId]`

**Features**:
- View and edit charges for a specific organization
- Each organization has independent charges
- Bulk apply charges
- Search and filter tests
- Export to Excel/PDF

**How it works**:
- Each organization has its own set of test charges
- Changes to one organization's charges don't affect others
- Charges are stored with the specific `organizationId`

### 3. Organization Management
**Location**: `/master/organization`

**Features**:
- Create new organizations
- Edit existing organizations
- View organization details
- Manage charges for each organization
- Delete organizations

**When Creating Organization**:
1. Admin enters organization details (name, location, email, etc.)
2. Optionally adds specific test charges
3. If no charges are provided, system automatically copies all DEFAULT charges
4. Organization is created with its own independent charge set

## Database Schema

### TestCharge Model
```prisma
model TestCharge {
  id                Int           @id @default(autoincrement())
  testId            Int
  organizationId    String?       // NULL for default charges, specific ID for org charges
  b2cCharge         Float
  b2bCharge         Float
  discountPercent   Float?        @default(0)
  specialPrice      Float?
  effectiveFrom     DateTime      @default(now())
  effectiveTo       DateTime?
  isActive          Boolean       @default(true)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  organization      Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  test              Test          @relation(fields: [testId], references: [id], onDelete: Cascade)

  @@unique([testId, organizationId])
  @@index([organizationId], map: "test_charges_organizationId_fkey")
  @@map("test_charges")
}
```

## API Endpoints

### Default Charges (Master)
- `GET /api/master/test-charges/all` - Get all charges (with optional organizationId filter)
- `POST /api/master/test-charges/bulk` - Bulk create/update charges (no organizationId = default)

### Organization Charges
- `GET /api/master/organizations/:organizationId/charges` - Get charges for specific organization
- `POST /api/master/test-charges` - Create single charge for organization
- `PUT /api/master/test-charges/:id` - Update charge
- `DELETE /api/master/test-charges/:id` - Delete charge
- `POST /api/master/test-charges/bulk` - Bulk create/update charges for organization

### Organization Management
- `GET /api/master/organizations` - List all organizations
- `GET /api/master/organizations/:id` - Get organization details
- `POST /api/master/organizations` - Create organization (with optional testCharges array)
- `PUT /api/master/organizations/:id` - Update organization
- `DELETE /api/master/organizations/:id` - Delete organization

## Frontend API Functions

### Added to `frontend/src/api/master.ts`

```typescript
// Get charges for specific test or organization
export const getTestCharges = async (testId?: string, organizationId?: string): Promise<any[]>

// Get all charges for an organization
export const getOrganizationCharges = async (organizationId: string): Promise<any[]>

// Create single test charge
export const createTestCharge = async (d: ApiData): Promise<any>

// Update test charge
export const updateTestCharge = async (id: string, d: ApiData): Promise<any>

// Delete test charge
export const deleteTestCharge = async (id: string): Promise<ApiResponse>

// Bulk create/update charges
export const bulkCreateTestCharges = async (d: ApiData): Promise<any>
```

## User Workflows

### Workflow 1: Set Default Charges
1. Go to Master → Charges
2. Search for tests
3. Enter B2C and B2B charges
4. Use "Bulk Apply" to apply same charges to multiple tests
5. Click "Save" to save default charges

### Workflow 2: Create New Organization with Charges
1. Go to Master → Organization → New Organization
2. Enter organization details (name, location, email, etc.)
3. (Optional) Add specific test charges in the table
4. Click "Save"
5. System automatically:
   - Creates organization
   - Copies all DEFAULT charges to this organization
   - OR uses provided charges if specified
   - Creates login credentials

### Workflow 3: Modify Organization Charges
1. Go to Master → Organization
2. Click "Charges" button for desired organization
3. Search and modify charges for that organization
4. Use "Bulk Apply" if needed
5. Click "Save"
6. Changes apply ONLY to this organization

### Workflow 4: Update Default Charges
1. Go to Master → Charges
2. Modify charges
3. Click "Save"
4. **Important**: This only affects NEW organizations created after this point
5. Existing organizations keep their current charges

## Key Features

### Isolation
- Each organization has completely independent charges
- Modifying one organization's charges doesn't affect others
- Default charges are separate from organization charges

### Automatic Inheritance
- New organizations automatically inherit default charges
- Can be overridden by providing specific charges during creation
- Provides consistency across organizations

### Bulk Operations
- Bulk apply charges to multiple tests at once
- Bulk create/update charges via API
- Efficient for large-scale updates

### Validation
- B2B charge cannot exceed B2C charge
- Required fields validation
- Unique constraint on (testId, organizationId) pair

### Audit Trail
- All charges have createdAt and updatedAt timestamps
- Effective date ranges (effectiveFrom, effectiveTo)
- Active/Inactive status

## Important Notes

1. **Default Charges**: Stored with `organizationId = null`
2. **Organization Charges**: Stored with specific `organizationId`
3. **Unique Constraint**: Only one charge per (test, organization) combination
4. **Cascade Delete**: Deleting organization deletes all its charges
5. **Email Notifications**: Organization creation sends credentials to email

## Troubleshooting

### Issue: New organization doesn't have charges
**Solution**: Check if default charges exist. If not, create them in Master → Charges first.

### Issue: Modifying default charges affects existing organizations
**Solution**: This should NOT happen. Default charges only apply to new organizations. If it does, check the organizationId field in database.

### Issue: Can't create charge for organization
**Solution**: Ensure organization exists and test exists. Check unique constraint on (testId, organizationId).

## Future Enhancements

1. Charge history/versioning
2. Charge approval workflow
3. Scheduled charge changes
4. Charge templates
5. Charge comparison between organizations
6. Charge analytics and reporting
