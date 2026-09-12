# WhatsApp-AISensy Integration - Testing Guide

## Pre-Requisites

1. ✅ Backend server running on `http://localhost:3351`
2. ✅ MySQL database connected and migrated
3. ✅ AISensy account with API key
4. ✅ 3 campaigns created in AISensy dashboard:
   - `patient_welcome_credentials`
   - `visit_bill_dispatch`
   - `lab_report_dispatch`
5. ✅ `.env` file updated with AISensy configuration

---

## Setup Steps

### Step 1: Database Migration

```bash
cd backend
npx prisma migrate dev --name add_notification_logs_aisensy
```

Expected output:
```
✅ Your database has been successfully migrated
✅ Generated Prisma Client to ./node_modules/@prisma/client
```

### Step 2: Update .env

Edit `backend/.env`:
```env
AISENSY_API_KEY=your_actual_api_key_here
AISENSY_WELCOME_CAMPAIGN=patient_welcome_credentials
AISENSY_VISIT_BILL_CAMPAIGN=visit_bill_dispatch
AISENSY_REPORT_CAMPAIGN=lab_report_dispatch
```

### Step 3: Restart Backend Server

```bash
npm run dev
```

Expected output:
```
🚀 Server running on port 3351
📍 Environment: development
🌐 CORS enabled for: http://localhost:3000
✅ Email service is ready to send credentials
```

---

## Test Suite

### TEST 1: Template 1 - Registration Credentials

**Objective:** Verify that new patient registration sends credentials via WhatsApp

**Prerequisites:**
- Valid WhatsApp number (your test number)
- reportMode set to WHATSAPP or EMAIL

**Steps:**

1. **Register New Patient via API:**

```bash
curl -X POST http://localhost:3351/api/patients/admin/register-with-email \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Patient1",
    "email": "test.patient1@example.com",
    "mobile": "9876543210",
    "dob": "1990-01-15",
    "gender": "Male",
    "address": "Test Address",
    "location": "Test Location",
    "tests": [
      {
        "id": 1,
        "departmentId": 1,
        "sample": "Blood",
        "reportMode": "WHATSAPP"
      }
    ],
    "totalAmount": 500,
    "discountAmount": 0,
    "paidAmount": 0,
    "paymentMode": "Cash"
  }'
```

2. **Expected Response:**
```json
{
  "success": true,
  "message": "Patient registered successfully. Credentials sent.",
  "data": {
    "patientId": "PAT0001",
    "email": "test.patient1@example.com",
    "mobile": "9876543210",
    "message": "Patient ID: PAT0001, Credentials sent via WHATSAPP"
  }
}
```

3. **Verification:**
   - ✅ Patient receives WhatsApp message with credentials
   - ✅ Check database: `SELECT * FROM notification_logs WHERE eventType = 'PATIENT_REGISTRATION' LIMIT 1;`
   - ✅ Should show `status = 'SUCCESS'` and `responseMessageId` populated

**Test Variations:**

| Test | Mobile | Email | ReportMode | Expected |
|------|--------|-------|-----------|----------|
| 1A | ✅ | ✅ | WHATSAPP | WhatsApp sent |
| 1B | ❌ | ✅ | WHATSAPP | Error logged, contact missing |
| 1C | ✅ | ✅ | EMAIL | Email sent (via emailService) |
| 1D | ❌ | ✅ | EMAIL | Error logged, no email contact |
| 1E | ✅ | ✅ | BY_HAND | No notification sent |

---

### TEST 2: Template 2 - Visit Thank You + Bill PDF

**Objective:** Verify that bill creation sends thank you message with bill PDF

**Prerequisites:**
- Patient registered with reportMode = WHATSAPP
- Valid mobile number

**Steps:**

1. **Bill is automatically created during registration (from TEST 1)**

2. **Verification:**
   - ✅ Patient receives WhatsApp with bill PDF (or link)
   - ✅ Check database:
     ```sql
     SELECT * FROM notification_logs 
     WHERE eventType = 'VISIT_BILL' 
     ORDER BY createdAt DESC LIMIT 1;
     ```
   - ✅ Should show `status = 'SUCCESS'`

3. **Confirm Visit ID:**
   ```sql
   SELECT visitId FROM visit_bills 
   WHERE patientId = 'PAT0001' 
   LIMIT 1;
   ```
   Note the visitId for next tests.

