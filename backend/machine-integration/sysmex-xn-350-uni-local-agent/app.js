const net = require('net');
const mysql = require('mysql2/promise');
const axios = require('axios');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  tcp: {
    port: parseInt(process.env.TCP_PORT || '5100'),
    host: '0.0.0.0'
  },
  vps: {
    baseUrl: process.env.VPS_TAILSCALE_URL || 'http://localhost:3351'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'lab_agent_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  retry: {
    intervalMs: 30000,
    batchSize: 50,
    maxRetries: 10
  }
};

// ASTM Protocol Constants
const ASTM = {
  ENQ: 0x05,
  ACK: 0x06,
  NAK: 0x15,
  STX: 0x02,
  ETX: 0x03,
  EOT: 0x04,
  CR: 0x0D,
  LF: 0x0A
};

// ============================================================================
// DATABASE POOL
// ============================================================================

const dbPool = mysql.createPool(CONFIG.database);

// ============================================================================
// ASTM FRAME PARSER (Unidirectional Mode - Receive Only)
// ============================================================================

const ASTMParser = {
  /**
   * Extract clean record content from raw ASTM frame
   * Handles: STX + frameSeq + record + CR + ETX + checksum + CR + LF
   * Returns: Clean record string (e.g., "H|\\^&|||XN-350...")
   */
  extractRecordFromFrame(rawFrame) {
    try {
      // Find STX (0x02)
      const stxIndex = rawFrame.indexOf(String.fromCharCode(ASTM.STX));
      if (stxIndex === -1) return null;

      // Skip STX and frame sequence digit (0-7)
      let contentStart = stxIndex + 1;
      if (rawFrame.length > contentStart && /^[0-7]$/.test(rawFrame[contentStart])) {
        contentStart++; // Skip frame number
      }

      // Find CR before ETX
      const crIndex = rawFrame.indexOf(String.fromCharCode(ASTM.CR), contentStart);
      if (crIndex === -1) return null;

      // Extract record content between frameSeq and CR
      const record = rawFrame.substring(contentStart, crIndex);
      
      return record.trim();
    } catch (err) {
      console.error(`[PARSER ERROR] Failed to extract record: ${err.message}`);
      return null;
    }
  },

  /**
   * Parse ASTM record into structured data
   * Handles: H, P, O, R, L record types
   */
  parseRecord(record) {
    if (!record || typeof record !== 'string') {
      return null;
    }

    const fields = record.split('|');
    const recordType = fields[0];

    const parsed = {
      type: recordType,
      raw: record,
      fields: fields,
      data: {}
    };

    // ✅ DEBUG: Log all fields for inspection
    console.log(`[PARSER DEBUG] Record type: ${recordType}, Total fields: ${fields.length}`);
    console.log(`[PARSER DEBUG] Field array:`, JSON.stringify(fields));

    try {
      switch (recordType) {
        case 'H':
          // Header: H|\^&|||MachineName^Serial^Version||||Protocol
          parsed.data.delimiter = fields[1] || '\\^&';
          parsed.data.analyzer = this.extractAnalyzerName(fields[4] || '');
          parsed.data.protocol = fields[12] || '';
          console.log(`[H FRAME] Analyzer: ${parsed.data.analyzer}, Protocol: ${parsed.data.protocol}`);
          break;

        case 'P':
          // Patient: Sysmex sends barcode in field[4], name in field[5]
          // P|1||||||barcode|^PatientName|...
          parsed.data.sequence = fields[1] || '';
          parsed.data.patientId = this.cleanField(fields[2] || 'UNKNOWN');
          parsed.data.patientName = this.cleanField(fields[5] || '');
          parsed.data.barcode = this.extractBarcode(fields[4] || '');
          console.log(`[P DEBUG] Field[4]="${fields[4]}", Field[5]="${fields[5]}"`);
          console.log(`[P FRAME] Patient ID: ${parsed.data.patientId}, Name: ${parsed.data.patientName}, Barcode: ${parsed.data.barcode}`);
          break;

        case 'O':
          // Order: Sysmex sends barcode in field[3], test codes in field[4]
          // O|1||barcode||testCodes|...
          parsed.data.sequence = fields[1] || '';
          parsed.data.specimenId = this.cleanField(fields[2] || '');
          parsed.data.barcode = this.extractBarcode(fields[3] || '');
          parsed.data.testCode = this.cleanField(fields[4] || '');
          console.log(`[O DEBUG] Field[3]="${fields[3]}", Field[4]="${fields[4]}"`);
          console.log(`[O DEBUG] Total fields: ${fields.length}, All: ${JSON.stringify(fields)}`);
          console.log(`[O FRAME] Barcode: ${parsed.data.barcode}, Test: ${parsed.data.testCode}`);
          break;

        case 'R':
          // Result: R|seq|^^^ParamCode|Value|Units|RefRange|Flag|...
          parsed.data.sequence = fields[1] || '';
          parsed.data.testId = this.cleanField(fields[2] || '');
          parsed.data.paramCode = this.extractParamCode(fields[2] || '');
          
          // ✅ FIX: Parse numeric values correctly, fallback to string
          const rawValue = this.cleanField(fields[3] || '');
          const parsedNum = parseFloat(rawValue);
          parsed.data.value = !isNaN(parsedNum) ? parsedNum : rawValue;
          
          parsed.data.units = this.cleanField(fields[4] || '');
          parsed.data.referenceRange = this.cleanField(fields[5] || '');
          parsed.data.abnormalFlag = this.cleanField(fields[6] || '');
          console.log(`[R FRAME] ${parsed.data.paramCode} = ${parsed.data.value} ${parsed.data.units} [${parsed.data.abnormalFlag}]`);
          break;

        case 'L':
          // Terminator: L|1|N
          parsed.data.sequence = fields[1] || '';
          parsed.data.terminationCode = fields[2] || '';
          console.log(`[L FRAME] Terminator received, code: ${parsed.data.terminationCode}`);
          break;

        case 'C':
          // Comment Record: C|seq|comment
          parsed.data.sequence = fields[1] || '';
          parsed.data.comment = this.cleanField(fields[2] || '');
          console.log(`[C FRAME] Comment: ${parsed.data.comment}`);
          break;

        default:
          console.warn(`[PARSER] Unknown record type: ${recordType}`);
      }
    } catch (err) {
      console.error(`[PARSER ERROR] Failed to parse ${recordType} record: ${err.message}`);
    }

    return parsed;
  },

  /**
   * Extract analyzer name from Sysmex format
   * Example: "    XN-350^00-24^15567^^^^AW618382" -> "XN-350"
   */
  extractAnalyzerName(field) {
    if (!field) return 'UNKNOWN';
    const cleaned = field.trim();
    const parts = cleaned.split('^');
    return parts[0].trim() || 'UNKNOWN';
  },

  /**
   * Extract barcode from Sysmex format
   * Example: "^^        202608310002-1^M" -> "202608310002-1"
   */
  extractBarcode(field) {
    if (!field) return '';
    return field
      .replace(/^\^\^/, '')      // Remove leading ^^
      .replace(/\^M$/, '')       // Remove trailing ^M
      .replace(/\^/g, '')        // Remove remaining ^ chars
      .trim();
  },

  /**
   * Extract parameter code from Universal Test ID
   * Example: "^^^WBC" -> "WBC", "WBC" -> "WBC"
   */
  extractParamCode(field) {
    if (!field) return '';
    const cleaned = field.replace(/^\^+/, '').trim();
    return cleaned || '';
  },

  /**
   * Clean field by removing ASTM markers and extra whitespace
   */
  cleanField(field) {
    if (!field) return '';
    return field
      .replace(/^\^+/, '')
      .replace(/\^+$/, '')
      .trim();
  },

  /**
   * Parse barcode into visitId and sampleTypeId
   * Format: "202608310002-1" -> {visitId: "202608310002", sampleTypeId: "1"}
   */
  parseBarcodeComponents(barcode) {
    if (!barcode || !barcode.includes('-')) {
      return { visitId: barcode, sampleTypeId: null };
    }

    const parts = barcode.split('-');
    return {
      visitId: parts[0].trim(),
      sampleTypeId: parts[1].trim()
    };
  }
};

