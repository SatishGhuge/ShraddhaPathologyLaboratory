# Parameter Data Storage & Structure Guide

## Overview
This guide explains how test parameters are saved in the backend and how to resolve related issues.

---

## Database Schema

### Three Main Tables

#### 1. **Test Table**
```sql
CREATE TABLE Test (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  shortName VARCHAR(50),
  testCode VARCHAR(50),
  departmentId INT,
  sampleType VARCHAR(100),
  testMethod VARCHAR(255),
  machineName VARCHAR(100),
  speciality VARCHAR(100),
  group VARCHAR(100),
  sortOrder INT,
  reportHeader TEXT,
  costForLab DECIMAL(10,2),
  preparationTime VARCHAR(100),
  preparationType VARCHAR(100),
  instructionPreparation TEXT,
  instructionPatient TEXT,
  interpretationLabel VARCHAR(255),
  interpretation TEXT,
  outsourceLab VARCHAR(100),
  attachFile VARCHAR(10),
  profileTest VARCHAR(10),
  isHeader BOOLEAN,
  showTestName BOOLEAN,
  isNABL BOOLEAN,
  lineHeight DECIMAL(5,2),
  linkedTestIds JSON,
  isActive BOOLEAN DEFAULT true,
  isDeleted BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. **TestParameter Table** (NEW - Stores Individual Parameters)
```sql
CREATE TABLE TestParameter (
  id INT PRIMARY KEY AUTO_INCREMENT,
  testId INT NOT NULL,
  parameterName VARCHAR(255) NOT NULL,
  machineCode VARCHAR(100),
  multiplyBy DECIMAL(10,4),
  decimal INT,
  parameterSortOrder INT,
  isDescriptive BOOLEAN DEFAULT false,
  lowPanic DECIMAL(10,4),
  highPanic DECIMAL(10,4),
  isNABL BOOLEAN DEFAULT false,
  parameterCode VARCHAR(100),
  hasFormula BOOLEAN DEFAULT false,
  formula TEXT,
  type VARCHAR(50), -- 'Numeric', 'Descriptive', 'Text'
  isMandatory BOOLEAN DEFAULT false,
  rangeType VARCHAR(50), -- 'BySex', 'ByAge', 'Fixed'
  units VARCHAR(100),
  displayRangeText VARCHAR(255),
  rangeText TEXT,
  textContent TEXT,
  isMultipleOptions BOOLEAN DEFAULT false,
  
  -- Male Ranges
  maleLowValue DECIMAL(10,4),
  maleHighValue DECIMAL(10,4),
  maleDefaultValue VARCHAR(100),
  maleActive BOOLEAN DEFAULT false,
  
  -- Female Ranges
  femaleLowValue DECIMAL(10,4),
  femaleHighValue DECIMAL(10,4),
  femaleDefaultValue VARCHAR(100),
  femaleActive BOOLEAN DEFAULT false,
  
  -- Child Ranges
  childLowValue DECIMAL(10,4),
  childHighValue DECIMAL(10,4),
  childDefaultValue VARCHAR(100),
  childActive BOOLEAN DEFAULT false,
  
  -- JSON Fields
  ageRanges JSON, -- Array of age-based ranges
  rangeValues JSON, -- Array of range values
  
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (testId) REFERENCES Test(id) ON DELETE CASCADE
);
```

#### 3. **TestCategory Table** (Links Parameters to Categories)
```sql
CREATE TABLE TestCategory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  testId INT NOT NULL,
  testParameterId INT NOT NULL,
  categoryId VARCHAR(100),
  categoryName VARCHAR(255),
  isCategory BOOLEAN DEFAULT false,
  testMethod VARCHAR(255),
  sortOrder INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (testId) REFERENCES Test(id) ON DELETE CASCADE,
  FOREIGN KEY (testParameterId) REFERENCES TestParameter(id) ON DELETE CASCADE
);
```

---

## Data Flow: Creating a Test with Parameters

### Step 1: Frontend Sends Test Data
```typescript
// frontend/app/master/testlist/add/page.tsx
const testData = {
  name: "Complete Blood Count",
  departmentId: 1,
  categories: [
    {
      categoryId: "cat_1",
      name: "RBC Parameters",
      parameters: [
        {
          parameterName: "Hemoglobin",
          type: "Numeric",
          units: "g/dL",
          normalRanges: [
            { gender: "Male", lowValue: 13.5, highValue: 17.5, isActive: true },
            { gender: "Female", lowValue: 12.0, highValue: 15.5, isActive: true }
          ],
          ageRanges: [
            { label: "0-1 years", lowValue: 10.0, highValue: 20.0, gender: "Child" }
          ]
        }
      ]
    }
  ]
};

await createTest(testData);
```

### Step 2: Backend Processes Test Creation
```javascript
// backend/controllers/master.controller.js - createTest()