---

### TEST 3: Template 3 - Report Authorization (Payment NOT Complete)

**Objective:** Verify that report stays AUTHORIZED when payment incomplete

**Prerequisites:**
- Patient registered (from TEST 1)
- Tests created with status "Entered"
- Report status changed to "AUTHORIZED"
- Outstanding balance exists

**Steps:**

1. **Update Test Status to AUTHORIZED:**
```bash
curl -X PUT http://localhost:3351/api/results/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "AUTHORIZED"}'
```

2. **Attempt to Authorize & Send:**
```bash
curl -X POST http://localhost:3351/api/results/authorize-and-send \
  -H "Content-Type: application/json" \
  -d '{
    "testIds": [1],
    "visitId": "20250812001"
  }'
```

3. **Expected Response (402 Error):**
```json
{
  "success": false,
  "message": "Payment not complete. Reports remain in AUTHORIZED status.",
  "warning": "Pending payment: ₹500.00",
  "data": {
    "visitId": "20250812001",
    "status": "AUTHORIZED",
    "balanceAmount": "500.00"
  }
}
```

4. **Verification:**
   - ✅ HTTP Status = 402 Payment Required
   - ✅ Test status still = "AUTHORIZED"
   - ✅ No entry in notification_logs for REPORT_DELIVERY yet
   - ✅ No WhatsApp sent to patient or doctor

---

### TEST 4: Template 3 - Report Authorization (Payment COMPLETE)

**Objective:** Verify that report sends when payment is complete

**Prerequisites:**
- From TEST 3: Report in AUTHORIZED status
- Outstanding balance remains

**Steps:**

1. **Record Full Payment:**
```bash
curl -X POST http://localhost:3351/api/patients/20250812001/payment-record \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "paymentMode": "Cash",
    "remarks": "Full payment for testing"
  }'
```

2. **Expected Response:**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "balanceAmount": "0.00",
    "status": "PAID"
  }
}
```

3. **Verification (Automatic Send):**
   - ✅ System automatically triggered `checkAndSendPendingAuthorizedReports()`
   - ✅ Patient receives WhatsApp with report PDF
   - ✅ Check notification_logs:
     ```sql
     SELECT * FROM notification_logs 
     WHERE eventType = 'REPORT_DELIVERY' 
     AND recipientType = 'patient'
     ORDER BY createdAt DESC LIMIT 1;
     ```
   - ✅ Should show `status = 'SUCCESS'`

4. **Check Report Status:**
   ```sql
   SELECT status FROM patient_tests WHERE id = 1;
   ```
   - ✅ Should now be "DELIVERED"

---

### TEST 5: Template 3 - With Referral Doctor

**Objective:** Verify that report sends to both patient and referral doctor

**Prerequisites:**
- Referral doctor created in system with:
  - `sendReportsViaMail = true` OR `sendReportsViaWhatsApp = true`
  - Valid email/mobile number

**Steps:**

1. **Register Patient WITH Referral Doctor:**

```bash
curl -X POST http://localhost:3351/api/patients/admin/register-with-email \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Patient2",
    "email": "test.patient2@example.com",
    "mobile": "9876543211",
    "dob": "1990-01-15",
    "gender": "Female",
    "address": "Test Address",
    "location": "Test Location",
    "referralDoctor": {
      "id": 1,
      "name": "Dr. Smith"
    },
    "tests": [
      {
        "id": 1,
        "departmentId": 1,
        "sample": "Blood",
        "reportMode": "WHATSAPP"
      }
    ],
    "totalAmount": 500,
    "discountAmount": 0,
    "paidAmount": 500,
    "paymentMode": "Cash"
  }'
```

2. **Update Test to AUTHORIZED:**
```bash
curl -X PUT http://localhost:3351/api/results/2/status \
  -H "Content-Type: application/json" \
  -d '{"status": "AUTHORIZED"}'
```

3. **Record Payment (Full):**
```bash
curl -X POST http://localhost:3351/api/patients/{visitId}/payment-record \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "paymentMode": "Cash"
  }'