// ============================================================================
// SESSION STATE MANAGEMENT
// ============================================================================

class TransmissionSession {
  constructor(socketId) {
    this.socketId = socketId;
    this.createdAt = new Date();
    this.machineName = null;
    this.patientId = null;
    this.patientName = null;
    this.barcode = null;
    this.visitId = null;
    this.sampleTypeId = null;
    this.testCode = null;
    this.results = [];
    this.frameCount = 0;
  }

  updateFromHeader(data) {
    this.machineName = data.analyzer;
  }

  updateFromPatient(data) {
    this.patientId = data.patientId;
    this.patientName = data.patientName;
    
    // ✅ CRITICAL: Extract barcode from P frame (field[4])
    if (data.barcode) {
      this.barcode = data.barcode;
      const { visitId, sampleTypeId } = ASTMParser.parseBarcodeComponents(data.barcode);
      this.visitId = visitId;
      this.sampleTypeId = sampleTypeId || '1';
      console.log(`[SESSION] Updated from P frame: visitId=${this.visitId}, sampleTypeId=${this.sampleTypeId}, barcode=${this.barcode}`);
    }
  }

  updateFromOrder(data) {
    this.barcode = data.barcode;
    this.testCode = data.testCode;

    // Parse barcode components
    const { visitId, sampleTypeId } = ASTMParser.parseBarcodeComponents(data.barcode);
    this.visitId = visitId;
    // ✅ FIX: Default to '1' if barcode lacks hyphenated sampleTypeId (prevents data loss)
    this.sampleTypeId = sampleTypeId || '1';
  }

