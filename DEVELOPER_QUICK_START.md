# Developer Quick Start Guide - Status Workflow

**For developers implementing Phase 2 (Frontend Integration)**

---

## 🚀 Quick Reference

### The 7 Stages (In Order)
```
1. Registered (Gray)    → Patient registers, no sample yet
2. Received (Blue)      → Sample arrives [AUTO on barcode print]
3. Entered (Amber)      → Results entered [AUTO on result save]
4. Validation (Purple)  → Tech validates [MANUAL button]
5. Authorized (Green)   → Senior approves [MANUAL button]
6. Delivered (Cyan)     → Report sent [MANUAL button]
7. Rectified (Red)      → Changes made [MANUAL button]
```

---

## 🔄 Auto-Transitions

### Transition 1: Registered → Received
**Trigger**: When barcode is printed from any page
```javascript
// In barcode print handlers (3 files):
// - frontend/app/patient/registration/page.tsx
// - frontend/app/patient/search-booking/page.tsx
// - frontend/app/result/page.tsx

await fetch(`${API_BASE_URL}/results/${testId}/auto-transition/barcode-printed`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ changedBy: userName })
});
```

### Transition 2: Received → Entered
**Trigger**: When first result value is saved
```javascript
// In result save handler (frontend/app/result/patientresult/[patientTestId]/page.tsx)

await fetch(`${API_BASE_URL}/results/${testId}/auto-transition/result-saved`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ changedBy: userName })
});
```

---

## 👤 Manual Transitions

### Update Status (General Endpoint)
```javascript
// For manual transitions to next stage
await fetch(`${API_BASE_URL}/results/${testId}/status`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'Validation', // Next stage
    remarks: 'Initial validation completed' // Optional
  })
});
```

---

## 🎨 Color Implementation

### Import Colors
```javascript
import STATUS_COLORS from '@/frontend/STATUS_COLOR_REFERENCE';

// Access color for a stage
const colors = STATUS_COLORS['Authorized'];
// Returns:
// {
//   bgColor: 'bg-green-100',
//   textColor: 'text-green-700',
//   borderColor: 'border-green-300',
//   hexColor: '#10B981',
//   lightHexColor: '#ECFDF5',
//   icon: '🛡️',
//   description: '...'
// }
```

### Quick Status Badge
```jsx
import { StatusBadge } from '@/frontend/STATUS_COLOR_REFERENCE';

<StatusBadge 
  status={test.status} 
  showIcon={true} 
  size="md" 
  variant="badge" 
/>
// Renders: [🛡️ Authorized]
```

### Status Card (Large)
```jsx
import { StatusCard } from '@/frontend/STATUS_COLOR_REFERENCE';

<StatusCard status={currentStatus} showDescription={true} />
```

### Progress Timeline
```jsx
import { StatusTimeline } from '@/frontend/STATUS_COLOR_REFERENCE';

<StatusTimeline currentStatus="Entered" />
// Shows: 1✓ 2✓ 3● 4○ 5○ 6○ 7○ (visual timeline)
```

### Dashboard Summary
```jsx
import { StatusSummaryDashboard } from '@/frontend/STATUS_COLOR_REFERENCE';

<StatusSummaryDashboard counts={{
  "Registered": 5,
  "Received": 12,
  "Entered": 8,
  "Validation": 3,
  "Authorized": 2,
  "Delivered": 45,
  "Rectified": 1
}} />
```

---

## 📊 Color Codes - Copy-Paste Reference

```javascript
// Tailwind Classes
const statusClasses = {
  'Registered': 'bg-gray-100 text-gray-700',
  'Received': 'bg-blue-100 text-blue-700',
  'Entered': 'bg-yellow-100 text-yellow-700',
  'Validation': 'bg-purple-100 text-purple-700',
  'Authorized': 'bg-green-100 text-green-700',
  'Delivered': 'bg-cyan-100 text-cyan-700',
  'Rectified': 'bg-red-100 text-red-700'
};

// Hex Colors
const hexColors = {
  'Registered': '#9CA3AF',
  'Received': '#3B82F6',
  'Entered': '#F59E0B',
  'Validation': '#8B5CF6',
  'Authorized': '#10B981',
  'Delivered': '#06B6D4',
  'Rectified': '#EF4444'
};

// Icons
const icons = {
  'Registered': '📄',
  'Received': '📦',
  'Entered': '✏️',
  'Validation': '✓',
  'Authorized': '🛡️',
  'Delivered': '📤',
  'Rectified': '⚠️'
};
```

---

## 🔧 Files to Modify (Phase 2)

### Priority 1: Barcode Print Handlers
```
frontend/app/patient/registration/page.tsx
├─ Find: barcode print button onClick
└─ Add: Call auto-transition/barcode-printed API

frontend/app/patient/search-booking/page.tsx
├─ Find: barcode print button onClick
└─ Add: Call auto-transition/barcode-printed API

frontend/app/result/page.tsx
├─ Find: barcode print button onClick
└─ Add: Call auto-transition/barcode-printed API
```

### Priority 2: Result Entry Page
```
frontend/app/result/patientresult/[patientTestId]/page.tsx
├─ Find: Save result button onClick
└─ Add: Call auto-transition/result-saved API
```

### Priority 3: Status Display
```
frontend/app/result/page.tsx
├─ Find: Status column in table
└─ Update: Use StatusBadge component with colors

frontend/app/result/patientresult/[patientTestId]/page.tsx
├─ Find: Status display area
└─ Update: Use StatusCard component
```

