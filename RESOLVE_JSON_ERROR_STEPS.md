# Step-by-Step: Resolve JSON Parsing Error

## Error
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

---

## STEP 1: Verify Backend is Running

### 1.1 Open Command Prompt/PowerShell
```bash
# Navigate to backend folder
cd d:\ShraddhaPathologyLaboratory\backend
```

### 1.2 Check if Backend is Already Running
```bash
# Try to access health endpoint
curl http://localhost:5000/api/health
```

**Expected Output:**
```json
{
  "status": "OK",
  "message": "SilverLeaf Diagnostics API is running",
  "timestamp": "2026-05-19T..."
}
```

### 1.3 If Backend is NOT Running
```bash
# Start backend development server
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 5000
📍 Environment: development
🌐 CORS enabled for: http://localhost:3000
```

### 1.4 Verify Backend Started Successfully
- Check for any error messages in console
- If you see errors, note them down
- Common errors:
  - `EADDRINUSE` - Port 5000 already in use
  - `Database connection failed` - MySQL not running
  - `Cannot find module` - Dependencies not installed

---

## STEP 2: Verify Database Connection

### 2.1 Check MySQL is Running
```bash
# On Windows, MySQL should be running as a service
# Check Services: Press Win+R, type "services.msc"
# Look for "MySQL80" or similar
```

### 2.2 Verify Database Configuration
Open `backend/.env` and check:
```
DATABASE_URL="mysql://root:@localhost:3306/shraddha_db"
```

Should match your MySQL setup:
- Host: `localhost`
- Port: `3306`
- Database: `shraddha_db`
- User: `root`
- Password: (empty or your password)

### 2.3 Test Database Connection
```bash
# In backend folder, run:
npx prisma db push
```

**Expected Output:**
```
✓ Database connection successful
✓ Prisma schema synced
```

---

## STEP 3: Test API Directly

### 3.1 Open Browser
Go to: `http://localhost:5000/api/master/tests?page=1&limit=20`

### 3.2 Check Response
**If you see JSON:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```
✅ API is working correctly

**If you see HTML:**
```html
<!DOCTYPE html>
<html>
  <head><title>...</title></head>
  ...
</html>
```
❌ API is returning error page

### 3.3 If HTML Response
Check backend console for error messages:
- Database connection error
- Route not found
- Authentication error
- Other server errors

---

## STEP 4: Check Authentication

### 4.1 Verify You're Logged In
1. Open `http://localhost:3000`
2. If redirected to login page, you're not logged in
3. Login with credentials from `backend/ADMIN_CREDENTIALS.md`

### 4.2 Check Token Storage
1. Open DevTools (F12)
2. Go to Application tab
3. Check Cookies or Local Storage
4. Look for `token` or `auth` key
5. If missing, login again

### 4.3 Test API with Token
```bash
# Get token from browser storage
# Then test API with token in header
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/master/tests?page=1&limit=20
```

---

## STEP 5: Check Frontend Configuration

### 5.1 Verify API Base URL
Open `frontend/src/api/config.ts`:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export default API_BASE_URL;
```

Should be: `http://localhost:5000/api`

### 5.2 Check Environment Variables
Check `frontend/.env.local` (if exists):
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 5.3 Restart Frontend if Changed
```bash
# Stop frontend (Ctrl+C)
# Then restart:
npm run dev
```

---

## STEP 6: Debug in Browser

### 6.1 Open DevTools
Press `F12` or right-click → Inspect

### 6.2 Go to Network Tab
1. Click Network tab
2. Reload page (F5)
3. Look for API requests to `/api/master/tests`

### 6.3 Check Request Details
1. Click on the request
2. Check Headers tab:
   - URL should be: `http://localhost:5000/api/master/tests?page=1&limit=20`
   - Authorization header should have token
3. Check Response tab:
   - Should be JSON, not HTML

### 6.4 Check Console Tab
1. Click Console tab
2. Look for error messages
3. Common errors:
   - `Failed to fetch` - Backend not running
   - `401 Unauthorized` - Token missing/invalid
   - `CORS error` - Backend CORS not configured
   - `JSON.parse error` - Response is HTML

---

## STEP 7: Common Fixes

### Fix 1: Backend Not Running
```bash
cd backend
npm run dev
```

### Fix 2: Port 5000 Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID with actual number)
taskkill /PID <PID> /F

# Then restart backend
npm run dev
```

### Fix 3: Database Connection Failed
```bash
# Check MySQL is running
# Then run migrations
npx prisma migrate dev