  addResult(data) {
    if (data.paramCode && data.value) {
      this.results.push({
        paramCode: data.paramCode,
        value: data.value,
        units: data.units,
        referenceRange: data.referenceRange,
        abnormalFlag: data.abnormalFlag
      });
    }
  }

  isComplete() {
    // ✅ FIX: Remove sampleTypeId check (defaults to '1' above, always truthy)
    return Boolean(this.visitId && this.results.length > 0);
  }

  getPayload() {
    // Build results array grouped by test
    const testMap = {};
    
    for (const result of this.results) {
      const testCode = this.testCode || 'CBC'; // Default to CBC if not specified
      
      if (!testMap[testCode]) {
        testMap[testCode] = {
          testCode: testCode,
          parameters: {}
        };
      }
      
      // ✅ CRITICAL: Clean parameter code
      // Remove ^1, ^2, etc. and _RESEARCH suffix
      // Example: "WBC^1" → "WBC", "RDW-SD_RESEARCH^1" → "RDW-SD"
      let cleanParamCode = result.paramCode
        .replace(/\^[\d]+$/g, '')  // Remove ^1, ^2, etc. from end
        .replace(/_RESEARCH$/i, ''); // Remove _RESEARCH suffix
      
      testMap[testCode].parameters[cleanParamCode] = result.value;
    }

    const resultsArray = Object.values(testMap);

    return {
      visitId: this.visitId,
      sampleId: this.sampleTypeId,
      machineName: this.machineName || 'XN-350',
      results: resultsArray,
      timestamp: new Date().toISOString(),
      source: 'MACHINE',
      patientId: this.patientId,
      barcode: this.barcode
    };
  }

