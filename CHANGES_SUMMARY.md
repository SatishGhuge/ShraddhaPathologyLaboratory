# Backend Changes Summary - Organization-Based Test Charges

## 📋 Overview
Updated the test charges system to work exclusively with **Organizations** instead of Franchise, Collection Center, and Corporate entities. This provides a cleaner, more maintainable pricing structure.

---

## 🔄 Prisma Schema Changes

### TestCharge Model
**Before:**
```prisma
model TestCharge {
  id                Int
  testId            Int
  franchiseId       String?
  corporateId       Int?
  collectionCenterId String?
  b2cCharge         Float
  b2bCharge         Float
  ...
}
```

**After:**
```prisma
model TestCharge {
  id                Int
  testId            Int
  organizationId    String?        // ✅ Only organization reference
  b2cCharge         Float
  b2bCharge         Float
  discountPercent   Float?
  specialPrice      Float?
  effectiveFrom     DateTime
  effectiveTo       DateTime?
  isActive          Boolean
  organization      Organization?  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  test              Test           @relation(fields: [testId], references: [id], onDelete: Cascade)
  
  @@unique([testId, organizationId])
}
```

---

## 🔌 Backend API Endpoints

### Test Charges Endpoints

#### 1. **Get All Test Charges** (with filters)
```
GET /api/master/test-charges/all?organizationId=ORG-AAA
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "testId": 1,
      "organizationId": "ORG-AAA",
      "b2cCharge": 330,
      "b2bCharge": 105,
      "test": {
        "id": 1,
        "name": "Platelet Count",
        "shortName": "PC",
        "department": { "name": "Haematology" }
      },
      "organization": {
        "id": "ORG-AAA",
        "name": "Main Lab",
        "location": "Pune"
      }
    }
  ]
}
```

#### 2. **Get Charges for Specific Test**
```
GET /api/master/tests/:testId/charges
```

#### 3. **Get Charges for Specific Organization**
```
GET /api/master/organizations/:organizationId/charges
```

#### 4. **Create Test Charge**
```
POST /api/master/test-charges
Content-Type: application/json

{
  "testId": 1,
  "organizationId": "ORG-AAA",
  "b2cCharge": 330,
  "b2bCharge": 105,
  "discountPercent": 0,
  "specialPrice": null,
  "effectiveFrom": "2026-05-31",
  "effectiveTo": null
}
```

#### 5. **Update Test Charge**
```
PUT /api/master/test-charges/:id
Content-Type: application/json

{
  "b2cCharge": 350,
  "b2bCharge": 120,
  "discountPercent": 5,
  "isActive": true
}
```

#### 6. **Delete Test Charge**
```
DELETE /api/master/test-charges/:id
```

#### 7. **Bulk Create/Update Test Charges** (NEW)
```
POST /api/master/test-charges/bulk
Content-Type: application/json

{
  "organizationId": "ORG-AAA",
  "charges": [
    {
      "testId": 1,
      "b2cCharge": 330,
      "b2bCharge": 105,
      "discountPercent": 0
    },
    {
      "testId": 2,
      "b2cCharge": 313,
      "b2bCharge": 202,
      "discountPercent": 0
    }
  ]
}
```

---

## 🏢 Organization Endpoints (Enhanced)

### Create Organization with Test Charges (NEW)
```
POST /api/master/organizations
Content-Type: application/json

{
  "name": "New Lab",
  "code": "NL001",
  "location": "Mumbai",
  "address": "Lab Address",
  "mobile": "9876543210",
  "email": "lab@shraddha.com",
  "testCharges": [
    {
      "testId": 1,
      "b2cCharge": 330,
      "b2bCharge": 105
    },
    {
      "testId": 2,
      "b2cCharge": 313,
      "b2bCharge": 202
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Organization created successfully with 2 test charges",
  "data": {
    "id": "ORG-AAC",
    "name": "New Lab",
    "location": "Mumbai",
    "isActive": true
  },
  "credentials": {
    "username": "ORG-AAC",
    "password": "AAC@123"
  },
  "chargesCreated": 2
}
```

---

## 📊 Backend Controller Functions

### New/Updated Functions

1. **getTestCharges()** - Enhanced with organization filter
   - Supports filtering by testId OR organizationId
   - Returns test and organization details

2. **getAllTestCharges()** - Enhanced
   - Supports organizationId query parameter
   - Returns all tests with their charges for specific org

3. **createTestCharge()** - Updated
   - Now requires organizationId instead of franchise/corporate/collection center
   - Validates organization exists

4. **updateTestCharge()** - Updated
   - Simplified to work with organization only
   - Removed franchise/corporate/collection center fields

5. **deleteTestCharge()** - Unchanged
   - Works with new schema

6. **bulkCreateTestCharges()** - NEW
   - Create/update multiple charges for an organization
   - Useful when adding new organization with multiple test prices

7. **createOrganization()** - Enhanced
   - Now accepts optional `testCharges` array
   - Automatically creates charges when organization is created
   - Returns count of charges created

---

## 🗄️ Database Migration

**Migration File:** `20260531_remove_franchise_corporate_collection_center/migration.sql`

**Changes:**
- Dropped `corporate_charges` table
- Dropped `corporates` table
- Dropped `collection_centers` table
- Dropped `franchise` table
- Recreated `test_charges` table with only `organizationId`

---

## 📝 Usage Examples

### Example 1: Create Organization with Charges
```javascript
const response = await fetch('/api/master/organizations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Branch Lab',
    location: 'Mumbai',
    testCharges: [
      { testId: 1, b2cCharge: 350, b2bCharge: 120 },
      { testId: 2, b2cCharge: 320, b2bCharge: 180 }
    ]
  })
});
```

### Example 2: Get All Charges for Organization
```javascript
const response = await fetch('/api/master/test-charges/all?organizationId=ORG-AAA');
const data = await response.json();
// Returns all tests with their charges for ORG-AAA
```

### Example 3: Bulk Update Charges
```javascript
const response = await fetch('/api/master/test-charges/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'ORG-AAA',
    charges: [
      { testId: 1, b2cCharge: 400, b2bCharge: 150 },
      { testId: 2, b2cCharge: 350, b2bCharge: 220 }
    ]
  })
});
```

---

## ✅ Benefits

1. **Simplified Structure** - Only one entity (Organization) for pricing
2. **Better Performance** - Fewer tables to query
3. **Easier Maintenance** - Less complex relationships
4. **Flexible Pricing** - Each organization can have different prices for same test
5. **Bulk Operations** - Create multiple charges at once

---

## 🔗 Related Files

- **Prisma Schema:** `backend/prisma/schema.prisma`
- **Controller:** `backend/controllers/master.controller.js`
- **Routes:** `backend/routes/master.routes.js`
- **Migration:** `backend/prisma/migrations/20260531_remove_franchise_corporate_collection_center/migration.sql`

---

## 📌 Notes

- All old franchise/corporate/collection center references have been removed
- Test charges now exclusively use organizationId
- Backward compatibility: Old data is migrated during database migration
- Frontend should be updated to use new organization-based pricing endpoints
