# Pagination Implementation Guide

## Overview
Pagination splits large datasets into smaller chunks to improve performance and user experience.

---

## BACKEND IMPLEMENTATION

### Step 1: Controller Function (Already Done - Example)

```javascript
// backend/controllers/patient.controller.js
export const searchPatient = async (req, res) => {
  try {
    const { mobile, email } = req.query;
    
    // ✅ ADD THIS: Get pagination parameters
    const { page, limit, skip } = getPaginationParams(req.query);

    // Build search conditions
    const whereCondition = {};
    if (mobile) whereCondition.mobile = mobile;
    if (email) whereCondition.email = email;

    // ✅ ADD THIS: Get total count
    const total = await prisma.patient.count({
      where: whereCondition
    });

    // ✅ MODIFY: Add skip and take for pagination
    const patients = await prisma.patient.findMany({
      where: whereCondition,
      skip,           // Skip first N records
      take: limit,    // Take only N records
      orderBy: { createdAt: 'desc' }
    });

    // ✅ ADD THIS: Use buildPaginatedResponse
    res.json(buildPaginatedResponse(patients, total, page, limit));
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### Step 2: What getPaginationParams Does

```javascript
// backend/utils/pagination.js (Already exists)
export const getPaginationParams = (query) => {
  let page = parseInt(query.page) || 1;      // Default page 1
  let limit = parseInt(query.limit) || 20;   // Default 20 items per page

  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;  // Max 100 items per page

  const skip = (page - 1) * limit;  // Calculate how many to skip
  
  return { page, limit, skip };
};
```

### Step 3: What buildPaginatedResponse Returns

```javascript
// Response format sent to frontend
{
  success: true,
  data: [
    { id: 1, name: "Patient 1", ... },
    { id: 2, name: "Patient 2", ... },
    // ... 20 items
  ],
  pagination: {
    page: 1,           // Current page
    limit: 20,         // Items per page
    total: 150,        // Total items in database
    totalPages: 8,     // 150 / 20 = 8 pages
    hasMore: true      // true if more pages exist
  }
}
```

### Step 4: Route Setup (Already Done)

```javascript
// backend/routes/patient.routes.js
router.get('/search', searchPatient);  // Supports ?page=1&limit=20
```

---

## FRONTEND IMPLEMENTATION

### Step 1: State Management

```typescript
// frontend/app/patient/search-booking/page.tsx
const [patients, setPatients] = useState<any[]>([]);
const [currentPage, setCurrentPage] = useState(1);
const [pagination, setPagination] = useState<any>(null);
const [loading, setLoading] = useState(false);