  getSummary() {
    return {
      socketId: this.socketId,
      machine: this.machineName,
      visitId: this.visitId,
      sampleId: this.sampleTypeId,
      barcode: this.barcode,
      resultCount: this.results.length,
      frameCount: this.frameCount,
      duration: Date.now() - this.createdAt.getTime()
    };
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const Database = {
  async saveResult(visitId, sampleId, machineName, rawData, payload) {
    try {
      if (!visitId || !sampleId || !payload || !payload.results) {
        throw new Error('Missing required result data');
      }

      console.log(`[DB] Saving result: visitId=${visitId}, sampleId=${sampleId}, machine=${machineName}, parameters=${payload.results.length}`);

      const query = `
        INSERT INTO pending_results 
        (sample_id, visit_id, machine_name, raw_astm, data_json, status, retry_count)
        VALUES (?, ?, ?, ?, ?, 'PENDING', 0)
      `;

      const [result] = await dbPool.execute(query, [
        sampleId,
        visitId,
        machineName,
        JSON.stringify(rawData),
        JSON.stringify(payload)
      ]);

      console.log(`[DB] ✓ Result stored: id=${result.insertId}`);
      return result.insertId;
    } catch (err) {
      console.error(`[DB ERROR] Failed to save result: ${err.message}`);
      throw err;
    }
  },

  async markSynced(recordId) {
    try {
      const [result] = await dbPool.execute(
        `UPDATE pending_results 
         SET status = 'SYNCED', synced_at = NOW(), retry_count = 0, error_message = NULL
         WHERE id = ?`,
        [recordId]
      );
      console.log(`[DB] ✓ Result ${recordId} marked as SYNCED`);
      return result.affectedRows > 0;
    } catch (err) {
      console.error(`[DB ERROR] Failed to mark synced: ${err.message}`);
      return false;
    }
  },

  async markOfflineQueued(recordId, errorMessage = null) {
    try {
      const [result] = await dbPool.execute(
        `UPDATE pending_results 
         SET status = 'OFFLINE_QUEUED', 
             retry_count = retry_count + 1,
             last_retry_at = NOW(),
             error_message = ?
         WHERE id = ?`,
        [errorMessage, recordId]
      );
      console.log(`[DB] Result ${recordId} marked as OFFLINE_QUEUED, error: ${errorMessage}`);
      return result.affectedRows > 0;
    } catch (err) {
      console.error(`[DB ERROR] Failed to mark offline queued: ${err.message}`);
      return false;
    }
  },

  async markFailed(recordId, errorMessage) {
    try {
      const [result] = await dbPool.execute(
        `UPDATE pending_results 
         SET status = 'FAILED', error_message = ?
         WHERE id = ?`,
        [errorMessage, recordId]
      );
      console.error(`[DB] Result ${recordId} marked as FAILED: ${errorMessage}`);
      return result.affectedRows > 0;
    } catch (err) {
      console.error(`[DB ERROR] Failed to mark failed: ${err.message}`);
      return false;
    }
  },

  async getPendingOffline() {
    try {
      const [rows] = await dbPool.execute(
        `SELECT id, data_json, retry_count, sample_id, visit_id, machine_name
         FROM pending_results 
         WHERE status = 'OFFLINE_QUEUED' 
         AND retry_count < ?
         ORDER BY retry_count ASC, id ASC
         LIMIT ?`,
        [CONFIG.retry.maxRetries, CONFIG.retry.batchSize]
      );
      return rows;
    } catch (err) {
      console.error(`[DB ERROR] Failed to get pending offline records: ${err.message}`);
      return [];
    }
  }
};

// ============================================================================
// CLOUD API
// ============================================================================

const CloudAPI = {
  async sendResult(payload) {
    try {
      if (!payload.visitId || !payload.sampleId) {
        throw new Error('Missing visitId or sampleId in payload');
      }

      if (!payload.results || !Array.isArray(payload.results) || payload.results.length === 0) {
        throw new Error('Missing or empty results array in payload');
      }

      const url = `${CONFIG.vps.baseUrl}/api/machine/v1/results`;
      
      console.log(`[CLOUD] Posting results to: ${url}`);
      console.log(`[CLOUD] Payload:`, JSON.stringify(payload, null, 2));
      
      const response = await axios.post(url, payload, { timeout: 5000 });
      
      if (!response.data || !response.data.success) {
        throw new Error('Backend did not confirm success');
      }
      
      console.log(`[CLOUD] ✓ Result sent for ${payload.visitId}/${payload.sampleId}: ${payload.results.length} test(s)`);
      return response.data;
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error(`[CLOUD ERROR] Connection refused: VPS unreachable`);
      } else if (err.response?.status === 400) {
        console.error(`[CLOUD ERROR] Bad request: ${err.response.data?.message || err.message}`);
      } else if (err.response?.status === 500) {
        console.error(`[CLOUD ERROR] Server error: ${err.response.data?.message || 'Internal error'}`);
      } else {
        console.error(`[CLOUD ERROR] ${err.message}`);
      }
      throw err;
    }
  },

  async checkVpsHealth() {
    try {
      const url = `${CONFIG.vps.baseUrl}/api/health`;
      const response = await axios.get(url, { timeout: 3000 });
      return response.status === 200;
    } catch (err) {
      return false;
    }
  }
};

// ============================================================================
// RESULT SYNC
// ============================================================================

const ResultSync = {
  async sync(recordId, payload) {
    try {
      const isVpsReachable = await CloudAPI.checkVpsHealth();
      
      if (!isVpsReachable) {
        console.warn(`[SYNC] VPS not reachable - queueing for retry`);
        await Database.markOfflineQueued(recordId, 'VPS unreachable');
        return;
      }

      await CloudAPI.sendResult(payload);
      await Database.markSynced(recordId);
    } catch (err) {
      await Database.markOfflineQueued(recordId, err.message);
    }
  },

  async retryOfflineRecords() {
    const isVpsReachable = await CloudAPI.checkVpsHealth();
    
    if (!isVpsReachable) {
      console.warn(`[RETRY WORKER] VPS unreachable - skipping retry cycle`);
      return;
    }

    const records = await Database.getPendingOffline();
    
    if (records.length === 0) {
      return;
    }

    console.log(`[RETRY WORKER] Starting retry for ${records.length} offline record(s)`);

    for (const record of records) {
      try {
        const payload = typeof record.data_json === 'string' 
          ? JSON.parse(record.data_json) 
          : record.data_json;

        if (!payload.visitId || !payload.sampleId) {
          console.error(`[RETRY ERROR] Record ${record.id}: Missing visitId or sampleId`);
          await Database.markFailed(record.id, 'Payload missing visitId or sampleId');
          continue;
        }

        console.log(`[RETRY] Attempting sync for record ${record.id} (attempt=${record.retry_count + 1}/${CONFIG.retry.maxRetries})`);
        
        await this.sync(record.id, payload);
        
      } catch (err) {
        console.error(`[RETRY ERROR] Record ${record.id}: ${err.message}`);
        
        if (record.retry_count >= CONFIG.retry.maxRetries - 1) {
          await Database.markFailed(record.id, `Max retries exceeded: ${err.message}`);
          console.error(`[ALERT] Record ${record.id} permanently failed`);
        } else {
          await Database.markOfflineQueued(record.id, err.message);
        }
      }
    }

    console.log(`[RETRY WORKER] Retry batch completed`);
  }
};

// ============================================================================
// RESULT PROCESSOR
// ============================================================================

const ResultProcessor = {
  /**
   * Query the backend API to get the correct testCode and test information
   * This solves the problem of machine sending malformed test codes
   */
  async queryTestCode(visitId, sampleTypeId, machineName) {
    try {
      const url = `${CONFIG.vps.baseUrl}/api/machine/v1/query`;
      const analyzer = machineName || 'XN-350'; // Default to XN-350 if not specified
      
      const queryParams = new URLSearchParams({
        visitId: visitId,
        sampleId: sampleTypeId,
        analyzer: analyzer
      });

      console.log(`[PROCESSOR] Querying testCode from API: ${url}?${queryParams}`);

      const response = await axios.get(`${url}?${queryParams}`, { timeout: 5000 });

      if (!response.data || !response.data.success) {
        console.warn(`[PROCESSOR] API query failed: ${response.data?.message || 'Unknown error'}`);
        return null;
      }

      const { data } = response.data;

      if (!data.patientTests || data.patientTests.length === 0) {
        console.warn(`[PROCESSOR] No tests found for visitId=${visitId}, sampleTypeId=${sampleTypeId}`);
        return null;
      }

      // Extract test codes from the response
      const testCodes = data.patientTests.map(t => t.testCode);
      console.log(`[PROCESSOR] ✓ Query successful: Found ${testCodes.length} test(s) - ${testCodes.join(', ')}`);

      // Return the first test code (or could combine multiple if needed)
      return testCodes[0] || null;

    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error(`[PROCESSOR ERROR] API unreachable: ${err.message}`);
      } else {
        console.error(`[PROCESSOR ERROR] Failed to query testCode: ${err.message}`);
      }
      return null;
    }
  },

