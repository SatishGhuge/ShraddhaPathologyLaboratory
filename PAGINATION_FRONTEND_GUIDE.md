# Frontend Pagination Implementation Guide

## How to Use Pagination in Frontend Components

### Basic Usage Pattern

```typescript
import { useState, useEffect } from 'react';
import { getPatientTests } from '@/api/result';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await getPatientTests({}, page, 50);
        setResults(response.data);
        setPagination(response.pagination);
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [page]);

  return (
    <div>
      {/* Results Table */}
      <table>
        <tbody>
          {results.map(result => (
            <tr key={result.id}>
              {/* Render result */}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {pagination && (
        <div className="pagination">
          <button 
            onClick={() => setPage(page - 1)} 
            disabled={page === 1}
          >
            Previous
          </button>
          
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          
          <button 
            onClick={() => setPage(page + 1)} 
            disabled={!pagination.hasMore}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

## Pagination Response Structure

```typescript
interface PaginationResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;           // Current page (1-indexed)
    limit: number;          // Items per page
    total: number;          // Total items in database
    totalPages: number;     // Total pages available
    hasMore: boolean;       // Whether more pages exist
  };
}
```

## Common Patterns

### 1. Infinite Scroll Pattern

```typescript
const [results, setResults] = useState([]);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

const loadMore = async () => {
  const response = await getPatientTests({}, page + 1, 50);
  setResults([...results, ...response.data]);
  setPage(page + 1);
  setHasMore(response.pagination.hasMore);
};
```

### 2. Search with Pagination

```typescript
const [searchTerm, setSearchTerm] = useState('');
const [page, setPage] = useState(1);

const handleSearch = async (term: string) => {
  setSearchTerm(term);
  setPage(1); // Reset to first page on new search
  
  const response = await getPatientTests(
    { patientName: term }, 
    1, 
    50
  );
  setResults(response.data);
  setPagination(response.pagination);
};
```

### 3. Filter with Pagination

```typescript
const [filters, setFilters] = useState({
  status: 'All',
  department: 'All'
});
const [page, setPage] = useState(1);

const handleFilterChange = (newFilters: any) => {
  setFilters(newFilters);
  setPage(1); // Reset to first page on filter change
  
  fetchResults(newFilters, 1);
};

const fetchResults = async (filters: any, pageNum: number) => {
  const response = await getPatientTests(filters, pageNum, 50);
  setResults(response.data);
  setPagination(response.pagination);
};
```

## API Calls with Pagination

### Get Patients (Page 1, 20 items)
```typescript
const response = await getAllPatients(1, 20);
// response.data = array of patients
// response.pagination = { page: 1, limit: 20, total: 500, totalPages: 25, hasMore: true }
```

### Get Tests (Page 2, 30 items)
```typescript
const response = await getTests(2, 30);
// Gets items 31-60 from all tests
```

### Get Results with Filters
```typescript
const response = await getPatientTests(
  { status: 'Pending', department: 'Pathology' },
  1,
  50
);
// Gets first 50 pending pathology results
```

## Pagination Limits

- **Minimum limit**: 1 item per page
- **Maximum limit**: 100 items per page
- **Default limit**: 20 items per page (if not specified)
- **Default page**: 1 (if not specified)

## Error Handling

```typescript
try {
  const response = await getPatientTests({}, page, 50);
  if (!response.success) {
    throw new Error(response.message);
  }
  setResults(response.data);
  setPagination(response.pagination);
} catch (error) {
  console.error('Failed to fetch results:', error);
  // Show error message to user
}
```

## Performance Tips

1. **Use appropriate page size**
   - Small lists: 20-30 items per page
   - Large lists: 50-100 items per page
   - Balance between UX and performance

2. **Cache results**
   - Store fetched pages in memory
   - Avoid re-fetching same page

3. **Debounce search/filter**
   - Wait for user to stop typing before fetching
   - Reduces unnecessary API calls

4. **Show loading state**
   - Disable pagination buttons while loading
   - Show spinner or skeleton loader

5. **Lazy load related data**
   - Don't load all related data upfront
   - Load details on demand

## Example: Complete Patient List Component

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getAllPatients } from '@/api/patient';

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getAllPatients(page, 20);
        if (response.success) {
          setPatients(response.data);
          setPagination(response.pagination);
        } else {
          setError(response.message || 'Failed to fetch patients');
        }
      } catch (err) {
        setError('Error fetching patients');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [page]);

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="patient-list">
      {loading && <div className="loading">Loading...</div>}
      
      <table>
        <thead>
          <tr>
            <th>Patient ID</th>
            <th>Name</th>
            <th>Mobile</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {patients.map(patient => (
            <tr key={patient.id}>
              <td>{patient.patientId}</td>
              <td>{patient.firstName} {patient.lastName}</td>
              <td>{patient.mobile}</td>
              <td>{patient.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && (
        <div className="pagination-controls">
          <button 
            onClick={() => setPage(1)} 
            disabled={page === 1}
          >
            First
          </button>
          
          <button 
            onClick={() => setPage(page - 1)} 
            disabled={page === 1}
          >
            Previous
          </button>
          
          <span>
            Page {pagination.page} of {pagination.totalPages} 
            (Total: {pagination.total})
          </span>
          
          <button 
            onClick={() => setPage(page + 1)} 
            disabled={!pagination.hasMore}
          >
            Next
          </button>
          
          <button 
            onClick={() => setPage(pagination.totalPages)} 
            disabled={!pagination.hasMore}
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
}
```

## Migration Checklist

- [ ] Update all list page components to use pagination
- [ ] Add pagination controls to UI
- [ ] Test with different page sizes
- [ ] Test with filters + pagination
- [ ] Test with search + pagination
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test with large datasets (10K+ records)
- [ ] Optimize page size based on performance
- [ ] Add keyboard navigation (optional)
