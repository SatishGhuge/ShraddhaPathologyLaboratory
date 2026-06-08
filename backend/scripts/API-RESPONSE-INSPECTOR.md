# Organization Charges API Response Inspector

This document provides three scripts to inspect the HTTP response from the organization charges API endpoint. Each script displays the full response structure, exact field names, and data types returned by the API.

**Endpoint:** `GET /api/master/organizations/{organizationId}/charges`

---

## 📋 What Each Script Does

### 1. **Node.js Script** (`inspect-org-charges.js`)
- **Best for:** Complete analysis with detailed structure inspection
- **Advantages:** 
  - Shows raw JSON response
  - Displays full structure hierarchy with data types
  - Provides detailed field-by-field analysis
  - Includes statistical summary
- **Dependencies:** Node.js with `node-fetch` (usually available in the project)

### 2. **PowerShell Script** (`inspect-org-charges.ps1`)
- **Best for:** Windows users
- **Advantages:**
  - Color-coded output for better readability
  - Native PowerShell object handling
  - No external dependencies required (built-in on Windows)
- **Requirements:** Windows PowerShell or PowerShell Core

### 3. **Bash Script** (`inspect-org-charges.sh`)
- **Best for:** Linux/Mac users
- **Advantages:**
  - Lightweight and portable
  - Uses standard Unix tools (curl, jq)
  - Works on most Unix-like systems
- **Requirements:** curl (usually preinstalled), jq (optional but recommended)

---

## 🚀 Quick Start

### Option 1: Node.js Script

```bash
# Navigate to backend directory
cd backend

# Run with default organization (ORG-AAC)
node scripts/inspect-org-charges.js

# Run with specific organization ID and port
node scripts/inspect-org-charges.js ORG-AAA 5000

# Run with different organization
node scripts/inspect-org-charges.js ORG-XXX 5000
```

**Example output:**
```
════════════════════════════════════════════════════════════════
🔍 Organization Charges API Response Inspector
════════════════════════════════════════════════════════════════

📋 Request Details:
   URL: http://localhost:5000/api/master/organizations/ORG-AAC/charges
   Method: GET
   Organization ID: ORG-AAC
   Port: 5000

⏳ Sending request...

✅ Response Status: 200 OK
   Content-Type: application/json

════════════════════════════════════════════════════════════════
📄 Raw Response (Pretty JSON)
════════════════════════════════════════════════════════════════

{
  "success": true,
  "data": [
    {
      "id": "chargeId-1",
      "testId": 1,
      "b2cCharge": 500,
      "b2bCharge": 450,
      "organizationId": "ORG-AAC",
      ...
    }
  ]
}
```

### Option 2: PowerShell Script

```powershell
# Navigate to backend directory
cd backend

# Run with default organization
.\scripts\inspect-org-charges.ps1

# Run with specific organization ID
.\scripts\inspect-org-charges.ps1 -OrgId "ORG-AAA" -Port 5000
```

### Option 3: Bash Script

```bash
# Navigate to backend directory
cd backend

# Run with default organization
./scripts/inspect-org-charges.sh

# Run with specific organization ID
./scripts/inspect-org-charges.sh ORG-AAA 5000

# Make sure it's executable first
chmod +x scripts/inspect-org-charges.sh
```

---

## 📊 Response Structure

The API returns a response with the following structure:

```javascript
{
  "success": boolean,
  "data": [
    {
      "id": string,                    // Charge record ID
      "testId": number,                // Test ID (foreign key)
      "b2cCharge": number,             // B2C price
      "b2bCharge": number,             // B2B price
      "organizationId": string,        // Organization ID (foreign key)
      "discountPercent": number | null,        // Discount percentage
      "specialPrice": number | null,           // Special pricing if applicable
      "effectiveFrom": string | null,          // Effective date (ISO 8601)
      "effectiveTo": string | null,            // Expiration date (ISO 8601)
      "isActive": boolean,                     // Whether charge is active
      "createdAt": string,                     // Creation timestamp
      "updatedAt": string,                     // Last update timestamp
      
      // Nested objects (included via relations)
      "test": {
        "id": number,                          // Test ID
        "name": string,                        // Test name
        "shortName": string | null,            // Short name
        "departmentId": number,                // Department reference
        "department": {
          "name": string                       // Department name
        }
      },
      
      "organization": {
        "id": string,                          // Organization ID
        "name": string,                        // Organization name
        "location": string | null              // Organization location
      }
    }
    // ... more charge records
  ]
}
```

---

## 🔍 Key Fields Explained

### Top-Level Response
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `data` | array | Array of charge records |

### Charge Record (Each item in `data` array)
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for this charge record |
| `testId` | number | Reference to the test this charge is for |
| `organizationId` | string | Which organization this charge belongs to |
| `b2cCharge` | number | Price for business-to-consumer transactions |
| `b2bCharge` | number | Price for business-to-business transactions |
| `discountPercent` | number \| null | Percentage discount if applicable |
| `specialPrice` | number \| null | Alternative pricing model if applicable |
| `effectiveFrom` | string \| null | Date when this charge becomes effective |
| `effectiveTo` | string \| null | Date when this charge expires |
| `isActive` | boolean | Whether this charge is currently active |
| `createdAt` | string | ISO 8601 timestamp of creation |
| `updatedAt` | string | ISO 8601 timestamp of last modification |

### Nested Objects

