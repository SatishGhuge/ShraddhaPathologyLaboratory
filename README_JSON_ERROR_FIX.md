# JSON Parsing Error - Complete Guide

## What's the Error?

When you try to view the test list, you see:
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

This means the API is returning **HTML** (a web page) instead of **JSON** (data).

---

## Why Does This Happen?

### Most Common Reasons (in order):

1. **Backend Server is NOT Running** ⚠️ (90% of cases)
   - The backend needs to be running on `http://localhost:5000`
   - If it's not running, requests fail and return error pages (HTML)

2. **You're Not Logged In** (5% of cases)
   - If not authenticated, you get redirected to login page (HTML)
   - Need to login first at `http://localhost:3000/login`

3. **Database Connection Failed** (3% of cases)
   - MySQL not running or database not accessible
   - Backend can't fetch data

4. **Wrong API URL Configuration** (1% of cases)
   - Frontend pointing to wrong backend URL
   - Should be: `http://localhost:5000/api`

5. **CORS or Network Issues** (1% of cases)
   - Browser blocking requests
   - Network connectivity problems

---

## How to Fix It (Quick Steps)

### Step 1: Start the Backend Server

**Open Command Prompt/PowerShell:**
```bash
cd d:\ShraddhaPathologyLaboratory\backend
npm run dev
```

**You should see:**
```
🚀 Server running on port 5000
📍 Environment: development
🌐 CORS enabled for: http://localhost:3000
```

### Step 2: Verify Backend is Working

**Open your browser and go to:**
```
http://localhost:5000/api/health
```

**You should see:**
```json
{
  "status": "OK",
  "message": "SilverLeaf Diagnostics API is running",
  "timestamp": "2026-05-19T..."
}
```

### Step 3: Make Sure You're Logged In

1. Go to `http://localhost:3000`
2. If you see login page, login with admin credentials
3. Check `backend/ADMIN_CREDENTIALS.md` for credentials

### Step 4: Test the API

**Open browser and go to:**
```
http://localhost:5000/api/master/tests?page=1&limit=20
```

**You should see JSON like:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Complete Blood Count",
      "departmentId": 1,
      "categories": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasMore": false
  }
}
```

### Step 5: Reload Test List Page

1. Go to `http://localhost:3000/master/testlist`
2. Should now display tests in a table
3. No error messages

---

## If It Still Doesn't Work

### Check 1: Is Backend Running?
```bash
# In Command Prompt, check if port 5000 is in use
netstat -ano | findstr :5000
```

If nothing shows, backend is not running. Start it:
```bash
cd backend
npm run dev
```

### Check 2: Is MySQL Running?
1. Press `Win+R`
2. Type `services.msc`
3. Look for "MySQL80" or similar
4. Should show "Running"

If not running, start it:
- Right-click on MySQL service
- Click "Start"

### Check 3: Is Frontend Running?
```bash
# In another Command Prompt
cd d:\ShraddhaPathologyLaboratory\frontend
npm run dev
```

Should show:
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

### Check 4: Check Browser Console
1. Press `F12` to open DevTools
2. Go to "Console" tab
3. Look for red error messages
4. Note what it says

### Check 5: Check Network Tab
1. Press `F12` to open DevTools
2. Go to "Network" tab
3. Reload page (F5)
4. Look for request to `/api/master/tests`
5. Click on it
6. Check "Response" tab
7. Should be JSON, not HTML

---

## Understanding Parameter Data

### What are Parameters?

Parameters are the individual measurements in a test. For example:
- **Test**: Complete Blood Count
- **Parameters**: Hemoglobin, RBC, WBC, Platelets, etc.

### How are They Saved?

When you create a test with parameters:

1. **Test Record** is created
   - Name: "Complete Blood Count"
   - Department: "Hematology"

2. **Parameter Records** are created for each parameter
   - Hemoglobin (g/dL)
   - RBC (million/µL)
   - WBC (thousand/µL)
   - etc.

3. **Category Records** link parameters to categories
   - Category: "RBC Parameters"
   - Parameters: Hemoglobin, RBC, Hematocrit

### What Data is Stored for Each Parameter?

- **Name**: e.g., "Hemoglobin"
- **Type**: Numeric, Descriptive, or Text
- **Units**: e.g., "g/dL"
- **Normal Ranges**:
  - Male: 13.5 - 17.5
  - Female: 12.0 - 15.5
  - Child: 10.0 - 20.0
- **Age Ranges**: Different ranges for different ages
- **Formulas**: For calculated parameters
- **Panic Values**: Thresholds for critical values
- **NABL Compliance**: Whether it's NABL certified

### Example Parameter

