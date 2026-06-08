# PHASE 2: Frontend Integration - Implementation Plan

## 🎯 Tasks Overview

### Task 1: Update Barcode Print Handlers (3 files)
Call the new auto-transition API when barcode is printed

**Files to update:**
1. `frontend/app/patient/registration/page.tsx` - Line 2586
2. `frontend/app/patient/search-booking/page.tsx` - Lines 2580-2610
3. `frontend/app/result/page.tsx` - Lines 2590-2596

**Current Pattern (All 3 files):**
```javascript
// Get the print element
const printArea = document.getElementById('barcode-print-area');

// Open new window
const win = window.open('', '_blank');

// Write HTML
win.document.write(`<!DOCTYPE html>...${printArea.innerHTML}</body></html>`);

// Close document
win.document.close();

// Focus and print
win.focus();
win.print();
win.close();
```

**New Pattern (Add before win.print()):**
```javascript
// Call API to transition to Received status
try {
  const testIds = barcodeLabels.map(label => {
    // Extract test ID from label - need to track which test each barcode is for
    return testId; // Should be available in state
  });
  
  // Call auto-transition for each test
  for (const id of testIds) {
    await fetch(`${API_BASE_URL}/results/${id}/auto-transition/barcode-printed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changedBy: 'registration_user' })
    });
  }
  
  console.log('✅ Tests transitioned to Received status');
} catch (error) {
  console.error('❌ Failed to transition status:', error);
  // Don't block print if status update fails
}

// Then proceed with print as normal
win.focus();
win.print();
```

---

### Task 2: Update Result Entry Save Handler
Call the auto-transition API when first result is saved

**File**: `frontend/app/result/patientresult/[patientTestId]/page.tsx` - Line 315

**Current Code:**
```javascript
const response = await fetch(`${API_BASE_URL}/results/${patientData.id}/results`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ results: resultsData, enteredBy: 'current_user' })
});
```

**Add After Response Success:**
```javascript
if (data.success) {
  // Call API to transition to Entered status
  try {
    const transitionResponse = await fetch(
      `${API_BASE_URL}/results/${patientData.id}/auto-transition/result-saved`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changedBy: 'result_entry_user' })
      }
    );
    
    const transitionData = await transitionResponse.json();
    if (transitionData.success) {
      console.log('✅ Test auto-transitioned to Entered status');
      // Optionally show notification or update UI
    }
  } catch (error) {
    console.error('Failed to auto-transition status:', error);
    // Don't block save if transition fails
  }
  
  // Continue with existing logic...
  if (allResultsFilled()) {
    await updateTestStatus(patientData.id, { status: 'AUTHENTICATED' });
  }
}
```

---

### Task 3: Add Status Display Components
Update result pages to show status with colors

**Files to update:**
- `frontend/app/result/page.tsx` - Results list table
- `frontend/app/result/patientresult/[patientTestId]/page.tsx` - Result detail page

**Implementation:**
```javascript
// Import color reference
import STATUS_COLORS from '@/frontend/STATUS_COLOR_REFERENCE';

// In the table/display section, replace simple status text with:
<StatusBadge status={test.status} showIcon={true} size="sm" variant="badge" />

// Or custom implementation:
{
  const colors = STATUS_COLORS[test.status] || STATUS_COLORS['Registered'];
  <span className={`${colors.bgColor} ${colors.textColor} px-2 py-1 rounded text-xs`}>
    {colors.icon} {test.status}
  </span>
}
```

---

### Task 4: Add Transition Buttons
Add buttons for manual status transitions

**Location**: `frontend/app/result/page.tsx` or dashboard

**Implementation:**
```jsx
<button
  onClick={async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/results/${test.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Validation',
          remarks: 'Ready for validation'
        })
      });
      
      if (response.ok) {
        console.log('✅ Test status updated to Validation');
        // Refresh test list
        await fetchResults();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }}
  className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
>
  ✓ Validate