# If still failing, reset database
npx prisma db push --force-reset
```

### Fix 4: Not Authenticated
1. Go to `http://localhost:3000/login`
2. Login with admin credentials
3. Reload test list page

### Fix 5: CORS Error
1. Check `backend/.env` has correct `FRONTEND_URL`
2. Restart backend
3. Clear browser cache (Ctrl+Shift+Delete)

### Fix 6: Wrong API URL
1. Check `frontend/src/api/config.ts`
2. Verify `NEXT_PUBLIC_API_URL` is set correctly
3. Restart frontend dev server

---

## STEP 8: Verify Everything Works

### 8.1 Backend Health Check
```bash
curl http://localhost:5000/api/health
```
Should return: `{"status":"OK",...}`

### 8.2 API Test
```bash
curl http://localhost:5000/api/master/tests?page=1&limit=20
```
Should return JSON with tests

### 8.3 Frontend Test
1. Go to `http://localhost:3000/master/testlist`
2. Should display tests in table
3. No error messages in console

### 8.4 Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Should be no red error messages
4. Should see successful API responses

---

## STEP 9: If Still Not Working

### 9.1 Collect Debug Information
1. **Backend Console Output**
   - Copy all messages when starting backend
   - Note any error messages

2. **Browser Console Errors**
   - Open DevTools (F12)
   - Go to Console tab
   - Copy all error messages

3. **Network Request Details**
   - Go to Network tab
   - Click on failed API request
   - Copy Response content

4. **Configuration Files**
   - `backend/.env` - Database URL, PORT
   - `frontend/src/api/config.ts` - API base URL
   - `frontend/.env.local` - Environment variables

### 9.2 Check Logs
```bash
# Backend logs
# Check console output when running: npm run dev

# Frontend logs
# Check browser console (F12)
```

### 9.3 Restart Everything
```bash
# Stop backend (Ctrl+C)
# Stop frontend (Ctrl+C)

# Clear cache
# Delete: frontend/.next folder

# Restart backend
cd backend
npm run dev

# In new terminal, restart frontend
cd frontend
npm run dev
```

---

## STEP 10: Verify Parameter Data

### 10.1 Check Test Has Parameters
```bash
# Get specific test
curl http://localhost:5000/api/master/tests/1
```

Response should include:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Test Name",
    "categories": [
      {
        "categoryId": "cat_1",
        "name": "Category Name",
        "parameters": [
          {
            "parameterName": "Parameter Name",
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

### 10.2 If Parameters Are Missing
1. Check test was created with categories
2. Verify TestParameter records exist in database
3. Check TestCategory records link parameters to test

### 10.3 Database Query
```sql
-- Check parameters for test ID 1
SELECT tp.*, tc.categoryId, tc.categoryName
FROM TestParameter tp
JOIN TestCategory tc ON tp.id = tc.testParameterId
WHERE tp.testId = 1;
```

---

## Quick Reference

| Issue | Solution |
|-------|----------|
| HTML instead of JSON | Start backend: `npm run dev` |
| 401 Unauthorized | Login at `http://localhost:3000/login` |
| CORS Error | Restart backend after checking `.env` |
| Port 5000 in use | Kill process: `taskkill /PID <PID> /F` |
| Database error | Check MySQL running, run: `npx prisma db push` |
| Wrong API URL | Check `frontend/src/api/config.ts` |
| Parameters missing | Check test created with categories |
| Token missing | Check browser storage, login again |

---

## Files to Check

1. **Backend Configuration**
   - `backend/.env` - Database URL, PORT
   - `backend/server.js` - Server setup
   - `backend/controllers/master.controller.js` - getTests function

2. **Frontend Configuration**
   - `frontend/src/api/config.ts` - API base URL
   - `frontend/src/api/master.ts` - API functions
   - `frontend/app/master/testlist/page.tsx` - Test list page

3. **Database**
   - `backend/prisma/schema.prisma` - Schema
   - MySQL database: `shraddha_db`

---

## Support

If you're still having issues:

1. **Check all steps above** - Most issues are covered
2. **Review error messages** - They usually indicate the problem
3. **Check configuration files** - Ensure URLs and credentials are correct
4. **Restart services** - Backend, Frontend, MySQL
5. **Clear cache** - Delete `.next` folder, clear browser cache
6. **Check logs** - Backend console and browser console

---

## Success Indicators

✅ Backend running on port 5000
✅ Database connected
✅ API returns JSON (not HTML)
✅ User is authenticated
✅ Frontend can fetch tests
✅ Tests display in table
✅ Parameters are saved and visible
✅ No error messages in console