```json
{
  "parameterName": "Hemoglobin",
  "type": "Numeric",
  "units": "g/dL",
  "normalRanges": [
    {
      "gender": "Male",
      "lowValue": 13.5,
      "highValue": 17.5,
      "isActive": true
    },
    {
      "gender": "Female",
      "lowValue": 12.0,
      "highValue": 15.5,
      "isActive": true
    },
    {
      "gender": "Child",
      "lowValue": 10.0,
      "highValue": 20.0,
      "isActive": true
    }
  ],
  "ageRanges": [
    {
      "label": "0-1 years",
      "lowValue": 10.0,
      "highValue": 20.0,
      "gender": "Child"
    }
  ],
  "lowPanic": 7.0,
  "highPanic": 20.0,
  "isNABL": true
}
```

---

## How the System Works

### 1. Creating a Test with Parameters

**Frontend** (You add test)
↓
**API** (POST /api/master/tests)
↓
**Backend** (Creates test, parameters, categories)
↓
**Database** (Stores all data)
↓
**Response** (Returns complete test with parameters)

### 2. Viewing Tests

**Frontend** (Load test list)
↓
**API** (GET /api/master/tests?page=1&limit=20)
↓
**Backend** (Fetches tests with parameters)
↓
**Database** (Queries test, parameter, category tables)
↓
**Response** (Returns paginated list with parameters)

### 3. Editing a Test

**Frontend** (Edit test)
↓
**API** (PUT /api/master/tests/:id)
↓
**Backend** (Updates test, deletes old parameters, creates new ones)
↓
**Database** (Updates all tables)
↓
**Response** (Returns updated test)

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": [
    {
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
              "normalRanges": [...]
            }
          ]
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Troubleshooting Checklist

- [ ] Backend is running (`npm run dev` in backend folder)
- [ ] Backend health check works (`http://localhost:5000/api/health`)
- [ ] MySQL is running (check Services)
- [ ] You're logged in (check `http://localhost:3000/login`)
- [ ] Frontend is running (`npm run dev` in frontend folder)
- [ ] API returns JSON (not HTML)
- [ ] Test list page loads without errors
- [ ] Tests display in table
- [ ] Parameters are visible when editing test
- [ ] No error messages in browser console

---

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `<!DOCTYPE` in response | Backend not running | `npm run dev` in backend |
| `401 Unauthorized` | Not logged in | Login at `http://localhost:3000/login` |
| `Cannot GET /api/health` | Backend not running | Start backend server |
| `CORS error` | Backend CORS not configured | Restart backend after checking `.env` |
| `Database connection failed` | MySQL not running | Start MySQL service |
| `Cannot find module` | Dependencies not installed | Run `npm install` in backend |
| `Port 5000 already in use` | Another process using port | Kill process or use different port |

---

## Files You Need to Know

### Backend
- **Server**: `backend/server.js` - Main server file
- **Config**: `backend/.env` - Database and server configuration
- **API**: `backend/controllers/master.controller.js` - Test API logic
- **Routes**: `backend/routes/master.routes.js` - API routes
- **Database**: `backend/prisma/schema.prisma` - Database schema

### Frontend
- **API Config**: `frontend/src/api/config.ts` - API base URL
- **API Functions**: `frontend/src/api/master.ts` - API function definitions
- **Test List**: `frontend/app/master/testlist/page.tsx` - Test list page
- **Config**: `frontend/.env.local` - Frontend environment variables

### Database
- **Name**: `shraddha_db`
- **Tables**: `Test`, `TestParameter`, `TestCategory`
- **Host**: `localhost`
- **Port**: `3306`

---

## Quick Commands

### Start Backend
```bash
cd d:\ShraddhaPathologyLaboratory\backend
npm run dev
```

### Start Frontend
```bash
cd d:\ShraddhaPathologyLaboratory\frontend
npm run dev
```

### Test Backend Health
```bash
curl http://localhost:5000/api/health
```

### Test API
```bash
curl http://localhost:5000/api/master/tests?page=1&limit=20
```

### Check Port Usage
```bash
netstat -ano | findstr :5000
```

### Kill Process on Port
```bash
taskkill /PID <PID> /F
```

### Reset Database
```bash
cd backend
npx prisma db push --force-reset
```

---

## Success Indicators

✅ Backend running on port 5000
✅ API returns JSON (not HTML)
✅ User is authenticated
✅ Test list page loads
✅ Tests display in table
✅ Parameters are visible
✅ No error messages in console
✅ Pagination works
✅ Can edit tests
✅ Can add new tests

---

## Need More Help?

### Read These Documents
1. **TROUBLESHOOTING_JSON_ERROR.md** - Detailed troubleshooting
2. **PARAMETER_DATA_GUIDE.md** - Technical details about parameters
3. **RESOLVE_JSON_ERROR_STEPS.md** - Step-by-step resolution

### Check These Files
1. `backend/.env` - Configuration
2. `backend/server.js` - Server setup
3. `frontend/src/api/config.ts` - API URL
4. Browser console (F12) - Error messages
5. Backend console - Server logs

---

## Summary

The JSON parsing error usually means the backend is not running. Start it with `npm run dev` in the backend folder, and the error should go away. If it persists, check the troubleshooting guides provided.

Parameter data is saved in the database with all necessary information for tests and results. Each parameter includes normal ranges, age ranges, formulas, and panic values.

**Good luck! 🚀**