### Priority 4: Transition Buttons
```
frontend/app/result/page.tsx or dashboard
├─ Add: "Move to Validation" button
├─ Add: "Move to Authorized" button
├─ Add: "Mark as Delivered" button
└─ Add: "Rectify" button (if Delivered)
```

---

## 📝 Code Examples

### Example 1: Simple Status Badge in Table
```jsx
<tr>
  <td>{test.testName}</td>
  <td>
    <StatusBadge status={test.status} showIcon={true} size="sm" />
  </td>
  <td>{test.visitId}</td>
</tr>
```

### Example 2: Custom Color Display
```jsx
const colors = STATUS_COLORS[test.status];
<div className={`${colors.bgColor} ${colors.textColor} p-3 rounded`}>
  <span className="text-2xl mr-2">{colors.icon}</span>
  <span className="font-bold">{test.status}</span>
  <span className="text-xs ml-2">{colors.description}</span>
</div>
```

### Example 3: Transition Button (Manual)
```jsx
<button
  onClick={async () => {
    await fetch(`${API_BASE_URL}/results/${testId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Validation',
        remarks: 'Ready for validation'
      })
    });
    // Refresh test data
    await fetchTestDetails(testId);
  }}
  className="px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
>
  ✓ Move to Validation
</button>
```

### Example 4: Barcode Print with Auto-Transition
```jsx
const handlePrintBarcode = async () => {
  // Print barcode
  window.print();
  
  // Auto-transition to Received
  try {
    await fetch(`${API_BASE_URL}/results/${testId}/auto-transition/barcode-printed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changedBy: userName })
    });
    
    // Refresh test to show new status
    await fetchTestDetails(testId);
    showNotification('Test transitioned to Received');
  } catch (error) {
    console.error('Failed to transition status:', error);
  }
};
```

### Example 5: Save Result with Auto-Transition
```jsx
const handleSaveResult = async (resultData) => {
  // Save result
  await saveResults(testId, resultData);
  
  // Auto-transition to Entered
  try {
    await fetch(`${API_BASE_URL}/results/${testId}/auto-transition/result-saved`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changedBy: userName })
    });
    
    // Refresh test to show new status
    await fetchTestDetails(testId);
    showNotification('Test transitioned to Entered');
  } catch (error) {
    console.error('Failed to transition status:', error);
  }
};
```

---

## 🧪 Testing Checklist

- [ ] Create test with status Registered
- [ ] Print barcode → verify auto-transition to Received
- [ ] Save first result value → verify auto-transition to Entered
- [ ] Click "Move to Validation" → verify transition works
- [ ] Verify color changes at each stage
- [ ] Edit result at Validation stage → verify editable
- [ ] Edit result at Authorized stage → verify editable
- [ ] Mark as Delivered
- [ ] Verify color is Cyan
- [ ] Click Rectify → verify status changes to Red
- [ ] Edit result again
- [ ] Re-authorize → verify can move back to Authorized
- [ ] Check Status History → verify all transitions logged

---

## 🐛 Common Issues & Solutions

### Issue: Auto-transition API fails
```
Solution: Ensure test has correct ID and is in the right stage
Check: testId is a number (parseInt if needed)
```

### Issue: Colors not displaying
```
Solution: Ensure importing from correct file
Check: import STATUS_COLORS from '@/frontend/STATUS_COLOR_REFERENCE'
Check: Tailwind classes are in use (not custom CSS)
```

### Issue: Barcode print handler not calling API
```
Solution: Find the print button click handler
Check: Looking in correct component/page
Check: API_BASE_URL is configured correctly
```

### Issue: Status doesn't update in UI after transition
```
Solution: Need to refresh test data after status change
Check: Called fetchTestDetails() or equivalent
Check: Component state updated with new status
```

---

## 🔗 API Endpoints Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/results/:id/status-history` | Fetch all status changes |
| GET | `/api/results/status/summary` | Get stage counts |
| POST | `/api/results/:id/auto-transition/barcode-printed` | Auto → Received |
| POST | `/api/results/:id/auto-transition/result-saved` | Auto → Entered |
| PUT | `/api/results/:id/status` | Manual status transition |

---

## 📚 Reference Files

1. **Backend Utilities**: `backend/utils/statusWorkflow.js`
2. **Color Reference**: `frontend/STATUS_COLOR_REFERENCE.tsx`
3. **Complete Guide**: `backend/SAMPLE_STATUS_WORKFLOW.md`
4. **Visual Guide**: `VISUAL_STATUS_GUIDE.md`
5. **Implementation Summary**: `IMPLEMENTATION_SUMMARY_STATUS_WORKFLOW.md`

---

## ⚡ Quick Tips

1. **Always import STATUS_COLORS** for consistency
2. **Use StatusBadge component** instead of custom HTML
3. **Test auto-transitions** immediately after implementing barcode print
4. **Remember**: Stages are one-way forward (except Rectified loop)
5. **Use API_BASE_URL** for all fetch calls, not hardcoded paths
6. **Add loading states** during API calls for better UX
7. **Show notifications** when status changes automatically
8. **Test multiple times** printing barcode - should only transition once

---

## 🚀 Implementation Order

1. ✅ Update barcode print handlers (3 files)
2. ✅ Update result save handler (1 file)
3. ✅ Add status badges to results list (1 file)
4. ✅ Add status card to result detail (1 file)
5. ✅ Add transition buttons (1 file)
6. ✅ Add status history viewer (1 file)
7. ✅ Add dashboard summary (1 file)
8. ✅ Test all features
9. ✅ Deploy to production

---

**Happy Coding! 🎉**

For questions, refer to the complete documentation files or the backend utility functions.