// 1. Create Test record
const test = await prisma.test.create({
  data: {
    name: "Complete Blood Count",
    departmentId: 1,
    // ... other fields
  }
});

// 2. For each category with parameters
for (const category of categories) {
  for (const param of category.parameters) {
    
    // 3. Create TestParameter record
    const testParameter = await prisma.testParameter.create({
      data: {
        testId: test.id, // ✅ Link to test
        parameterName: "Hemoglobin",
        type: "Numeric",
        units: "g/dL",
        maleLowValue: 13.5,
        maleHighValue: 17.5,
        maleActive: true,
        femaleLowValue: 12.0,
        femaleHighValue: 15.5,
        femaleActive: true,
        ageRanges: JSON.stringify([...]), // Store as JSON
        // ... other fields
      }
    });
    
    // 4. Create TestCategory linking parameter to category
    await prisma.testCategory.create({
      data: {
        testId: test.id,
        testParameterId: testParameter.id,
        categoryId: "cat_1",
        categoryName: "RBC Parameters",
        sortOrder: 1
      }
    });
  }
}
```

### Step 3: Backend Returns Complete Test
```json
{
  "success": true,
  "message": "Test created successfully",
  "data": {
    "id": 1,
    "name": "Complete Blood Count",
    "departmentId": 1,
    "categories": [
      {
        "categoryId": "cat_1",
        "name": "RBC Parameters",
        "parameters": [
          {
            "parameterName": "Hemoglobin",
            "type": "Numeric",
            "units": "g/dL",
            "normalRanges": [
              { "gender": "Male", "lowValue": 13.5, "highValue": 17.5, "isActive": true },
              { "gender": "Female", "lowValue": 12.0, "highValue": 15.5, "isActive": true }
            ],
            "ageRanges": [...]
          }
        ]
      }
    ]
  }
}
```

---

## Parameter Data Structure

### Complete Parameter Object
```typescript
interface TestParameter {
  // Basic Info
  parameterName: string;           // e.g., "Hemoglobin"
  type: "Numeric" | "Descriptive" | "Text";
  units: string;                   // e.g., "g/dL"
  
  // Sorting & Display
  sortOrder: number;
  displayRangeText: string;        // e.g., "13.5 - 17.5"
  rangeText: string;               // Full range description
  
  // Numeric Properties
  decimal: number;                 // Decimal places (e.g., 2)
  multiplyBy: number;              // Multiplication factor
  machineCode: string;             // Machine identifier
  
  // Panic Values
  lowPanic: number;                // Low panic threshold
  highPanic: number;               // High panic threshold
  
  // Formulas
  hasFormula: boolean;
  formula: string;                 // e.g., "RBC * MCV / 10"
  
  // Compliance
  isNABL: boolean;                 // NABL certified
  parameterCode: string;           // NABL code
  isMandatory: boolean;            // Required for test
  
  // Normal Ranges (By Gender)
  normalRanges: [
    {
      gender: "Male" | "Female" | "Child";
      lowValue: number;
      highValue: number;
      defaultValue: string;
      isActive: boolean;
    }
  ];
  
  // Age-Based Ranges
  ageRanges: [
    {
      label: string;               // e.g., "0-1 years"
      lowValue: number;
      highValue: number;
      gender: string;
      enabled: boolean;
    }
  ];
  
  // Multiple Options (for Descriptive)
  isMultipleOptions: boolean;
  rangeValues: string[];           // e.g., ["Positive", "Negative"]
  textContent: string;             // For text parameters
  
  // Descriptive Parameters
  isDescriptive: boolean;
}
```

---

## API Endpoints for Parameters

### Create Test with Parameters
```
POST /api/master/tests
Content-Type: application/json

{
  "name": "Complete Blood Count",
  "departmentId": 1,
  "categories": [
    {
      "categoryId": "cat_1",
      "name": "RBC Parameters",
      "parameters": [
        {
          "parameterName": "Hemoglobin",
          "type": "Numeric",
          "units": "g/dL",
          "normalRanges": [...]
        }
      ]
    }
  ]
}
```

### Get Test with Parameters
```
GET /api/master/tests/:id

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Complete Blood Count",
    "categories": [
      {
        "categoryId": "cat_1",
        "name": "RBC Parameters",
        "parameters": [
          {
            "parameterName": "Hemoglobin",
            "type": "Numeric",
            "units": "g/dL",
            "normalRanges": [...]
          }
        ]
      }
    ]
  }
}
```

### Update Test with Parameters
```
PUT /api/master/tests/:id
Content-Type: application/json

