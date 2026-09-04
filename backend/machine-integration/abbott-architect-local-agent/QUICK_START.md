# Abbott Architect i1000SR - Quick Start Guide

## 5 Minute Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure .env
```bash
# Copy example
cp .env.example .env

# Edit with your values
# Key settings:
# - TCP_PORT: 5300 (leave as is)
# - DB_HOST: localhost or your MySQL server IP
# - VPS_TAILSCALE_URL: your backend server URL
```

### 3. Create Database Table
```bash
mysql -u root -p lab_agent_db < schema.sql
```
(If schema.sql doesn't exist, run the CREATE TABLE command from DEPLOYMENT_GUIDE.txt)

### 4. Start Agent
```bash
npm start
```

Expected output:
```
[TCP] ✓ Listening on port 5300 for Abbott Architect
[AGENT] ✓ Ready to accept connections
```

### 5. Test with Simulator (in another terminal)
```bash
npm run sim
```

## What Happens

1. **Simulator** connects to agent on port 5300
2. **Simulator** sends barcode query: `Q|1|^202608200001-2^^^||ALL|||||1|0`
3. **Agent** receives query, asks backend for tests
4. **Agent** sends ORDER frame back to simulator
5. **Simulator** sends RESULT frames with test values
6. **Agent** saves results to database and VPS
7. Check database: `SELECT * FROM pending_results;`

## Common Commands

```bash
# Start agent
npm start

# Run simulator (separate terminal)
npm run sim

# View logs (in new terminal)
tail -f C:\path\to\logs\abbott-agent.log

# Check database results
mysql -u root -p -e "SELECT * FROM pending_results LIMIT 10;" lab_agent_db

# Kill process on port 5300
netstat -ano | findstr :5300
taskkill /PID <PID> /F
```

## Configuration Reference

| Setting | Default | Description |
|---------|---------|-------------|
| TCP_PORT | 5300 | Port Abbott connects to |
| DB_HOST | localhost | MySQL server address |
| DB_USER | root | MySQL username |
| DB_PASSWORD | root | MySQL password |
| DB_NAME | lab_agent_db | Database name |
| VPS_TAILSCALE_URL | http://127.0.0.1:3351 | Backend server URL |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Port 5300 already in use" | Change TCP_PORT in .env or kill process on that port |
| "Connection refused" to MySQL | Check MySQL is running, verify DB_HOST and credentials |
| "VPS unreachable" | Results will be cached locally, auto-retried when VPS comes online |
| Simulator won't connect | Ensure agent is running, check firewall allows port 5300 |

## Test Data

Simulator sends these tests:
- **TSH** (Thyroid Stimulating Hormone) - 2.5 uIU/mL
- **FT4** (Free Thyroxine) - 1.2 ng/dL  
- **FT3** (Free Triiodothyronine) - 3.5 pg/mL
- **PSA** (Prostate-Specific Antigen) - 1.5 ng/mL
- **HCG** (Human Chorionic Gonadotropin) - <1 mIU/mL

Barcode: `202608200001-2`
- visitId: `202608200001`
- sampleTypeId: `2`

## Next Steps

1. Configure actual Abbott machine to connect to agent
2. Add more test parameters in `simulator.js` testParametersMap
3. Configure tests in backend database
4. Set up production deployment (see DEPLOYMENT_GUIDE.txt)
5. Monitor logs and database for issues

## Support

- Check logs: `npm start` (shows all output)
- Debug frames: Look for `[TCP FRAME]` and `[ASTM PARSER]` messages
- Database issues: Verify table structure matches schema
- VPS sync: Check that `/api/machine/v1/results` endpoint is responding

## ASTM Protocol Quick Reference

**Query Frame Format:**
```
Q|1|^BARCODE^^^||ALL|||||1|0
```

**Result Frame Format:**
```
R|1|^^^AssayNum^TestCode|value|unit|refRange|flag|F||||timestamp|machineID
```

**Control Flow:**
```
Machine → ENQ → Agent
Agent → ACK → Machine
Machine → HEADER Frame → Agent (identifies itself)
Agent → ACK → Machine
Machine → QUERY Frame → Agent (barcode scan)
Agent → ACK + ORDER Frame → Machine
Machine → RESULT Frames → Agent (test results)
Agent → ACK → Machine (for each result)
Machine → TERMINATOR Frame → Agent (done)
Agent → ACK → Machine
Agent → HTTP POST → Backend (save results)
```