</button>
```

---

### Task 5: Add Status History Viewer
Show timeline of status changes

**Implementation:**
```jsx
const StatusHistory = ({ testId }) => {
  const [history, setHistory] = useState([]);
  
  useEffect(() => {
    const fetchHistory = async () => {
      const response = await fetch(`${API_BASE_URL}/results/${testId}/status-history`);
      const data = await response.json();
      setHistory(data.data);
    };
    
    fetchHistory();
  }, [testId]);
  
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">Status History</h3>
      {history.map((item, idx) => (
        <div key={idx} className="flex items-start gap-3 text-xs">
          <div className="text-gray-400">{new Date(item.changedAt).toLocaleString()}</div>
          <div>
            <span className="font-semibold">{item.previousStatus}</span>
            <span className="mx-2">→</span>
            <span className="font-semibold">{item.newStatus}</span>
          </div>
          <span className="text-gray-500">({item.triggerType})</span>
          {item.changedBy && <span className="text-gray-500">by {item.changedBy}</span>}
        </div>
      ))}
    </div>
  );
};
```

---

### Task 6: Update Dashboard Summary
Show status breakdown

**Implementation:**
```jsx
const StatusDashboard = () => {
  const [summary, setSummary] = useState(null);
  
  useEffect(() => {
    const fetchSummary = async () => {
      const response = await fetch(`${API_BASE_URL}/results/status/summary`);
      const data = await response.json();
      setSummary(data.data);
    };
    
    fetchSummary();
  }, []);
  
  if (!summary) return <div>Loading...</div>;
  
  return (
    <div className="grid grid-cols-7 gap-2">
      {Object.entries(summary).map(([stage, count]) => {
        const colors = STATUS_COLORS[stage];
        return (
          <div key={stage} className={`${colors.bgColor} p-3 rounded text-center`}>
            <div className="text-2xl">{colors.icon}</div>
            <div className="font-bold text-lg">{count}</div>
            <div className="text-xs">{stage}</div>
          </div>
        );
      })}
    </div>
  );
};
```

---

## 🔧 Implementation Sequence

### Phase 2.1: Barcode Auto-Transitions (Priority 1)
- [ ] Update registration page barcode print (line 2586)
- [ ] Update search-booking page barcode print (line 2580-2610)
- [ ] Update result page barcode print (line 2590-2596)
- [ ] Test all 3 barcode print endpoints

### Phase 2.2: Result Entry Auto-Transitions (Priority 1)
- [ ] Update result detail page save handler (line 315)
- [ ] Test auto-transition on result save
- [ ] Verify status changes to "Entered"

### Phase 2.3: Status Display (Priority 2)
- [ ] Add StatusBadge component to results list
- [ ] Add status colors to result detail page
- [ ] Update all result tables with colored status badges

### Phase 2.4: Manual Transitions (Priority 3)
- [ ] Add transition buttons to result pages
- [ ] Implement button handlers
- [ ] Test manual transitions

### Phase 2.5: Status History & Dashboard (Priority 3)
- [ ] Add status history viewer component
- [ ] Add dashboard summary component
- [ ] Display on appropriate pages

---

## 📝 Key Variables to Track

### In registration page (showBarcodeAfterRegistration):
- `visitId` - Need to get test IDs for each test
- `tests` array - Contains test objects with IDs

### In result page (handleBarcodePrint):
- `barcodeSelectedTests` - Set of selected test IDs
- Need to map these to actual database test IDs

### In result entry page (handleSave):
- `patientData.id` - Already available
- This is the patientTestId needed for API call

---

## ⚠️ Important Notes

1. **Test ID Tracking**: Need to ensure each barcode corresponds to a specific test record ID for the API call

2. **Multiple Barcodes**: If printing multiple barcodes per visit, need to call auto-transition for EACH test

3. **Error Handling**: API call failures should NOT block the print operation

4. **User Feedback**: Consider showing a brief toast/notification when auto-transition succeeds

5. **API Response**: Verify that API returns the updated test status for confirmation

---

## 🧪 Testing Checklist

- [ ] Print barcode from registration → Test transitions to "Received"
- [ ] Save result value → Test transitions to "Entered"
- [ ] Multiple barcode prints on same day → Visit ID counter increments
- [ ] Different day print → Counter resets
- [ ] Status colors display correctly
- [ ] Transition buttons work
- [ ] Status history shows all changes
- [ ] Dashboard summary updates

---

## 📊 Files That Need Changes

```
Priority 1 (Critical):
├─ frontend/app/patient/registration/page.tsx (line 2586)
├─ frontend/app/patient/search-booking/page.tsx (line 2580-2610)
├─ frontend/app/result/page.tsx (line 2590-2596 + table status display)
└─ frontend/app/result/patientresult/[patientTestId]/page.tsx (line 315)

Priority 2 (Important):
├─ Create or update STATUS_COLORS component
└─ Add status display to all result pages

Priority 3 (Enhancement):
├─ Add status history viewer
├─ Add dashboard summary
└─ Add transition buttons
```

---

**Ready to proceed with implementation?**