  async processSession(session) {
    try {
      if (!session.isComplete()) {
        console.warn(`[PROCESSOR] Session incomplete: visitId=${session.visitId}, results=${session.results.length}`);
        return;
      }

      const summary = session.getSummary();
      console.log(`[PROCESSOR] Processing session:`, JSON.stringify(summary, null, 2));

      // ✅ CRITICAL: Query API to get correct testCode instead of using malformed machine data
      const correctTestCode = await this.queryTestCode(
        session.visitId,
        session.sampleTypeId,
        session.machineName
      );

      if (correctTestCode) {
        console.log(`[PROCESSOR] ✓ Using correct testCode from API: ${correctTestCode}`);
        session.testCode = correctTestCode; // Override with API-provided test code
      } else {
        console.warn(`[PROCESSOR] ⚠️ Could not fetch testCode from API, using default: CBC`);
        session.testCode = 'CBC'; // Fallback to CBC
      }

      const payload = session.getPayload();
      console.log(`[PROCESSOR] Payload generated:`, JSON.stringify(payload, null, 2));

      // Save to database
      const recordId = await Database.saveResult(
        session.visitId,
        session.sampleTypeId,
        session.machineName,
        session,
        payload
      );

      // Sync to cloud
      await ResultSync.sync(recordId, payload);

      console.log(`[PROCESSOR] ✓ Session processed successfully: recordId=${recordId}`);
    } catch (err) {
      console.error(`[PROCESSOR ERROR] Failed to process session: ${err.message}`);
      console.error(err.stack);
    }
  }
};

