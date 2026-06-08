# Organization Charges API Inspector - Summary

## 📦 What Was Created

I've created a comprehensive test script suite to inspect the HTTP response from the organization charges API endpoint. The suite includes three implementation options to work with different environments and preferences.

### Files Created:

1. **`inspect-org-charges.js`** (Node.js)
   - Most detailed analysis with complete structure inspection
   - Shows all fields, data types, and nested objects
   - Includes statistical summary
   - Best for developers who want comprehensive output

2. **`inspect-org-charges.ps1`** (PowerShell)
   - Native Windows scripting solution
   - Color-coded, readable output
   - No external dependencies required
   - Best for Windows developers

3. **`inspect-org-charges.sh`** (Bash)
   - Portable Linux/Mac solution
   - Uses standard Unix tools
   - Optional jq support for better JSON parsing
   - Best for Unix/Linux developers

4. **`API-RESPONSE-INSPECTOR.md`** (Documentation)
   - Complete usage guide for all three scripts
   - Response structure documentation
   - Field explanations and examples
   - Troubleshooting guide

5. **`QUICK-REFERENCE.txt`** (Quick Reference)
   - One-page cheat sheet
   - Common commands and examples
   - Data type reference
   - Quick troubleshooting

6. **`TEST-SCRIPT-SUMMARY.md`** (This File)
   - Overview of what was created
   - Quick start guide

---

## 🎯 Endpoint Details

**Endpoint:** `GET /api/master/organizations/{organizationId}/charges`

**Base URL:** `http://localhost:5000/api`

**Full URL:** `http://localhost:5000/api/master/organizations/ORG-AAC/charges`

---

## 📊 Expected Response Structure

```javascript
{
  "success": true|false,
  "data": [
    {
      // Basic Fields
      "id": "string",                      // Charge record ID
      "testId": number,                    // Test ID (foreign key)
      "organizationId": "string",          // Organization ID
      "b2cCharge": number,                 // Business-to-Consumer price
      "b2bCharge": number,                 // Business-to-Business price
      "discountPercent": number | null,    // Discount percentage
      "specialPrice": number | null,       // Special pricing
      "effectiveFrom": "ISO-8601" | null,  // Effective date
      "effectiveTo": "ISO-8601" | null,    // Expiration date
      "isActive": boolean,                 // Active status
      "createdAt": "ISO-8601",             // Creation timestamp
      "updatedAt": "ISO-8601",             // Update timestamp
      
      // Nested Objects (included via ORM relations)
      "test": {
        "id": number,
        "name": "string",
        "shortName": "string" | null,
        "departmentId": number,
        "department": {
          "name": "string"
        }
      },
      
      "organization": {
        "id": "string",
        "name": "string",
        "location": "string" | null
      }
    }
  ]
}
```

---

## 🚀 Quick Start Guide

### Step 1: Ensure Backend is Running
```bash
cd backend
npm run dev
```
The server should be accessible at `http://localhost:5000`

### Step 2: Run Your Preferred Script

#### Option A: Node.js (Recommended for detailed output)
```bash
# From the backend directory
node scripts/inspect-org-charges.js

# With specific organization ID
node scripts/inspect-org-charges.js ORG-AAA 5000
```

#### Option B: PowerShell (For Windows users)
```powershell
# From the backend directory
.\scripts\inspect-org-charges.ps1

# With specific parameters
.\scripts\inspect-org-charges.ps1 -OrgId "ORG-AAA" -Port 5000
```

#### Option C: Bash (For Linux/Mac users)
```bash
# From the backend directory
chmod +x scripts/inspect-org-charges.sh
./scripts/inspect-org-charges.sh

# With specific organization ID
./scripts/inspect-org-charges.sh ORG-AAA 5000
```

---

## 📋 What Each Script Outputs

All three scripts display:

1. **✅ Response Status**
   - HTTP status code
   - Content type

2. **📄 Raw JSON Response**
   - Complete response formatted for readability
   - All fields and values visible

3. **🏗️ Response Structure**
   - Shows object hierarchy
   - Displays data types for each field
   - Shows array lengths

4. **🔬 Detailed Field Analysis**
   - Each field with its type
   - Nested object details
   - First item in array shown in detail

5. **📊 Summary Statistics**
   - Total number of charges
   - Unique tests count
   - Unique organizations count
   - Average B2C and B2B charges

---

## 🔍 Understanding the Response

### Field Categories:

**Basic Charge Information:**
- `id`, `testId`, `organizationId` - Record identifiers
- `b2cCharge`, `b2bCharge` - Pricing information
- `discountPercent`, `specialPrice` - Special pricing
- `isActive` - Status flag

**Date/Time Fields:**
- `effectiveFrom` - When this charge starts applying
- `effectiveTo` - When this charge expires (null = no expiration)
- `createdAt`, `updatedAt` - Audit timestamps

**Nested Test Information:**
- `test.id` - Test identifier
- `test.name` - Full test name
- `test.shortName` - Abbreviated name
- `test.department.name` - Which department

**Nested Organization Information:**
- `organization.id` - Organization code
- `organization.name` - Organization name
- `organization.location` - Physical location

---

## 📝 Data Types Reference

| Type | Example | What it Means |
|------|---------|--------------|
| string | `"ORG-AAC"` | Text value (enclosed in quotes) |
| number | `500`, `2.5` | Numeric value (no quotes) |
| boolean | `true`, `false` | Yes/No or On/Off value |
| null | `null` | No value / Not set |
| array | `[...]` | List of items (shown with brackets) |
| object | `{...}` | Structured data (shown with braces) |
| ISO 8601 date | `"2025-01-15T10:30:00.000Z"` | Timestamp in UTC timezone |

---

## 🎓 Example Walkthrough