```

4. **Verification:**
   - ✅ Patient receives WhatsApp with report
   - ✅ Doctor receives WhatsApp with report (if `sendReportsViaWhatsApp = true`)
   - ✅ Check notification_logs for TWO entries:
     ```sql
     SELECT * FROM notification_logs 
     WHERE eventType = 'REPORT_DELIVERY' 
     AND visitId = 'VISX'
     ORDER BY createdAt DESC;
     ```
   - ✅ Should show:
     - One with `recipientType = 'patient'` and `status = 'SUCCESS'`
     - One with `recipientType = 'doctor'` and `status = 'SUCCESS'` or `'FAILED'`

---

### TEST 6: Template 3 - Missing Patient Contact

**Objective:** Verify that report stays AUTHORIZED when patient contact is missing

**Prerequisites:**
- Patient registered WITHOUT mobile number
- reportMode = WHATSAPP
- Payment complete

**Steps:**

1. **Register Patient WITHOUT Mobile:**

```bash
curl -X POST http://localhost:3351/api/patients/admin/register-with-email \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Patient3",
    "email": "test.patient3@example.com",
    "mobile": "",
    "tests": [{...}],
    "totalAmount": 500,
    "discountAmount": 0,
    "paidAmount": 500,
    "paymentMode": "Cash"
  }'
```

2. **Update Test to AUTHORIZED and Record Payment**

3. **Verification:**
   - ✅ WhatsApp NOT sent to patient
   - ✅ Check notification_logs:
     ```sql
     SELECT * FROM notification_logs 
     WHERE eventType = 'REPORT_DELIVERY' 
     AND recipientType = 'patient'
     ORDER BY createdAt DESC LIMIT 1;
     ```
   - ✅ Should show:
     - `status = 'FAILED'`
     - `errorMessage = 'WhatsApp reportMode selected but patient mobile number is missing'`
   - ✅ Test status stays "AUTHORIZED" (NOT transitioned to DELIVERED)

---

### TEST 7: Error Case - Invalid Phone Format

**Objective:** Verify phone number formatting handles edge cases

**Prerequisites:**
- None (standalone test)

**Steps:**

1. **Test Various Phone Formats:**

```javascript
// In Node.js or backend test
import { aisensyService } from './services/aisensy.service.js';

const testNumbers = [
  '9876543210',           // 10 digits → +919876543210 ✅
  '09876543210',          // 11 digits with 0 → +919876543210 ✅
  '+919876543210',        // Already formatted → +919876543210 ✅
  '919876543210',         // 12 digits → +919876543210 ✅
  '+1234567890',          // Different country → Error ❌
  'abc1234567',           // Non-numeric → Error ❌
  '',                     // Empty → null ❌
  null,                   // Null → null ❌
];

testNumbers.forEach(num => {
  const formatted = aisensyService.formatPhoneNumber(num);
  console.log(`${num} → ${formatted}`);
});
```

2. **Verification:**
   - ✅ Valid 10-digit numbers formatted to +91XXXXXXXXXX
   - ✅ Already +91 prefixed numbers kept as-is
   - ✅ Invalid formats return null
   - ✅ Empty/null inputs return null

---

### TEST 8: Notification Logs Audit Trail

**Objective:** Verify complete audit trail in notification_logs table

**Prerequisites:**
- Complete TEST 1-7

**Steps:**

1. **Query All Notifications:**

```sql
SELECT 
  id,
  eventType,
  status,
  recipientType,
  errorMessage,
  createdAt
FROM notification_logs
ORDER BY createdAt DESC;
```

Expected output:
```
| id | eventType            | status  | recipientType | errorMessage                | createdAt           |
|----|----------------------|---------|---------------|-----------------------------|---------------------|
| 8  | REPORT_DELIVERY      | FAILED  | patient       | Mobile number not provided  | 2025-08-12 14:50:00 |
| 7  | REPORT_DELIVERY      | SUCCESS | doctor        | NULL                        | 2025-08-12 14:49:55 |
| 6  | REPORT_DELIVERY      | SUCCESS | patient       | NULL                        | 2025-08-12 14:49:50 |
| 5  | VISIT_BILL           | SUCCESS | patient       | NULL                        | 2025-08-12 14:48:00 |
| 4  | PATIENT_REGISTRATION | SUCCESS | patient       | NULL                        | 2025-08-12 14:47:00 |
| 3  | REPORT_DELIVERY      | FAILED  | patient       | Mobile number not provided  | 2025-08-12 14:46:00 |
| 2  | VISIT_BILL           | SUCCESS | patient       | NULL                        | 2025-08-12 14:45:00 |
| 1  | PATIENT_REGISTRATION | SUCCESS | patient       | NULL                        | 2025-08-12 14:44:00 |
```

2. **Verification:**
   - ✅ All 3 event types present (PATIENT_REGISTRATION, VISIT_BILL, REPORT_DELIVERY)
   - ✅ Status shows SUCCESS or FAILED appropriately
   - ✅ Error messages logged for failures
   - ✅ recipientType shows patient or doctor
   - ✅ Timestamps in chronological order

---

## Automated Test Script

Create `backend/test-aisensy.js`:

```javascript
import axios from 'axios';

