# WhatsApp-AISensy Integration - API Endpoints Reference

## New Endpoints Added

### 1. Authorize Report & Send via AISensy

**Endpoint:**
```
POST /api/results/authorize-and-send
```

**Description:**
Authorizes a report for delivery and automatically sends it via AISensy WhatsApp to patient and/or referral doctor (if selected) based on payment status and preferences.

**Request Body:**
```json
{
  "testIds": [1, 2, 3],
  "visitId": "20250812001"
}
```

**Parameters:**
- `testIds` (Array of Int, required): Patient test IDs to authorize
- `visitId` (String, required): Visit ID for payment verification

**Success Response (Payment Complete):**
```json
{
  "success": true,
  "message": "Report authorized and sent successfully",
  "data": {
    "visitId": "20250812001",
    "testIds": [1, 2, 3],
    "status": "DELIVERED",
    "sentTo": {
      "toPatient": {
        "success": true,
        "messageId": "aisensy_msg_12345",
        "status": "submitted"
      },
      "toDoctor": {
        "success": true,
        "results": [
          {
            "channel": "whatsapp",
            "success": true,
            "messageId": "aisensy_msg_67890"
          }
        ]
      }
    },
    "timestamp": "2025-08-12T14:45:30Z"
  }
}
```

**Error Response (Payment NOT Complete):**
```json
{
  "success": false,
  "message": "Payment not complete. Reports remain in AUTHORIZED status.",
  "warning": "Pending payment: ₹500.00",
  "data": {
    "visitId": "20250812001",
    "testIds": [1, 2, 3],
    "status": "AUTHORIZED",
    "balanceAmount": "500.00"
  }
}
```

**Status Codes:**
- `200 OK`: Report successfully authorized and sent
- `402 Payment Required`: Payment incomplete, report stays AUTHORIZED
- `404 Not Found`: Visit bill not found
- `400 Bad Request`: Missing required parameters
- `500 Internal Server Error`: Server error

**Error Response (Missing Contact):**
```json
{
  "success": true,
  "message": "Report authorized and sent successfully",
  "data": {
    "visitId": "20250812001",
    "testIds": [1, 2, 3],
    "status": "AUTHORIZED",
    "sentTo": {
      "toPatient": {
        "success": false,
        "error": "Mobile number not provided"
      },
      "toDoctor": null
    },
    "warning": "Patient contact not available for WhatsApp delivery"
  }
}
```

---

## Automatic Triggers (No API Call Needed)

### 1. Template 1 - Registration Credentials (Automatic on Patient Registration)

**Triggered By:**
- `POST /api/patients/admin/register-with-email` (existing endpoint)

**Automatic Behavior:**
- Patient is created
- PatientTest records created with reportMode
- Template 1 automatically sent based on reportMode
- Credentials go to patient (both referral doctor and non-referral doctor cases)

**No Additional API Call Needed** ✅

---

### 2. Template 2 - Visit Thank You + Bill PDF (Automatic on Bill Creation)

**Triggered By:**
- Visit bill creation during patient registration
- Any time `VisitBill` table row is created

**Automatic Behavior:**
- `createVisitBill()` helper creates the bill
- Template 2 automatically triggered after bill creation
- Sends to patient based on reportMode
- Sent once per visit

**No Additional API Call Needed** ✅

---

### 3. Template 3 - Final Report (Automatic on Payment Completion)

**Triggered By:**
- `POST /api/patients/{visitId}/payment-record` (existing endpoint)
- Any time payment is recorded AND balance becomes 0

**Automatic Behavior:**
- Payment recorded via existing endpoint
- System checks if `balanceAmount == 0`
- If YES: `checkAndSendPendingAuthorizedReports()` runs automatically
- Template 3 sent to patient and/or doctor
- Report status updated to DELIVERED

**No Additional API Call Needed** ✅

**OR Manual Trigger:**
- `POST /api/results/authorize-and-send` (new endpoint)
- Lab tech clicks "Authorize" button
- System checks payment status
- If payment complete, sends Template 3

---

## Report Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ PATIENT REGISTRATION                                            │
│ - Template 1 (Credentials) SENT                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ VISIT BILL CREATED                                              │
│ - Template 2 (Thank You + Bill) SENT                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ TESTS COMPLETED & RESULTS ENTERED                               │
│ Status: "Entered"                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ REPORT AUTHORIZED BY LAB TECH                                   │
│ Status: "AUTHORIZED" ✓                                          │
│ (Awaiting payment verification)                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    IS PAYMENT COMPLETE?
                    /                   \
                  NO                    YES
                  ↓                      ↓
        Stay in "AUTHORIZED"    Template 3 SENT
        (Log error if contact        ↓
         missing)           Status: "DELIVERED" ✓
