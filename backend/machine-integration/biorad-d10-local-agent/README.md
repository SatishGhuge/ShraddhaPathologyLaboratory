# Bio-Rad D-10 Local Integration Agent

**Hemoglobin (HbA1c) Analyzer - ASTM E1381/E1394 LIS Integration**

A production-grade Node.js TCP server that connects directly to Bio-Rad D-10 hemoglobin testing systems, parses ASTM LIS1-A/LIS2-A protocol frames, manages offline result queueing, and synchronizes HbA1c test results with the central LIMS backend.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Hardware Setup](#hardware-setup)
3. [Architecture](#architecture)
4. [Protocol Details](#protocol-details)
5. [Configuration](#configuration)
6. [Deployment](#deployment)
7. [Testing & Simulation](#testing--simulation)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
9. [Feature Parity with Sysmex](#feature-parity-with-sysmex)

---

## Quick Start

### Prerequisites

- Node.js ≥ 18.0.0
- MySQL ≥ 5.7 (for `lab_agent_db`)
- Network connectivity to LIMS backend (VPS)
- Bio-Rad D-10 analyzer or CDM workstation

### Installation

```bash
# 1. Navigate to agent directory
cd backend/machine-integration/biorad-d10-local-agent

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your MySQL and VPS settings

# 4. Initialize database
mysql -u root -p lab_agent_db < DATABASE_SCHEMA.sql

# 5. Start agent
node app.js
```

### Run on Windows

```bash
# Double-click run-agent.bat
# Or from PowerShell:
.\run-agent.bat
```

---

## Hardware Setup

### Deployment Configuration 1: Standalone D-10 (Touchscreen)

```
┌─────────────────────────┐
│   Bio-Rad D-10          │
│   (Standalone Mode)     │
│   - Touchscreen UI      │
│   - RJ-45 Ethernet Port │
└────────────┬────────────┘
             │
             │ (LAN Cable)
             │
    ┌────────▼────────┐
    │ Local Network   │
    │ Switch / Router │
    └────────┬────────┘
             │
             │ (Ethernet)
             │
┌────────────▼────────────────┐
│ Local Agent PC (Windows)    │
│ - Node.js App (Port 5200)   │
│ - MySQL Database            │
│ - IP: 192.168.X.X           │
└────────────┬────────────────┘
             │
             │ (Internet/Tailscale)
             │
┌────────────▼────────────────┐
│ Central VPS Backend         │
│ - LIMS Database             │
│ - REST API: /api/machine/   │
│ - IP: 192.168.0.119:5000    │
└─────────────────────────────┘
```

**Bio-Rad D-10 Configuration:**
1. Power on D-10
2. Navigate: **Setup → LIS Settings → TCP/IP Client Mode**
3. Set **Host IP**: Local Agent PC IP (e.g., `192.168.1.100`)
4. Set **Port**: `5200`
5. Save & Restart

### Deployment Configuration 2: Windows PC with CDM

```
┌────────────────────────┐
│ Windows PC (CDM)       │
│ - Bio-Rad CDM Software │
│ - LIS Output: TCP/IP   │
│ - Host: 192.168.1.100  │
│ - Port: 5200           │
└────────────┬───────────┘
             │
    ┌────────▼────────┐
    │ COM3 / USB      │ (or Ethernet)
    │ Connected to    │
    │ Bio-Rad D-10    │
    └────────────────┘
```

---

## Architecture

### System Components

| Component | Role | Details |
| :--- | :--- | :--- |
| **Bio-Rad D-10** | Analyzer | HbA1c test instrument, ASTM protocol sender |
| **Local Agent (app.js)** | TCP Server | Listens on port 5200, parses ASTM frames, manages offline queue |
| **Local MySQL** | Offline Queue | `lab_agent_db.pending_results` - stores results until sync |
| **Retry Worker** | Background Job | Fetches offline records every 30 seconds, retries sync |
| **VPS Backend** | Central LIMS | Receives results via `/api/machine/v1/results` endpoint |

### Data Flow

```
1. Bio-Rad D-10 sends HbA1c result (ASTM frame over TCP)
                ↓
2. Local Agent receives & parses frame (ASTM parser)
                ↓
3. Extract: A1C value, unit, reference range, abnormal flag
                ↓
4. Build JSON payload: { visitId, sampleId, results: [{testCode: "A1C", parameters: {...}}] }
                ↓
5. Save to local MySQL (status = PENDING)
                ↓
6. Immediately attempt VPS sync (POST /api/machine/v1/results)
                ↓
        ┌──────────────┐
        │  Success?    │
        └───┬─────┬────┘
        Yes │     │ No
            │     │
        ┌───▼─┐ ┌─▼──────────────┐
        │ ✅  │ │ Check VPS      │
        │SYNCED  │ Health?      │
        └───────┘ └─┬──────────┬─┘
                 Up │          │ Down
                    │      ┌───▼─────────┐
                    │      │ Mark as     │
                    │      │ OFFLINE_    │
                    │      │ QUEUED      │
                    │      └─────┬───────┘
                    │            │
                    │    ┌───────▼──────────┐
                    │    │ Retry Worker     │
                    │    │ (every 30s)      │
                    │    │ Fetches & Retries│
                    │    │ (Max 10 times)   │
                    │    └───────┬──────────┘
                    │            │
                    │        ┌───▼────┐
                    │        │ Success?
                    │        └───┬────┬────┐
                    │       Yes  │    │ No │
                    │            │    └──┬─┘
                    └────────────┼───────┤
                                 │       │
                            ✅ SYNCED  ❌ FAILED
                                       (max retries)
```

---

## Protocol Details

### ASTM E1381/E1394 LIS1-A / LIS2-A

#### Frame Structure

```
<STX>[Frame_Number][Data]<ETX or ETB><Checksum_2Char><CR><LF>
```

#### Control Characters

| Char | Hex | Name | Purpose |
| :--- | :--- | :--- | :--- |
| ENQ | 0x05 | Enquiry | Connection initiation |
| ACK | 0x06 | Acknowledge | Positive frame receipt |
| NAK | 0x15 | Negative Acknowledge | Error/checksum failure |
| STX | 0x02 | Start of Text | Frame start |
| ETX | 0x03 | End of Text | Final frame |
| ETB | 0x17 | End of Text Block | Intermediate frame (multi-frame) |
| EOT | 0x04 | End of Transmission | Session close |

#### Checksum Algorithm

✅ **Modulo-256 Additive Sum** (ASTM E1381 Standard)

```javascript
function checksum(content) {
  let sum = 0;
  for (let i = 0; i < content.length; i++) {
    sum += content.charCodeAt(i);  // Add each character's ASCII value
  }
  return (sum % 256).toString(16).padStart(2, '0').toUpperCase();
}
```

#### Session Handshake

```
1. Bio-Rad D-10 → Agent: <ENQ>
2. Agent → Bio-Rad D-10: <ACK>
3. Bio-Rad D-10 → Agent: <STX>H|...<ETX><CRC><CR><LF>  (HEADER)
4. Agent → Bio-Rad D-10: <ACK>
5. Bio-Rad D-10 → Agent: <STX>R|...<ETX><CRC><CR><LF>  (RESULT)
6. Agent → Bio-Rad D-10: <ACK>
7. Bio-Rad D-10 → Agent: <STX>L|...<ETX><CRC><CR><LF>  (TERMINATOR)
8. Agent → Bio-Rad D-10: <ACK>
9. Bio-Rad D-10: Session Close
```

### Message Record Types

#### Header Record (H)

```
H|\^&|||D10^02^3.0|||||||||20260810113000
 │ │ │ │ │
 │ │ │ │ └─ Timestamp (YYYYMMDDHHMMSS)
 │ │ │ └─── Sender (D10 = Bio-Rad D-10)
 │ │ └───── Delimiters
 │ └─────── Escape character
 └───────── Record type: H
```

#### Result Record (R)

```
R|1|^^^A1C|6.8|%|4.0-6.0|N||F|||20260810113000
 │ │       │   │ │       │ │ │ │
 │ │       │   │ │       │ │ │ └─ Timestamp
 │ │       │   │ │       │ │ └─── Status
 │ │       │   │ │       │ └───── Processing flags
 │ │       │   │ │       └─────── Abnormality flag (N=Normal, H=High, L=Low)
 │ │       │   │ └───────────── Reference range
 │ │       │   └───────────────  Unit (%)
 │ │       └───────────────────  Value (6.8)
 │ └───────────────────────────  Parameter code (^^^A1C)
 └─────────────────────────────  Record type: R
```

#### Terminator Record (L)

```
L|1|N
 │ │ │
 │ │ └─ Comment (N=Normal completion)
 │ └─── Sequence number
 └───── Record type: L
```

### Parameter Code Normalization

✅ **CRITICAL for Bio-Rad D-10 A1C Variants**

Incoming codes are normalized to a standard format:

| Incoming | Normalized | Notes |
| :--- | :--- | :--- |
| `^^^A1C` | `A1C` | Standard NGSP format |
| `A1C` | `A1C` | Uppercase |
| `A1c` | `A1C` | Uppercase normalization |
| `A1c_NGSP` | `A1C` | Map all variants to A1C |
| `A1c_IFCC` | `A1C` | Map all variants to A1C |

**Parser Logic:**
```javascript
normalizeParameterCode(rawCode) {
  const normalized = rawCode.replace(/^\^+|\^+$/g, '').toUpperCase();
  if (normalized.startsWith('A1C')) {
    return 'A1C';  // Map all A1C variants to standard
  }
  return normalized;
}
```

---

## Configuration

### Environment Variables (.env)

```bash
# TCP Server
TCP_PORT=5200

# Local MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=lab_agent_db

# Central VPS Backend
VPS_TAILSCALE_URL=http://192.168.0.119:5000
```

### Database Setup

```bash
# 1. Create database
mysql -u root -p -e "CREATE DATABASE lab_agent_db;"

# 2. Load schema
mysql -u root -p lab_agent_db < DATABASE_SCHEMA.sql

# 3. Verify
mysql -u root -p lab_agent_db -e "SHOW TABLES;"
```

---

## Deployment

### Production Checklist

- [ ] Network connectivity: Agent PC ↔ Bio-Rad D-10 (test ping)
- [ ] Network connectivity: Agent PC ↔ VPS Backend (test curl to `/api/health`)
- [ ] MySQL running and `lab_agent_db` initialized
- [ ] `.env` configured with correct DB and VPS settings
- [ ] Firewall allows port 5200 inbound (from Bio-Rad D-10)
- [ ] Firewall allows port 5000 outbound (to VPS)
- [ ] Node.js dependencies installed (`npm install`)
- [ ] Agent starts without errors (`node app.js`)
- [ ] Bio-Rad D-10 configured to connect to local agent (IP + port 5200)
- [ ] Simulator tested successfully (see Testing section)

### Starting the Agent

**Option 1: Windows Batch File**
```bash
# Double-click run-agent.bat
```

**Option 2: Command Line**
```bash
node app.js
```

**Option 3: Background Service (Recommended for Production)**
```bash
# Install PM2 (process manager)
npm install -g pm2

# Start agent with PM2
pm2 start app.js --name "biorad-d10-agent"

# Auto-restart on system reboot
pm2 startup
pm2 save
```

---

## Testing & Simulation

### Running the Simulator

The `simulator.js` mimics a Bio-Rad D-10 analyzer sending HbA1c results over ASTM protocol.

**Terminal 1: Start Local Agent**
```bash
node app.js
```

**Terminal 2: Run Simulator**
```bash
node simulator.js
```

#### Expected Output

```
[INFO] Connecting to Local Agent localhost:5200...
[SUCCESS] ✓ Connected to Local Agent
[SENDING] HEADER - Analyzer identification
[RESPONSE] Received ACK from agent
[SENDING] PATIENT - Patient demographic
[RESPONSE] Received ACK from agent
[SENDING] ORDER - Request test
[RESPONSE] Received ACK from agent
[SENDING] RESULT - A1C=6.8%
[RESPONSE] Received ACK from agent
[SENDING] TERMINATOR - End of session
[RESPONSE] Received ACK from agent
✅ SIMULATION COMPLETE
```

#### Verify Results in Database

```bash
# Check pending results
mysql -u root -p lab_agent_db -e "SELECT id, visitId, sample_id, status FROM pending_results ORDER BY id DESC;"

# View result payload
mysql -u root -p lab_agent_db -e "SELECT data_json FROM pending_results ORDER BY id DESC LIMIT 1\G"
```

---

## Monitoring & Troubleshooting

### Health Check Intervals

| Event | Frequency | Action |
| :--- | :--- | :--- |
| Status Summary | Every 5 minutes | Log counts by status (PENDING, OFFLINE_QUEUED, SYNCED, FAILED) |
| Failed Record Alert | Every 5 minutes | Alert if any FAILED records exist |
| Stuck Record Warning | Every 5 minutes | Warn if records in retry loop (>5 attempts) |
| Offline Retry | Every 30 seconds | Fetch OFFLINE_QUEUED records, attempt VPS sync |

### Log Patterns

| Pattern | Meaning |
| :--- | :--- |
| `[DB SUCCESS] Result stored` | Result saved to pending_results ✅ |
| `[CLOUD] ✓ A1C result sent` | Successfully synced to VPS ✅ |
| `[DB] Result X marked as SYNCED` | Result permanently stored in VPS ✅ |
| `[HEALTH] PENDING: 0 record(s)` | No pending records (good state) |
| `[HEALTH] ⚠️ ALERT: X permanently failed` | Manual intervention needed ❌ |
| `[VPS HEALTH] ✗ VPS unreachable` | Network down, retrying later |
| `[RETRY WORKER] Starting retry for X offline` | Background retry in progress |

### Common Issues

**Issue: "Port 5200 already in use"**
```bash
# Find process using port 5200
netstat -ano | findstr :5200

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or change TCP_PORT in .env to 5201
```

**Issue: "Database connection failed"**
```bash
# Verify MySQL is running
mysql -u root -p -e "SELECT 1;"

# Check .env credentials
cat .env | grep DB_
```

**Issue: "VPS unreachable - skipping retry"**
```bash
# Test VPS connectivity
curl -v http://192.168.0.119:5000/api/health

# Check firewall/routing
ping 192.168.0.119
```

**Issue: "Parameter not found for A1C"**
- Verify `parameterCode` in LIMS master data is set to `A1C`
- Check that test is assigned to Bio-Rad D-10 machine
- Review backend logs for parameter matching

---

## Feature Parity with Sysmex

### Shared Features ✅

| Feature | Sysmex | Bio-Rad D-10 | Status |
| :--- | :--- | :--- | :--- |
| ASTM E1381 Protocol | ✅ | ✅ | Identical |
| Modulo-256 Checksum | ✅ | ✅ | Both compliant |
| Offline Queueing | ✅ | ✅ | Same `pending_results` table |
| 30-Second Retry Loop | ✅ | ✅ | Shared worker |
| Max 10 Retries | ✅ | ✅ | Same logic |
| VPS Health Check | ✅ | ✅ | Prevents false retries |
| Graceful Shutdown | ✅ | ✅ | Flushes pending on exit |
| Health Monitoring | ✅ | ✅ | 5-min interval stats |
| Startup DB Validation | ✅ | ✅ | Both check connection |
| machineName Normalization | ✅ | ✅ | Replaces `^` with space |

### Bio-Rad D-10 Specific Features ✅

| Feature | Detail |
| :--- | :--- |
| **ETB Multi-frame Support** | Handles `0x17` (ETB) for chromatographic data frames |
| **A1C Parameter Normalization** | Strips leading carets, maps all variants to `A1C` |
| **Abnormal Flag Extraction** | Stores `flag` (N/H/L/A) and `is_abnormal` boolean |
| **Port 5200** | Bio-Rad D-10 default port (vs Sysmex 5100) |
| **Single Result Type** | Optimized for HbA1c-only testing |

### Import to Backend Controller

Bio-Rad results are submitted to the same endpoint as Sysmex:
```
POST /api/machine/v1/results
```

**Payload Format:**
```json
{
  "visitId": "202608100001",
  "sampleId": "1",
  "results": [
    {
      "testCode": "A1C",
      "parameters": {
        "A1C": "6.8",
        "A1C_UNIT": "%",
        "A1C_REFERENCE": "4.0-6.0",
        "A1C_FLAG": "N",
        "A1C_ABNORMAL": false
      }
    }
  ],
  "timestamp": "2026-08-10T11:30:00Z",
  "source": "BIORAD_D10",
  "machineName": "Bio-Rad D-10"
}
```

Backend matches parameters by `parameterCode: "A1C"` in the master database.

---

## Support & Documentation

- **Sysmex Agent**: `backend/machine-integration/sysmex-local-agent/`
- **Backend Controller**: `backend/controllers/machine.controller.js`
- **Main DB Schema**: `backend/prisma/schema.prisma`
- **LIMS API**: `POST /api/machine/v1/results`

---

## Version History

| Version | Date | Notes |
| :--- | :--- | :--- |
| 1.0.0 | 2026-08-10 | Initial release - ASTM E1381 support, offline queueing, VPS sync |

---

**Last Updated:** 2026-08-10  
**Status:** Production Ready ✅