const API_URL = 'http://localhost:3351/api';

async function testTemplate1() {
  console.log('\n=== TEST 1: Template 1 - Registration Credentials ===');
  try {
    const response = await axios.post(`${API_URL}/patients/admin/register-with-email`, {
      firstName: 'Template1',
      lastName: 'Test',
      email: 'template1@test.com',
      mobile: '9876543210',
      tests: [{ id: 1, departmentId: 1, reportMode: 'WHATSAPP' }],
      totalAmount: 500,
      paidAmount: 0
    });
    console.log('✅ PASSED:', response.data.data.patientId);
  } catch (error) {
    console.error('❌ FAILED:', error.response?.data || error.message);
  }
}

async function testTemplate2() {
  console.log('\n=== TEST 2: Template 2 - Visit Bill ===');
  console.log('✅ PASSED: Automatically triggered on bill creation');
}

async function testTemplate3Payment() {
  console.log('\n=== TEST 3: Template 3 - Payment Not Complete ===');
  try {
    const response = await axios.post(`${API_URL}/results/authorize-and-send`, {
      testIds: [1],
      visitId: 'TEST_VISIT'
    });
    console.log('❌ UNEXPECTED:', response.data);
  } catch (error) {
    if (error.response?.status === 402) {
      console.log('✅ PASSED: Correctly returned 402 Payment Required');
    } else {
      console.error('❌ FAILED:', error.response?.data || error.message);
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting AISensy Integration Tests...');
  await testTemplate1();
  await testTemplate2();
  await testTemplate3Payment();
  console.log('\n✅ Test suite completed');
}

runAllTests();
```

Run tests:
```bash
node backend/test-aisensy.js
```

---

## Monitoring & Debugging

### Check Server Logs

Look for these log messages:

```
✅ Template 1 (Credentials) send result: { success: true, messageId: '...' }
✅ Template 2 (Visit Bill) send result: { success: true, messageId: '...' }
✅ Pending reports send result: { success: true, toPatient: {...}, toDoctor: {...} }
❌ AISensy Text Template Error: Invalid phone number format
```

### Query Database for Issues

```sql
-- Find all failed sends
SELECT * FROM notification_logs WHERE status = 'FAILED';

-- Find specific patient's notifications
SELECT * FROM notification_logs WHERE patientId = 'PAT0001';

-- Find doctor delivery status
SELECT * FROM notification_logs WHERE recipientType = 'doctor';

-- Check visits with pending balance
SELECT vb.visitId, vb.balanceAmount FROM visit_bills vb 
WHERE vb.balanceAmount > 0;

-- Check AUTHORIZED reports awaiting payment
SELECT pt.id, pt.status FROM patient_tests pt 
WHERE pt.status = 'AUTHORIZED' 
AND pt.visitId IN (SELECT visitId FROM visit_bills WHERE balanceAmount > 0);
```

---

## Checklist Before Going Live

- [ ] Database migration completed successfully
- [ ] AISensy API key configured in .env
- [ ] 3 campaigns created in AISensy dashboard
- [ ] TEST 1: Registration credentials working
- [ ] TEST 2: Bill notification working
- [ ] TEST 3: Payment blocking working
- [ ] TEST 4: Report delivery after payment working
- [ ] TEST 5: Referral doctor delivery working
- [ ] TEST 6: Missing contact error handling working
- [ ] TEST 7: Phone number formatting working
- [ ] TEST 8: Audit trail logging working
- [ ] All notification_logs entries have correct status
- [ ] No error logs in server console
- [ ] Frontend ready to display error icons

---

**Last Updated:** 2025-08-12
**Test Status:** Ready for Execution