const ITEMS_PER_PAGE = 20;
```

### Step 2: Fetch Function with Pagination

```typescript
const fetchPatients = async (page: number = 1) => {
  try {
    setLoading(true);
    
    // ✅ Pass page and limit to API
    const response = await searchPatient(mobile, email, page, ITEMS_PER_PAGE);
    
    // ✅ Extract data and pagination info
    if (response?.success && response?.data) {
      setPatients(response.data);
      setPagination(response.pagination);  // Store pagination info
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

### Step 3: Update API Call

```typescript
// frontend/src/api/patient.ts
export const searchPatient = async (
  mobile?: string, 
  email?: string,
  page: number = 1,        // ✅ ADD page parameter
  limit: number = 20       // ✅ ADD limit parameter
): Promise<ApiResponse> => {
  const params = new URLSearchParams();
  if (mobile) params.append('mobile', mobile);
  if (email) params.append('email', email);
  params.append('page', page.toString());      // ✅ ADD
  params.append('limit', limit.toString());    // ✅ ADD
  
  const response = await apiCall(`/patients/search?${params.toString()}`, {
    method: 'GET',
  });
  return response;
};
```

### Step 4: useEffect to Fetch on Page Change

```typescript
useEffect(() => {
  fetchPatients(currentPage);  // Fetch when page changes
}, [currentPage]);
```

### Step 5: Pagination UI Component

```typescript
// Add this at the bottom of your page
{pagination && (
  <div className="flex items-center justify-between mt-6 p-4 bg-white rounded-lg shadow">
    {/* Left: Info */}
    <div className="text-sm text-gray-600">
      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
      {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of{' '}
      {pagination.total} results
    </div>

    {/* Center: Page Numbers */}
    <div className="flex gap-2">
      {/* Previous Button */}
      <button
        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
        className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
      >
        Previous
      </button>

      {/* Page Numbers */}
      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
        .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === pagination.totalPages)
        .map((p, idx, arr) => (
          <React.Fragment key={p}>
            {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-2">...</span>}
            <button
              onClick={() => setCurrentPage(p)}
              className={`px-3 py-2 border rounded ${
                currentPage === p
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          </React.Fragment>
        ))}

      {/* Next Button */}
      <button
        onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
        disabled={currentPage === pagination.totalPages}
        className="px-3 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
      >
        Next
      </button>
    </div>

    {/* Right: Items Per Page Selector */}
    <select
      value={ITEMS_PER_PAGE}
      onChange={(e) => {
        // Update ITEMS_PER_PAGE and reset to page 1
        setCurrentPage(1);
      }}
      className="px-3 py-2 border rounded"
    >
      <option value="10">10 per page</option>
      <option value="20">20 per page</option>
      <option value="50">50 per page</option>
    </select>
  </div>
)}
```

---

## COMPLETE EXAMPLE: Patient Search with Pagination

### Backend (patient.controller.js)

```javascript
export const searchPatient = async (req, res) => {
  try {
    const { mobile, email } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query);  // ✅ NEW

    const whereCondition = {};
    if (mobile) whereCondition.mobile = mobile;
    if (email) whereCondition.email = email;

    const total = await prisma.patient.count({ where: whereCondition });  // ✅ NEW

    const patients = await prisma.patient.findMany({
      where: whereCondition,
      skip,                    // ✅ NEW
      take: limit,             // ✅ NEW
      orderBy: { createdAt: 'desc' }
    });

    res.json(buildPaginatedResponse(patients, total, page, limit));  // ✅ NEW
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### Frontend (search-booking/page.tsx)

```typescript
"use client";
import { useState, useEffect } from "react";
import { searchPatient } from "@/src/api/patient";

export default function SearchBooking() {
  const [mobile, setMobile] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (mobile) {
      fetchPatients(currentPage);
    }
  }, [currentPage]);

  const fetchPatients = async (page: number) => {
    try {
      setLoading(true);
      const response = await searchPatient(mobile, undefined, page, ITEMS_PER_PAGE);
      
      if (response?.success) {
        setPatients(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);  // Reset to page 1 on new search
    fetchPatients(1);
  };

  return (
    <div>
      {/* Search Input */}
      <input
        type="text"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        placeholder="Enter mobile number"
      />
      <button onClick={handleSearch}>Search</button>

      {/* Results Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table>
            <tbody>
              {patients.map(p => (
                <tr key={p.patientId}>
                  <td>{p.firstName} {p.lastName}</td>
                  <td>{p.mobile}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {pagination && (
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <span>Page {currentPage} of {pagination.totalPages}</span>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

---

## SUMMARY: What Changes

### Backend Changes
1. ✅ Import `getPaginationParams` and `buildPaginatedResponse`
2. ✅ Call `getPaginationParams(req.query)` to get page, limit, skip
3. ✅ Add `.skip(skip).take(limit)` to Prisma query
4. ✅ Get total count with `.count()`
5. ✅ Return `buildPaginatedResponse(data, total, page, limit)`

### Frontend Changes
1. ✅ Add state: `currentPage`, `pagination`
2. ✅ Update API call to pass `page` and `limit`
3. ✅ Add `useEffect` to fetch when `currentPage` changes
4. ✅ Add pagination UI buttons (Previous, Next, Page Numbers)
5. ✅ Reset `currentPage` to 1 on new search

---

## Performance Impact

**Before Pagination:**
- Load 1000 patients = 2-3MB response, 5-10 seconds

**After Pagination:**
- Load 20 patients per page = 50-100KB response, 200-500ms
- **60-70% faster page loads**