// ============================================================================
// TCP SERVER (Unidirectional Mode)
// ============================================================================

function createTcpServer() {
  return net.createServer(socket => {
    const socketId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[TCP] ✓ Connection opened: ${socketId}`);

    let buffer = '';
    let session = new TransmissionSession(socketId);
    let transmissionActive = false;

    socket.on('data', async chunk => {
      try {
        // ✅ CRITICAL FIX: Detect ENQ byte anywhere inside incoming chunk
        // This handles new transmission initiation when ENQ arrives with other data
        if (chunk.includes(Buffer.from([ASTM.ENQ]))) {
          console.log(`[TCP] Received ENQ from ${socketId} - Starting new transmission`);
          socket.write(Buffer.from([ASTM.ACK]));
          buffer = '';
          session = new TransmissionSession(socketId);
          transmissionActive = true;
        }

        // Accumulate data into buffer
        buffer += chunk.toString('utf8');
        console.log(`[TCP] Received ${chunk.length} bytes, buffer size: ${buffer.length}`);

        // Process complete frames (terminated by CR+LF)
        while (buffer.includes('\r\n')) {
          const crlfIndex = buffer.indexOf('\r\n');
          const rawFrame = buffer.substring(0, crlfIndex);
          buffer = buffer.substring(crlfIndex + 2);

          // Send ACK for received frame
          socket.write(Buffer.from([ASTM.ACK]));

          // Extract and parse record
          const record = ASTMParser.extractRecordFromFrame(rawFrame);
          if (!record) {
            console.warn(`[TCP] Failed to extract record from frame`);
            continue;
          }

          const parsed = ASTMParser.parseRecord(record);
          if (!parsed) {
            console.warn(`[TCP] Failed to parse record`);
            continue;
          }

          session.frameCount++;

          // Update session based on record type
          switch (parsed.type) {
            case 'H':
              session.updateFromHeader(parsed.data);
              break;
            case 'P':
              session.updateFromPatient(parsed.data);
              break;
            case 'O':
              session.updateFromOrder(parsed.data);
              break;
            case 'R':
              session.addResult(parsed.data);
              break;
            case 'L':
              console.log(`[TCP] Terminator received - ${session.results.length} results collected`);
              break;
          }
        }

        // ✅ CRITICAL FIX: Detect EOT byte anywhere inside incoming chunk
        // Machine frequently sends final L frame + EOT in same TCP packet
        // Old check (chunk.length === 1) would fail on combined buffers → data loss
        // New check uses buffer.includes() which is safe and production-ready
        if (chunk.includes(Buffer.from([ASTM.EOT]))) {
          console.log(`[TCP] Received EOT from ${socketId} - Processing complete session`);
          transmissionActive = false;
          await ResultProcessor.processSession(session);
        }
      } catch (err) {
        console.error(`[TCP ERROR] ${socketId}: ${err.message}`);
        console.error(err.stack);
      }
    });

    socket.on('end', () => {
      console.log(`[TCP] Connection closed: ${socketId}`);
    });

    socket.on('error', err => {
      console.error(`[TCP ERROR] ${socketId}: ${err.message}`);
    });
  });
}

// ============================================================================
// STARTUP
// ============================================================================

let tcpServer = null;

async function startup() {
  console.log('\n' + '='.repeat(80));
  console.log('SYSMEX LOCAL AGENT - UNIDIRECTIONAL MODE');
  console.log('='.repeat(80));
  console.log(`TCP Server:       ${CONFIG.tcp.host}:${CONFIG.tcp.port}`);
  console.log(`Database:         ${CONFIG.database.host}:${CONFIG.database.port}/${CONFIG.database.database}`);
  console.log(`VPS Backend:      ${CONFIG.vps.baseUrl}`);
  console.log(`Mode:             UNIDIRECTIONAL (Receive Only)`);
  console.log('='.repeat(80) + '\n');

  // Test database connection
  try {
    const connection = await dbPool.getConnection();
    console.log(`[DB] ✓ Database connection successful`);
    connection.release();
  } catch (err) {
    console.error(`[DB] ✗ Database connection failed: ${err.message}`);
    process.exit(1);
  }

  // Start TCP server
  tcpServer = createTcpServer();
  tcpServer.listen(CONFIG.tcp.port, CONFIG.tcp.host, () => {
    console.log(`[TCP] ✓ Listening on port ${CONFIG.tcp.port} (Unidirectional Mode)`);
  });

  tcpServer.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[TCP] ✗ Port ${CONFIG.tcp.port} already in use`);
    } else {
      console.error(`[TCP] ✗ Error: ${err.message}`);
    }
    process.exit(1);
  });

  // Start retry worker
  const retryWorker = setInterval(() => ResultSync.retryOfflineRecords(), CONFIG.retry.intervalMs);
  console.log(`[WORKER] ✓ Retry job scheduled every ${CONFIG.retry.intervalMs}ms\n`);

  // Graceful shutdown
  process.on('SIGTERM', () => shutdown(retryWorker));
  process.on('SIGINT', () => shutdown(retryWorker));

  console.log('[AGENT] ✓ Ready to receive transmissions from Sysmex XN-350\n');
}

async function shutdown(retryWorker) {
  console.log('\n[SHUTDOWN] Graceful shutdown initiated...');

  clearInterval(retryWorker);
  
  if (tcpServer) {
    tcpServer.close(() => {
      console.log('[SHUTDOWN] ✓ TCP server closed');
    });
  }

  try {
    await ResultSync.retryOfflineRecords();
    console.log('[SHUTDOWN] ✓ Pending records processed');
  } catch (err) {
    console.warn(`[SHUTDOWN] Could not sync pending records: ${err.message}`);
  }

  await dbPool.end();
  console.log('[SHUTDOWN] ✓ Database connections closed');
  console.log('[SHUTDOWN] ✓ Shutdown complete\n');
  process.exit(0);
}

startup().catch(err => {
  console.error('[FATAL] Startup failed:', err.message);
  process.exit(1);
});
