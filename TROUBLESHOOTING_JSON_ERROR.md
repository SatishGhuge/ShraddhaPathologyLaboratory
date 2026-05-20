# Troubleshooting: JSON Parsing Error in Test List

## Error Message
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

This error means the API is returning **HTML** instead of **JSON**.

---

## Quick Diagnosis Checklist

### 1. **Is the Backend Server Running?** ✅ FIRST CHECK THIS
```bash
# Open browser and visit:
http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "SilverLeaf Diagnostics API is running",
  "timestamp": "2026-05-19T..."
}
```

**If you see HTML or "Cannot GET /api/health":**
- Backend is NOT running
- Start it with: `npm run dev` in the `backend` folder

---

### 2. **Test the API Directly**
```bash
# Open browser and visit:
http://localhost:5000/api/master/tests?page=1&limit=20
```

**Expected Response:**
```json
{
  "success": true,
  "data": [...array of tests...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasMore": false
  }
}
```

**If you see HTML:**
- Check backend console for errors
- Verify database connection in `.env`

---

### 3. **Check Authentication**
If you see a login page (HTML) instead of JSON:
- You're not logged in
- Login first at `http://localhost:3000/login`
- Ensure token is stored in browser cookies/localStorage

**To check token:**
1. Open DevTools (F12)
2. Go to Application → Cookies or Local Storage
3. Look for `token` or `auth` key
4. If missing, login again

---

### 4. **Check Browser Console for Errors**
1. Open DevTools (F12)
2. Go to Console tab
3. Look for error messages
4. Check Network tab to see actual API response

---

### 5. **Verify Frontend Configuration**
Check `frontend/src/api/config.ts`:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
```

Should be: `http://localhost:5000/api`

---

## How Parameter Data is Saved

### Database Schema
```
Test (id, name, departmentId, ...)
  ↓
TestParameter (id, testId, parameterName, type, units, ...)
  ↓
TestCategory (id, testId, testParameterId, categoryId, categoryName, ...)
```

### Parameter Data Includes
- **Basic Info**: Name, Type (Numeric/Descriptive/Text), Units
- **Normal Ranges**: Male/Female/Child with low/high values
- **Age Ranges**: JSON array with age-based ranges
- **Formulas**: For calculated parameters
- **Panic Values**: Low/High panic thresholds
- **NABL Compliance**: Flag for NABL certified parameters

### Example Parameter Structure
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
    }
  ],
  "ageRanges": [
    {
      "label": "0-1 years",
      "lowValue": 10.0,
      "highValue": 20.0,
      "gender": "Child"
    }
  ]
}
```

---

## Common Issues & Solutions

### Issue 1: Backend Not Running
**Symptom**: "Cannot GET /api/health"
**Solution**:
```bash
cd backend
npm run dev
```

### Issue 2: Database Connection Failed
**Symptom**: Backend starts but API returns error
**Solution**:
1. Check MySQL is running
2. Verify `DATABASE_URL` in `backend/.env`
3. Run: `npx prisma migrate dev`

### Issue 3: CORS Error
**Symptom**: Request blocked by CORS
**Solution**:
- Verify `FRONTEND_URL` in `backend/.env` is `http://localhost:3000`
- Restart backend after changing `.env`

### Issue 4: Not Authenticated
**Symptom**: API returns login page (HTML)
**Solution**:
1. Login at `http://localhost:3000/login`
2. Use credentials from `backend/ADMIN_CREDENTIALS.md`
3. Verify token is stored

### Issue 5: Wrong API URL
**Symptom**: API calls go to wrong server
**Solution**:
1. Check `frontend/.env.local` for `NEXT_PUBLIC_API_URL`
2. Should be: `http://localhost:5000/api`
3. Restart frontend dev server

---

## API Response Structure

### Success Response
```json
{
  "success": true,
  "data": [...],
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

## Testing Steps

1. **Start Backend**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Login**
   - Visit `http://localhost:3000/login`
   - Use admin credentials

4. **Test API**
   - Visit `http://localhost:5000/api/master/tests?page=1&limit=20`
   - Should return JSON with tests

5. **Check Frontend**
   - Visit `http://localhost:3000/master/testlist`
   - Should display tests in table

---

## Debug Mode

### Enable Detailed Logging
In `backend/server.js`, add:
```javascript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

### Check Network Requests
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Click on API request
5. Check Response tab for actual data

---

## Still Having Issues?

1. **Check backend console** for error messages
2. **Check frontend console** (F12) for error details
3. **Verify database** is running and connected
4. **Check `.env` files** for correct configuration
5. **Restart both servers** after any changes

---

## Files to Check

- `backend/.env` - Database and server configuration
- `backend/server.js` - Server setup and routes
- `backend/controllers/master.controller.js` - getTests function
- `frontend/src/api/master.ts` - API function definitions
- `frontend/app/master/testlist/page.tsx` - Test list page
- `frontend/src/api/config.ts` - API base URL configuration
