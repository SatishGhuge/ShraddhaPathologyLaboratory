# Abbott Architect i1000SR Local Agent

Local agent for integrating Abbott Architect i1000SR immunoassay analyzer via ASTM/ASI protocol over TCP/IP.

## Features

- **ASTM E1381/E1394 Protocol** - Abbott Standard Interface (ASI) dialect
- **TCP/IP Communication** - Port 5300 (configurable)
- **Contention Handling** - Abbott priority in case of simultaneous ENQ
- **Offline Queue** - Local MySQL database for result caching during VPS downtime
- **Auto-Retry** - Automatic retry of failed syncs every 30 seconds
- **Barcode Parsing** - Format: `VISITID-SAMPLETYPEID` (e.g., `202608200001-2`)
- **Test Result Aggregation** - Accumulates multiple result frames per patient sample

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
TCP_PORT=5300
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=lab_agent_db
VPS_TAILSCALE_URL=http://127.0.0.1:3351
```

## Running

### Local Agent (receives from Abbott)
```bash
npm start
# or
node app.js
```

### Simulator (simulates Abbott machine)
```bash
npm run sim
# or
node simulator.js
```

## Protocol Details

### Query Frame (Machine → Agent)
```
Q|1|^BARCODE^^^||ALL|||||1|0
   ↑
   Component delimiters (^) for Abbott ASI
```

### Result Frame (Machine → Agent)
```
R|1|^^^1200^TSH|1.85|uIU/mL|0.35^4.94|N|F||||20260820120000|ARCH1234
   ↑ Nested component format for Universal Test ID
```

### Contention Handling
If Abbott and Agent both send ENQ simultaneously:
- Abbott takes **priority**
- Agent yields and responds with ACK
- Agent waits for Abbott's frames before sending

## Database Schema

Requires `pending_results` table in lab_agent_db:
```sql
CREATE TABLE pending_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sample_id VARCHAR(50),
  visit_id VARCHAR(50),
  machine_name VARCHAR(100),
  raw_astm LONGTEXT,
  data_json LONGTEXT,
  status ENUM('PENDING', 'SYNCED', 'OFFLINE_QUEUED', 'FAILED'),
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP NULL,
  last_retry_at TIMESTAMP NULL,
  error_message LONGTEXT
);
```

## Supported Tests

- **TSH** (Thyroid Stimulating Hormone)
- **FT4** (Free Thyroxine)
- **FT3** (Free Triiodothyronine)
- **PSA** (Prostate-Specific Antigen)
- **HCG** (Human Chorionic Gonadotropin)

Add more tests in `simulator.js` testParametersMap and configure in backend database.

## Logs

Detailed logging includes:
- Frame-by-frame communication
- Checksum validation
- Query/result processing
- Offline queue status
- Sync attempts and retries

## Troubleshooting

### Port Already in Use
```bash
# Change TCP_PORT in .env or kill process on port 5300
netstat -ano | findstr :5300
taskkill /PID <PID> /F
```

### Database Connection Failed
- Ensure MySQL is running
- Check DB credentials in .env
- Verify lab_agent_db database exists
- Run schema creation SQL

### VPS Unreachable
- Results are queued to local database
- Automatic retry starts when VPS comes online
- Check VPS_TAILSCALE_URL in .env

## Architecture

```
Abbott Machine (i1000SR)
        ↓ (TCP 5300, ASTM/ASI)
Local Agent (this script)
        ↓ (HTTP, JSON)
Backend VPS (Lab Management System)
```

## Development

The simulator mimics real Abbott behavior:
- Sends barcodes in combined format: `visitId-sampleTypeId`
- Waits for ORDER frame from agent
- Generates result frames with test data
- Handles ACK/NAK responses

Run both agent and simulator in separate terminals for testing.