#### `test` object
Contains test information:
- `id` (number) - Test ID
- `name` (string) - Full test name
- `shortName` (string | null) - Abbreviated name
- `departmentId` (number) - Which department
- `department` (object) - Department details with name

#### `organization` object
Contains organization information:
- `id` (string) - Organization identifier
- `name` (string) - Organization name
- `location` (string | null) - Physical location

---

## 📈 Example Responses

### Example 1: Success Response with Data
```json
{
  "success": true,
  "data": [
    {
      "id": "chg_001",
      "testId": 1,
      "organizationId": "ORG-AAC",
      "b2cCharge": 500,
      "b2bCharge": 450,
      "discountPercent": null,
      "specialPrice": null,
      "effectiveFrom": "2025-01-01T00:00:00.000Z",
      "effectiveTo": null,
      "isActive": true,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z",
      "test": {
        "id": 1,
        "name": "Complete Blood Count",
        "shortName": "CBC",
        "departmentId": 2,
        "department": {
          "name": "Hematology"
        }
      },
      "organization": {
        "id": "ORG-AAC",
        "name": "Alandi Branch",
        "location": "Alandi, Pune"
      }
    }
  ]
}
```

### Example 2: Empty Result
```json
{
  "success": true,
  "data": []
}
```

### Example 3: Error Response
```json
{
  "success": false,
  "message": "Failed to fetch test charges"
}
```

---

## 🛠️ Troubleshooting

### Node.js Script Issues

**Issue:** `node-fetch is not defined`
- **Solution:** Ensure it's installed: `npm install node-fetch`

**Issue:** `Cannot find module '...'`
- **Solution:** Run from the backend directory where package.json is located

### PowerShell Script Issues

**Issue:** `cannot be loaded because running scripts is disabled`
- **Solution:** Allow script execution:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

**Issue:** Script not found
- **Solution:** Use full path or dot-source:
  ```powershell
  & ".\scripts\inspect-org-charges.ps1"
  ```

### Bash Script Issues

**Issue:** `Permission denied`
- **Solution:** Make script executable:
  ```bash
  chmod +x scripts/inspect-org-charges.sh
  ```

**Issue:** `jq: command not found`
- **Solution:** Install jq or use the simpler curl output
  - macOS: `brew install jq`
  - Ubuntu: `sudo apt-get install jq`

### API Connection Issues

**Issue:** `Connection refused` or `Cannot reach server`
- **Solution:**
  1. Ensure the backend server is running: `npm run dev`
  2. Check the port matches (default: 5000)
  3. Verify your organization ID exists in the database

**Issue:** Empty response `"data": []`
- **Solution:**
  1. Check if the organization ID is correct
  2. Verify that charges exist for this organization
  3. Check if charges are marked as active: `isActive: true`

---

## 📝 Data Type Reference

When reading the output, here's what each data type represents:

| Type | Example | Note |
|------|---------|------|
| `string` | `"ORG-AAC"`, `"Complete Blood Count"` | Text enclosed in quotes |
| `number` | `500`, `2.5`, `0` | Numeric values without quotes |
| `boolean` | `true`, `false` | Logical true/false |
| `null` | `null` | Represents no value |
| `array` | `[...]` | Ordered list, shown with brackets |
| `object` | `{...}` | Structured data, shown with braces |
| `date (ISO 8601)` | `"2025-01-15T10:30:00.000Z"` | Timestamp string in UTC |

---

## 🔐 Database Query Equivalence

These scripts replicate the following database query:

```sql
SELECT 
    c.*,
    t.id, t.name, t.shortName, t.departmentId, d.name as department_name,
    o.id, o.name, o.location
FROM TestCharge c
INNER JOIN Test t ON c.testId = t.id
INNER JOIN Department d ON t.departmentId = d.id
INNER JOIN Organization o ON c.organizationId = o.id
WHERE c.organizationId = ?
ORDER BY c.organizationId ASC, c.createdAt DESC
```

---

## 📚 Additional Resources

- **API Endpoint:** `GET /api/master/organizations/{organizationId}/charges`
- **Backend Server:** Usually runs on `http://localhost:5000`
- **Database:** Uses Prisma ORM with TestCharge, Test, and Organization models
- **Master Controller:** `/controllers/master.controller.js` - `getTestCharges` function

---

## ✅ Verification Checklist

Before running the scripts, ensure:
- [ ] Backend server is running (`npm run dev`)
- [ ] Database is connected and populated
- [ ] Organization ID is valid and exists in the database
- [ ] Port is correct (default: 5000)
- [ ] Network connection is available
- [ ] Required dependencies are installed (Node.js for JS script)

---

## 💡 Tips

1. **Save output to file:**
   ```bash
   # Node.js
   node scripts/inspect-org-charges.js > response.txt
   
   # PowerShell
   .\scripts\inspect-org-charges.ps1 | Out-File response.txt
   
   # Bash
   ./scripts/inspect-org-charges.sh > response.txt
   ```

2. **Compare multiple organizations:**
   ```bash
   node scripts/inspect-org-charges.js ORG-AAA > org-aaa.json
   node scripts/inspect-org-charges.js ORG-AAC > org-aac.json
   diff org-aaa.json org-aac.json
   ```

3. **Export to JSON for processing:**
   ```bash
   curl http://localhost:5000/api/master/organizations/ORG-AAC/charges > charges.json
   ```

---

## 📞 Questions or Issues?

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify the backend server is running
3. Check network connectivity
4. Review the controller implementation in `master.controller.js`
5. Check database logs for any errors