### Scenario: Inspecting Charges for Alandi Branch (ORG-AAC)

1. **Run the script:**
   ```bash
   node scripts/inspect-org-charges.js ORG-AAC 5000
   ```

2. **Expected output includes:**
   ```
   Response Status: 200 OK
   
   Success: true (boolean)
   
   Data: Array with 15 charge records
   
   First charge details:
   - id: "chg_001" (string)
   - testId: 1 (number)
   - b2cCharge: 500 (number)
   - organizationId: "ORG-AAC" (string)
   ...and more fields
   
   Nested test object:
   - name: "Complete Blood Count" (string)
   - department: "Hematology" (object)
   
   Summary:
   Total Charges: 15
   Unique Tests: 15
   Average B2C Charge: ₹500
   Average B2B Charge: ₹450
   ```

3. **Understanding the data:**
   - This organization has 15 different tests with charges
   - B2C pricing averages ₹500
   - B2B pricing averages ₹450 (10% discount on average)
   - All charges are active and currently in use

---

## 🔧 Troubleshooting Common Issues

### Issue: "Connection refused"
**Cause:** Backend server not running
**Solution:** 
```bash
cd backend
npm run dev
```

### Issue: Empty response `"data": []`
**Cause:** Organization has no charges or doesn't exist
**Solution:**
1. Verify organization ID exists
2. Check if charges are marked as active
3. Try with a known organization: `ORG-AAA` or `ORG-AAC`

### Issue: "Cannot find module" (Node.js)
**Cause:** Dependencies not installed
**Solution:**
```bash
cd backend
npm install
```

### Issue: PowerShell "running scripts is disabled"
**Cause:** Execution policy restriction
**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Bash "Permission denied"
**Cause:** Script not executable
**Solution:**
```bash
chmod +x scripts/inspect-org-charges.sh
```

---

## 📚 Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `inspect-org-charges.js` | Complete Node.js implementation | Full-stack developers |
| `inspect-org-charges.ps1` | Complete PowerShell implementation | Windows developers |
| `inspect-org-charges.sh` | Complete Bash implementation | Unix/Linux developers |
| `API-RESPONSE-INSPECTOR.md` | Comprehensive guide | Everyone |
| `QUICK-REFERENCE.txt` | One-page cheat sheet | Quick lookup |
| `TEST-SCRIPT-SUMMARY.md` | This file - Overview | Getting started |

---

## 🎯 Use Cases

**When to use these scripts:**

1. **API Development**
   - Verify API response structure
   - Check field names and types
   - Validate nested objects

2. **Frontend Integration**
   - Know what data is available
   - Understand field types for UI binding
   - Plan data transformation

3. **Testing**
   - Inspect actual API responses
   - Verify data consistency
   - Check for null values

4. **Documentation**
   - Generate actual response examples
   - Verify documentation accuracy
   - Create API specs

5. **Debugging**
   - Check API response before code crashes
   - Understand unexpected response structure
   - Verify data integrity

---

## 💡 Pro Tips

### Tip 1: Save output for comparison
```bash
# Node.js
node scripts/inspect-org-charges.js ORG-AAA > org-aaa.json
node scripts/inspect-org-charges.js ORG-AAC > org-aac.json
diff org-aaa.json org-aac.json
```

### Tip 2: Check multiple organizations
```bash
for org in ORG-AAA ORG-AAC ORG-AAB; do
  echo "=== $org ==="
  node scripts/inspect-org-charges.js $org
done
```

### Tip 3: Export raw JSON directly
```bash
curl http://localhost:5000/api/master/organizations/ORG-AAC/charges > charges.json
# Then open charges.json in a JSON viewer
```

### Tip 4: Use with jq for filtering (Bash)
```bash
curl -s http://localhost:5000/api/master/organizations/ORG-AAC/charges | \
  jq '.data[] | select(.isActive == true) | .b2cCharge'
```

---

## 🔗 Related Resources

- **Backend Server:** Runs on port 5000 by default
- **Database:** Uses Prisma ORM
- **Models:** TestCharge, Test, Organization
- **Controller:** `/controllers/master.controller.js`
- **Route:** `/routes/master.routes.js`

---

## ✅ Verification Checklist

Before running scripts:
- [ ] Backend is running (`npm run dev`)
- [ ] Database is connected
- [ ] Organization ID is valid
- [ ] Port is correct (default: 5000)
- [ ] Network connectivity is available

---

## 🎓 Learning Path

1. **Start here:** Read this file (TEST-SCRIPT-SUMMARY.md)
2. **Get details:** Read API-RESPONSE-INSPECTOR.md
3. **Quick lookup:** Use QUICK-REFERENCE.txt
4. **Run script:** Execute the appropriate script for your OS
5. **Understand output:** Compare output with the documentation
6. **Use in code:** Apply the response structure in your application

---

## 📞 Next Steps

1. **Choose your script:**
   - Windows users: Use `inspect-org-charges.ps1`
   - Mac/Linux users: Use `inspect-org-charges.sh`
   - All users: Use `inspect-org-charges.js` for most detail

2. **Make sure backend is running:**
   ```bash
   cd backend && npm run dev
   ```

3. **Run the script:**
   ```bash
   node scripts/inspect-org-charges.js ORG-AAC
   ```

4. **Study the output:**
   - Note all field names
   - Remember the data types
   - Check nested objects

5. **Use in your code:**
   - Reference exact field names
   - Handle null values properly
   - Parse dates correctly

---

**Created:** 2025
**Scripts Location:** `/backend/scripts/`
**Documentation:** See accompanying .md and .txt files

---

For detailed information, see the companion documentation:
- **Full Guide:** `API-RESPONSE-INSPECTOR.md`
- **Quick Reference:** `QUICK-REFERENCE.txt`