{
  "name": "Complete Blood Count (Updated)",
  "categories": [...]
}
```

---

## Common Issues & Solutions

### Issue 1: Parameters Not Saving
**Symptom**: Test created but parameters are empty
**Cause**: Categories array is empty or parameters array is empty
**Solution**:
```javascript
// Ensure categories have parameters
if (categories && categories.length > 0) {
  for (const category of categories) {
    if (category.parameters && category.parameters.length > 0) {
      // Parameters will be saved
    }
  }
}
```

### Issue 2: Age Ranges Not Parsing
**Symptom**: Age ranges show as string instead of array
**Cause**: JSON parsing error in backend
**Solution**:
```javascript
// In getTestById, parse ageRanges:
ageRanges: (() => {
  try {
    return param.ageRanges ? JSON.parse(param.ageRanges) : [];
  } catch (e) {
    console.warn('Failed to parse ageRanges:', param.ageRanges, e);
    return [];
  }
})()
```

### Issue 3: Normal Ranges Not Displaying
**Symptom**: Male/Female/Child ranges are empty
**Cause**: Range values not properly saved to database
**Solution**:
```javascript
// Ensure normalRanges array has all three genders
normalRanges: [
  { gender: "Male", lowValue: 13.5, highValue: 17.5, isActive: true },
  { gender: "Female", lowValue: 12.0, highValue: 15.5, isActive: true },
  { gender: "Child", lowValue: 10.0, highValue: 20.0, isActive: true }
]
```

### Issue 4: Parameters Not Updating
**Symptom**: Update test doesn't save parameter changes
**Cause**: Old TestCategory records not deleted before creating new ones
**Solution**:
```javascript
// In updateTest, delete old categories first:
await prisma.testCategory.deleteMany({
  where: { testId: parseInt(id) }
});

// Then create new ones
for (const category of categories) {
  // Create new TestParameter and TestCategory
}
```

---

## Database Queries

### Get All Parameters for a Test
```sql
SELECT 
  tp.*,
  tc.categoryId,
  tc.categoryName
FROM TestParameter tp
JOIN TestCategory tc ON tp.id = tc.testParameterId
WHERE tp.testId = 1
ORDER BY tc.sortOrder, tp.parameterSortOrder;
```

### Get Parameters by Category
```sql
SELECT tp.*
FROM TestParameter tp
JOIN TestCategory tc ON tp.id = tc.testParameterId
WHERE tp.testId = 1 AND tc.categoryId = 'cat_1'
ORDER BY tp.parameterSortOrder;
```

### Get All Tests with Parameter Count
```sql
SELECT 
  t.id,
  t.name,
  COUNT(tp.id) as parameterCount
FROM Test t
LEFT JOIN TestParameter tp ON t.id = tp.testId
GROUP BY t.id, t.name;
```

---

## Frontend Integration

### Displaying Parameters
```typescript
// In test edit page
const test = await getTestById(id);

// test.categories contains:
// [
//   {
//     categoryId: "cat_1",
//     name: "RBC Parameters",
//     parameters: [
//       {
//         parameterName: "Hemoglobin",
//         type: "Numeric",
//         units: "g/dL",
//         normalRanges: [...]
//       }
//     ]
//   }
// ]

// Render parameters
test.categories.forEach(category => {
  category.parameters.forEach(param => {
    console.log(`${param.parameterName} (${param.units})`);
  });
});
```

### Saving Parameters
```typescript
// When user adds/edits parameters
const updatedTest = {
  name: test.name,
  categories: [
    {
      categoryId: "cat_1",
      name: "RBC Parameters",
      parameters: [
        {
          parameterName: "Hemoglobin",
          type: "Numeric",
          units: "g/dL",
          normalRanges: [
            { gender: "Male", lowValue: 13.5, highValue: 17.5, isActive: true },
            { gender: "Female", lowValue: 12.0, highValue: 15.5, isActive: true },
            { gender: "Child", lowValue: 10.0, highValue: 20.0, isActive: true }
          ]
        }
      ]
    }
  ]
};

await updateTest(testId, updatedTest);
```

---

## Verification Checklist

- [ ] Test record created in `Test` table
- [ ] TestParameter records created in `TestParameter` table
- [ ] TestCategory records created linking parameters to categories
- [ ] All three gender ranges (Male/Female/Child) saved
- [ ] Age ranges saved as JSON string
- [ ] Parameters retrievable via `GET /api/master/tests/:id`
- [ ] Parameters display correctly in edit page
- [ ] Parameters update correctly when test is modified
- [ ] Parameters delete when test is deleted (CASCADE)

---

## Files Reference

- **Backend Controller**: `backend/controllers/master.controller.js`
  - `createTest()` - Creates test with parameters
  - `updateTest()` - Updates test and parameters
  - `getTestById()` - Retrieves test with parameters

- **Database Schema**: `backend/prisma/schema.prisma`
  - `Test` model
  - `TestParameter` model
  - `TestCategory` model

- **Frontend API**: `frontend/src/api/master.ts`
  - `createTest()`
  - `updateTest()`
  - `getTestById()`

- **Frontend Pages**:
  - `frontend/app/master/testlist/add/page.tsx` - Add test
  - `frontend/app/master/testlist/edit/[id]/page.tsx` - Edit test
  - `frontend/app/master/testlist/page.tsx` - List tests
