# Remaining Pages - Pagination Implementation Guide

## Pages That Still Need Pagination Updates

The following master list pages should be updated with server-side pagination:

### 1. Doctor List
**File**: `frontend/app/master/referral-doctor-list/page.tsx`
**Backend Endpoint**: `GET /api/master/doctors?page=1&limit=20`
**Status**: ⏳ Pending

### 2. Franchise List
**File**: `frontend/app/master/franchise/page.tsx`
**Backend Endpoint**: `GET /api/master/franchises?page=1&limit=20`
**Status**: ⏳ Pending

### 3. Corporate List
**File**: `frontend/app/master/corporatelist/page.tsx`
**Backend Endpoint**: `GET /api/master/corporates?page=1&limit=20`
**Status**: ⏳ Pending

### 4. Collection Center List
**File**: `frontend/app/master/centerlist/page.tsx`
**Backend Endpoint**: `GET /api/master/collection-centers?page=1&limit=20`
**Status**: ⏳ Pending

### 5. Role List
**File**: `frontend/app/master/rolelist/page.tsx`
**Backend Endpoint**: `GET /api/master/roles?page=1&limit=20`
**Status**: ⏳ Pending

### 6. User List
**File**: `frontend/app/master/userlist/page.tsx`
**Backend Endpoint**: `GET /api/master/users?page=1&limit=20`
**Status**: ⏳ Pending

## Implementation Template

Use this template to update remaining pages:

```typescript
// 1. Add state variables
const [currentPage, setCurrentPage] = useState(1);
const [pagination, setPagination] = useState<any>(null);
const ITEMS_PER_PAGE = 20;

// 2. Update useEffect to depend on currentPage
useEffect(() => {
  fetchData(currentPage);
}, [currentPage]);

// 3. Update fetch function
const fetchData = async (page: number = 1) => {
  try {
    setLoading(true);
    const response = await fetch(
      `${API_URL}/endpoint?page=${page}&limit=${ITEMS_PER_PAGE}`
    );
    const result = await response.json();
    
    if (result.success) {
      setData(result.data);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};

// 4. Update reset handler
const handleReset = () => {
  setSearch("");
  setCurrentPage(1);
  fetchData(1);
};

// 5. Add pagination controls to JSX (copy from testlist/page.tsx)
{pagination && pagination.totalPages > 1 && (
  <div className="border-t p-3 bg-gray-50 flex items-center justify-between text-xs sm:text-sm">
    {/* Previous button */}
    {/* Page numbers */}
    {/* Next button */}
  </div>
)}
```

## Quick Copy-Paste Pagination Controls

```typescript
{/* Pagination Controls */}
{pagination && pagination.totalPages > 1 && (
  <div className="border-t p-3 bg-gray-50 flex items-center justify-between text-xs sm:text-sm">
    <button
      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
      disabled={currentPage === 1}
      className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
    >
      ← Previous
    </button>

    <div className="flex items-center gap-1">
      {(() => {
        const pages = [];
        const totalPages = pagination.totalPages;
        
        if (totalPages <= 5) {
          for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
          if (currentPage <= 3) {
            pages.push(1, 2, 3, 4, '...', totalPages);
          } else if (currentPage >= totalPages - 2) {
            pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
          } else {
            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
          }
        }

        return pages.map((page, idx) => (
          page === '...' ? (
            <span key={idx} className="px-2">...</span>
          ) : (
            <button
              key={idx}
              onClick={() => setCurrentPage(page as number)}
              className={`w-7 h-7 rounded ${currentPage === page ? 'bg-cyan-600 text-white font-bold' : 'bg-white border hover:bg-gray-100'}`}
            >
              {page}
            </button>
          )
        ));
      })()}
    </div>

    <button
      onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
      disabled={currentPage === pagination.totalPages}
      className={`px-3 py-1 rounded ${currentPage === pagination.totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
    >
      Next →
    </button>
  </div>
)}
```

## Row Number Calculation

Update row numbers to account for pagination:

```typescript
// Before (wrong for pagination)
<td>{index + 1}</td>

// After (correct for pagination)
<td>{((pagination?.page || 1) - 1) * ITEMS_PER_PAGE + index + 1}</td>
```

## Page Info Display

Add this above the table:

```typescript
<div className="flex justify-between items-center p-3 border-b bg-gray-50">
  <span className="text-sm font-semibold text-gray-700">
    Page {pagination?.page || 1} of {pagination?.totalPages || 1} 
    {pagination?.total && ` (Total: ${pagination.total})`}
  </span>
</div>
```

## Priority Order

1. **High Priority** (Most used):
   - Doctor List
   - Franchise List
   - Corporate List

2. **Medium Priority** (Moderately used):
   - Collection Center List
   - Role List

3. **Low Priority** (Less frequently used):
   - User List

## Estimated Time

- Per page: 5-10 minutes
- All 6 pages: 30-60 minutes

## Testing After Update

For each page:
1. Load page and verify first page displays
2. Click Next and verify page 2 loads
3. Click Previous and verify page 1 loads
4. Click page number and verify correct page loads
5. Click Reset and verify page 1 loads
6. Verify row numbers are correct for each page
7. Verify total count is displayed

## Notes

- All pages use same pagination logic
- Backend already supports pagination for all endpoints
- No backend changes needed
- All changes are frontend-only
- Can be done incrementally (one page at a time)