```

---

## Frontend Integration Points

### Report Authorization Page

**Show on "Authorized" Tab:**
- List all reports with status "AUTHORIZED"
- Check `notification_logs` table for each report:
  ```sql
  SELECT * FROM notification_logs 
  WHERE visitId = ? AND eventType = 'REPORT_DELIVERY' 
  ORDER BY createdAt DESC LIMIT 1
  ```
- If FAILED: Show ⚠️ error icon
- Tooltip: Show error message from `notification_logs.errorMessage`

**Authorize Button Action:**
```javascript
POST /api/results/authorize-and-send
{
  "testIds": [selectedTestIds],
  "visitId": currentVisitId
}
```

**Handle Responses:**
- `200 OK` + `"DELIVERED"` → Move to Delivered tab
- `402 Payment Required` → Show payment pending warning
- `200 OK` + `"AUTHORIZED"` → Show "Contact not available" message
- `500 Error` → Show "Failed to send, retry later"

---

## Query Examples

### Get All Failed Notifications for a Visit
```sql
SELECT * FROM notification_logs 
WHERE visitId = '20250812001' 
  AND status = 'FAILED'
ORDER BY createdAt DESC;
```

### Get All Patient Registrations Sent Successfully
```sql
SELECT * FROM notification_logs 
WHERE eventType = 'PATIENT_REGISTRATION' 
  AND status = 'SUCCESS'
ORDER BY createdAt DESC;
```

### Get Reports Awaiting Delivery (Payment Pending)
```sql
SELECT pt.* FROM patient_tests pt
WHERE pt.status = 'AUTHORIZED'
  AND pt.visitId IN (
    SELECT visitId FROM visit_bills WHERE balanceAmount > 0
  );
```

### Check Doctor Delivery Status
```sql
SELECT * FROM notification_logs 
WHERE recipientType = 'doctor' 
  AND eventType = 'REPORT_DELIVERY'
  AND recipientId = 42
ORDER BY createdAt DESC;
```

---

## Debugging & Troubleshooting

### Check if AISensy API is Configured
```javascript
// In browser console after page load
console.log(process.env.AISENSY_API_KEY ? "✅ Configured" : "❌ Missing");
```

### View Latest Notification Logs
```
http://localhost:3351/api/notification-logs?limit=10&sort=desc
(Requires auth & endpoint creation)
```

### Test Template Sending Manually (Node.js Console)
```javascript
import { aisensyService } from './services/aisensy.service.js';

// Test Template 1 (Credentials)
const result1 = await aisensyService.sendRegistrationCredentials(
  '+919876543210',
  'John Doe',
  'PAT001',
  'tempPassword123'
);
console.log(result1);

// Test Template 2 (Bill)
const result2 = await aisensyService.sendVisitBillNotification(
  '+919876543210',
  'John Doe',
  'VIS001',
  'https://example.com/bills/VIS001.pdf'
);
console.log(result2);

// Test Template 3 (Report)
const result3 = await aisensyService.sendFinalReport(
  '+919876543210',
  'John Doe',
  'VIS001',
  'https://example.com/reports/VIS001.pdf',
  'patient'
);
console.log(result3);
```

---

## Environment Variables Reference

```env
# AISensy Integration
AISENSY_API_KEY=<your_api_key>
AISENSY_WELCOME_CAMPAIGN=patient_welcome_credentials
AISENSY_VISIT_BILL_CAMPAIGN=visit_bill_dispatch
AISENSY_REPORT_CAMPAIGN=lab_report_dispatch

# Existing (Keep as-is)
DATABASE_URL=mysql://root:root@localhost/shraddha_db
PORT=3351
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "AISensy API Key not configured" | Missing `AISENSY_API_KEY` in .env | Add API key to .env and restart server |
| Phone number invalid format | Number not in +91 or 10-digit format | Format to +91XXXXXXXXXX before sending |
| "Payment not complete" error | `balanceAmount > 0` | Record full payment first, then authorize |
| Message not sent but no error | Invalid phone/email for reportMode | Check patient contact details, verify reportMode |
| Notification not logged | `notification_logs` table not created | Run Prisma migration: `npx prisma migrate dev` |
| Doctor didn't receive message | Doctor flags false or contact missing | Check `Doctor.sendReportsViaMail/WhatsApp` and contact fields |

---

**Last Updated:** 2025-08-12
**Version:** 1.0
