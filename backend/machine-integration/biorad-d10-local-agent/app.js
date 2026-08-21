const { SerialPort } = require('serialport');
const mysql = require('mysql2/promise');
const axios = require('axios');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  serial: {
    port: process.env.SERIAL_PORT || 'COM3',  // ✅ RS-232 serial port (e.g., COM3, /dev/ttyUSB0)
    baudRate: parseInt(process.env.BAUD_RATE || '9600'),  // ✅ Standard Bio-Rad D-10 baud rate
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: false,
    autoOpen: false  // ✅ Manual open with proper error handling
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
    timeoutMs: 5000
  }
};

// ASTM Protocol Constants (includes ETB for Bio-Rad multi-frame support)
const ASTM = {
  ENQ: 0x05,
  ACK: 0x06,
  NAK: 0x15,
  STX: 0x02,
  ETX: 0x03,
  ETB: 0x17,     // ✅ End of Text Block (for multi-frame data)
  EOT: 0x04,     // ✅ End of Transmission
  CR: 0x0D,
  LF: 0x0A
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse sample ID in format: VISITID-SAMPLETYPEID
 * Example: "202608190001-3" -> { visitId: "202608190001", sampleTypeId: "3" }
 * 
 * @param {string} fullSampleId - Full sample ID from barcode
 * @returns {object} { visitId, sampleTypeId } or null if format is invalid
 */
function parseSampleId(fullSampleId) {
  if (!fullSampleId || typeof fullSampleId !== 'string') {
    console.warn(`[PARSE SAMPLE ID] Invalid input: ${fullSampleId}`);
    return null;
  }

  // Check if format contains hyphen separator
  if (fullSampleId.includes('-')) {
    const parts = fullSampleId.split('-');
    if (parts.length === 2) {
      const visitId = parts[0].trim();
      const sampleTypeId = parts[1].trim();

      if (visitId && sampleTypeId) {
        console.log(`[PARSE SAMPLE ID] ✓ Parsed "${fullSampleId}" -> visitId="${visitId}", sampleTypeId="${sampleTypeId}"`);
        return {
          visitId: visitId,
          sampleTypeId: sampleTypeId,
          fullSampleId: fullSampleId
        };
      }
    }
  }

  // Fallback: treat entire ID as visitId with no sampleTypeId
  console.warn(`[PARSE SAMPLE ID] ⚠️ Could not parse format with hyphen, treating as visitId: ${fullSampleId}`);
  return {
    visitId: fullSampleId,
    sampleTypeId: null,
    fullSampleId: fullSampleId
  };
}

// Validate configuration
if (!CONFIG.database.password || !CONFIG.vps.baseUrl) {
  console.warn('[CONFIG] Using default values for some settings');
}

// ============================================================================
// DATABASE POOL
// ============================================================================

const dbPool = mysql.createPool(CONFIG.database);

// ============================================================================
// ASTM FRAME UTILITIES
// ============================================================================

const ASTMFrame = {
  // ✅ Modulo-256 additive checksum per ASTM E1381 standard
  checksum(content) {
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum += content.charCodeAt(i);
    }
    return (sum % 256).toString(16).padStart(2, '0').toUpperCase();
  },

  build(content, useETB = false) {
    const checksum = this.checksum(content);
    const terminator = useETB ? String.fromCharCode(ASTM.ETB) : String.fromCharCode(ASTM.ETX);
    const frame = `${String.fromCharCode(ASTM.STX)}${content}${terminator}${checksum}\r\n`;
    return Buffer.from(frame, 'utf8');
  }
};

// ============================================================================
// PLACEHOLDER: More functions will be appended
// ============================================================================

console.log('[APP] Bio-Rad D-10 Local Agent - Initialization Started');

// ============================================================================
// ASTM PARSER - Bio-Rad D-10 Specific
// ============================================================================

const ASTMParser = {
  /**
   * Normalize parameter codes: strip leading/trailing carets and uppercase
   * ✅ CRITICAL for Bio-Rad D-10 A1C variants
   * Examples: "^^^A1C" → "A1C", "A1c" → "A1C", "A1c_NGSP" → "A1C_NGSP"
   */
  normalizeParameterCode(rawCode) {
    if (!rawCode) return '';
    // Strip leading/trailing carets and convert to uppercase
    const normalized = rawCode.replace(/^\^+|\^+$/g, '').toUpperCase();
    // Map all A1C variants to standard "A1C"
    if (normalized.startsWith('A1C')) {
      return 'A1C';  // ✅ Normalize A1C, A1C_NGSP, A1c_IFCC all to A1C
    }
    return normalized;
  },

  /**
   * Parse ASTM frame content
   * Handles: H (Header), P (Patient), O (Order), R (Result), L (Terminator)
   */
  parse(frameContent) {
    const parts = frameContent.split('|');
    const recordType = parts[0]?.charAt(0) || '';

    if (recordType === 'H') {
      // Header: H|\^&|||Bio-Rad D-10|||||||P|1|20260810113000
      // Field 4 = machine name / analyzer identifier
      return {
        frameType: 'HEADER',
        analyzer: parts[4] || '',      // ✅ Machine name (like Sysmex)
        timestamp: parts[12] || ''
      };
    }

    if (recordType === 'P') {
      // Patient: P|1|||||||
      return {
        frameType: 'PATIENT'
      };
    }

    if (recordType === 'O') {
      // Order: O|1|barcode|...
      // Field 2 = barcode (e.g., "202608100001-1")
      // Field 3 = sample type (if provided separately)
      const fullBarcode = parts[2] || '';
      
      // Parse barcode to extract visitId and sampleTypeId
      let visitId = '';
      let sampleId = '';
      
      if (fullBarcode.includes('-')) {
        const parsed = parseSampleId(fullBarcode);
        if (parsed) {
          visitId = parsed.visitId;
          sampleId = parsed.sampleTypeId;
          console.log(`[ASTM PARSER] ORDER frame parsed: fullBarcode="${fullBarcode}" -> visitId="${visitId}", sampleId="${sampleId}"`);
        }
      } else {
        // Fallback: use as visitId, sampleId from field 3
        visitId = fullBarcode;
        sampleId = parts[3] || '';
      }
      
      return {
        frameType: 'ORDER',
        sequenceNum: parts[1] || '',
        visitId: visitId,
        sampleId: sampleId,
        testId: parts[5] || ''
      };
    }

    if (recordType === 'R') {
      // Result: R|1|^^^A1C|6.8|%|4.0-6.0|N||F|||20260810113000
      const paramCode = this.normalizeParameterCode(parts[2] || '');  // ✅ Normalize here
      const value = parts[3] || '';
      const unit = parts[4] || '';
      const refRange = parts[5] || '';
      const flag = parts[6] || 'N';  // N=Normal, H=High, L=Low, A=Abnormal
      
      return {
        frameType: 'RESULT',
        sequenceNum: parts[1] || '',
        parameterCode: paramCode,
        value: value,
        unit: unit,
        referenceRange: refRange,
        flag: flag,
        isAbnormal: flag && flag !== 'N' && flag !== '',
        timestamp: parts[11] || ''
      };
    }

    if (recordType === 'L') {
      // Terminator: L|1|N
      return {
        frameType: 'TERMINATOR',
        sequenceNum: parts[1] || ''
      };
    }

    return {
      frameType: 'UNKNOWN',
      raw: frameContent
    };
  }
};

// ============================================================================
// DATABASE HELPERS
// ============================================================================

const Database = {
  async saveResult(visitId, sampleId, machineName, rawAstm, parsedData) {
    try {
      if (!visitId || !sampleId) {
        throw new Error('Missing visitId or sampleId');
      }

      // ✅ Build COMPLETE payload with A1C result
      const completePayload = {
        visitId: visitId,
        sampleId: sampleId,
        results: [{
          testCode: 'A1C',  // ✅ Always A1C for Bio-Rad D-10
          parameters: {
            'A1C': parsedData.value,
            'A1C_UNIT': parsedData.unit,
            'A1C_REFERENCE': parsedData.referenceRange,
            'A1C_FLAG': parsedData.flag,
            'A1C_ABNORMAL': parsedData.isAbnormal
          }
        }],
        timestamp: new Date().toISOString(),
        source: 'BIORAD_D10',
        machineName: machineName
      };

      const query = `
        INSERT INTO pending_results 
        (sample_id, visit_id, machine_name, raw_astm, data_json, status, retry_count)
        VALUES (?, ?, ?, ?, ?, 'PENDING', 0)
      `;

      const [result] = await dbPool.execute(query, [
        sampleId,
        visitId,
        machineName,
        rawAstm,
        JSON.stringify(completePayload)
      ]);

      console.log(`[DB SUCCESS] Result stored: id=${result.insertId}, visitId=${visitId}, sampleId=${sampleId}, A1C=${parsedData.value}${parsedData.unit}`);
      return result.insertId;
    } catch (err) {
      console.error(`[DB ERROR] Failed to save result: ${err.message}`);
      throw err;
    }
  },

  async markSynced(recordId) {
    try {
      await dbPool.execute(
        `UPDATE pending_results 
         SET status = 'SYNCED', synced_at = NOW(), retry_count = 0, error_message = NULL
         WHERE id = ?`,
        [recordId]
      );
      console.log(`[DB] Result ${recordId} marked as SYNCED`);
      return true;
    } catch (err) {
      console.error(`[DB ERROR] Failed to mark synced: ${err.message}`);
      return false;
    }
  },

  async markOfflineQueued(recordId, errorMessage = null) {
    try {
      await dbPool.execute(
        `UPDATE pending_results 
         SET status = 'OFFLINE_QUEUED', 
             retry_count = retry_count + 1,
             last_retry_at = NOW(),
             error_message = ?
         WHERE id = ?`,
        [errorMessage, recordId]
      );
      console.log(`[DB] Result ${recordId} marked as OFFLINE_QUEUED, error: ${errorMessage}`);
      return true;
    } catch (err) {
      console.error(`[DB ERROR] Failed to mark offline queued: ${err.message}`);
      return false;
    }
  },

  async markFailed(recordId, errorMessage) {
    try {
      await dbPool.execute(
        `UPDATE pending_results 
         SET status = 'FAILED', error_message = ?
         WHERE id = ?`,
        [errorMessage, recordId]
      );
      console.error(`[DB] Result ${recordId} marked as FAILED: ${errorMessage}`);
      return true;
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
         AND retry_count < 10
         ORDER BY retry_count ASC, id ASC
         LIMIT ?`,
        [CONFIG.retry.batchSize]
      );
      console.log(`[DB] Found ${rows.length} offline records to retry`);
      return rows;
    } catch (err) {
      console.error(`[DB ERROR] Failed to get pending offline records: ${err.message}`);
      return [];
    }
  },

  async getFailedRecords(limit = 100) {
    try {
      const [rows] = await dbPool.execute(
        `SELECT id, sample_id, visit_id, machine_name, retry_count, error_message, created_at
         FROM pending_results 
         WHERE status = 'FAILED'
         ORDER BY id DESC
         LIMIT ?`,
        [limit]
      );
      return rows;
    } catch (err) {
      console.error(`[DB ERROR] Failed to get failed records: ${err.message}`);
      return [];
    }
  },

  async getStats() {
    try {
      const [stats] = await dbPool.execute(
        `SELECT status, COUNT(*) as count, AVG(retry_count) as avg_retries, MAX(retry_count) as max_retries
         FROM pending_results
         GROUP BY status`
      );
      return stats;
    } catch (err) {
      console.error(`[DB ERROR] Failed to get stats: ${err.message}`);
      return [];
    }
  }
};

// ============================================================================
// CLOUD API - VPS Integration
// ============================================================================

const CloudAPI = {
  async fetchOrder(visitId, sampleId, analyzer) {
    try {
      if (!visitId || !sampleId || !analyzer) {
        throw new Error('Missing visitId, sampleId, or analyzer');
      }

      const url = `${CONFIG.vps.baseUrl}/api/machine/v1/query?visitId=${encodeURIComponent(visitId)}&sampleId=${encodeURIComponent(sampleId)}&analyzer=${encodeURIComponent(analyzer)}`;
      
      console.log(`[CLOUD] Querying: ${url}`);
      const response = await axios.get(url, { timeout: CONFIG.retry.timeoutMs });
      
      if (!response.data || !response.data.data || !response.data.data.patientTests) {
        throw new Error('Invalid response structure from backend');
      }
      
      console.log(`[CLOUD] Fetched order for ${analyzer}/${visitId}/${sampleId}: ${response.data.data.patientTests.length} tests`);
      return response.data.data;
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error(`[CLOUD ERROR] Connection refused: VPS unreachable at ${CONFIG.vps.baseUrl}`);
      } else if (err.response?.status === 404) {
        console.error(`[CLOUD ERROR] Sample not found: ${visitId}/${sampleId}`);
      } else if (err.response?.status === 400) {
        console.error(`[CLOUD ERROR] Bad request: ${err.response.data?.message || err.message}`);
      } else if (err.code === 'ECONNABORTED') {
        console.error(`[CLOUD ERROR] Request timeout (${CONFIG.retry.timeoutMs}ms): ${visitId}/${sampleId}`);
      } else {
        console.error(`[CLOUD ERROR] ${err.message}`);
      }
      throw err;
    }
  },

  async sendResult(payload) {
    try {
      if (!payload.visitId || !payload.sampleId) {
        throw new Error('Missing visitId or sampleId in payload');
      }

      if (!payload.results || !Array.isArray(payload.results) || payload.results.length === 0) {
        throw new Error('Missing or empty results array in payload');
      }

      const url = `${CONFIG.vps.baseUrl}/api/machine/v1/results`;
      console.log(`[CLOUD] Posting A1C result to: ${url}`);
      
      const response = await axios.post(url, payload, { timeout: CONFIG.retry.timeoutMs });
      
      if (!response.data || !response.data.success) {
        throw new Error('Backend did not confirm success');
      }
      
      console.log(`[CLOUD] ✓ A1C result sent for ${payload.visitId}`);
      return response.data;
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error(`[CLOUD ERROR] Connection refused: VPS unreachable at ${CONFIG.vps.baseUrl}`);
      } else if (err.response?.status === 400) {
        console.error(`[CLOUD ERROR] Bad request: ${err.response.data?.message || err.message}`);
      } else if (err.code === 'ECONNABORTED') {
        console.error(`[CLOUD ERROR] Request timeout (${CONFIG.retry.timeoutMs}ms)`);
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
      
      if (response.status === 200) {
        console.log(`[VPS HEALTH] ✓ VPS is reachable`);
        return true;
      }
      return false;
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.warn(`[VPS HEALTH] ✗ VPS unreachable - ${CONFIG.vps.baseUrl}`);
      } else if (err.code === 'ECONNABORTED') {
        console.warn(`[VPS HEALTH] ✗ VPS timeout (>3s)`);
      } else {
        console.warn(`[VPS HEALTH] ✗ VPS check failed: ${err.message}`);
      }
      return false;
    }
  }
};

// ============================================================================
// QUERY HANDLER - Dynamic Test Order Processing
// ============================================================================

const QueryHandler = {
  async handle(visitId, sampleId, analyzer, serialPort) {
    try {
      if (!visitId || !sampleId || !analyzer) {
        console.error(`[QUERY ERROR] Missing visitId, sampleId, or analyzer`);
        serialPort.write(Buffer.from([ASTM.NAK]));
        return;
      }

      // Fetch order data from VPS backend
      const url = `${CONFIG.vps.baseUrl}/api/machine/v1/query?visitId=${encodeURIComponent(visitId)}&sampleId=${encodeURIComponent(sampleId)}&analyzer=${encodeURIComponent(analyzer)}`;
      
      console.log(`[QUERY] Fetching tests from VPS: ${url}`);
      const response = await axios.get(url, { timeout: CONFIG.retry.timeoutMs });
      
      if (!response.data || !response.data.data || !response.data.data.patientTests) {
        console.error(`[QUERY ERROR] Invalid response structure from backend`);
        serialPort.write(Buffer.from([ASTM.NAK]));
        return;
      }

      const orderData = response.data.data;
      console.log(`[QUERY] Received ${orderData.patientTests.length} test(s) for analyzer: ${analyzer}`);

      // Bio-Rad D-10 only performs A1C tests
      // Filter for A1C test in assigned tests
      const hasA1CTest = orderData.patientTests.some(t => t.testCode === 'A1C');

      if (!hasA1CTest || orderData.patientTests.length === 0) {
        console.error(`[QUERY ERROR] No A1C test assigned for this sample`);
        serialPort.write(Buffer.from([ASTM.NAK]));
        return;
      }

      console.log(`[QUERY] ✓ A1C test is assigned - sending ORDER frame`);

      // Build ORDER frame with A1C test code
      const orderContent = `O|1|${visitId}|${sampleId}||^^^A1C|R||||||N||||||||||||||F`;
      const orderFrame = ASTMFrame.build(orderContent);
      
      console.log(`[QUERY] Sending ORDER frame to machine`);
      serialPort.write(orderFrame);
      serialPort.write(Buffer.from([ASTM.ACK]));

      // Send terminator
      const terminatorContent = `L|1|N`;
      const terminatorFrame = ASTMFrame.build(terminatorContent);
      serialPort.write(terminatorFrame);
      serialPort.write(Buffer.from([ASTM.ACK]));

      console.log(`[QUERY] ✓ ORDER sent successfully for visitId=${visitId}, sampleId=${sampleId}`);

    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error(`[QUERY ERROR] Connection refused: VPS unreachable at ${CONFIG.vps.baseUrl}`);
      } else if (err.response?.status === 404) {
        console.error(`[QUERY ERROR] Sample not found: ${visitId}/${sampleId}`);
      } else if (err.response?.status === 400) {
        console.error(`[QUERY ERROR] Bad request: ${err.response.data?.message || err.message}`);
      } else if (err.code === 'ECONNABORTED') {
        console.error(`[QUERY ERROR] Request timeout (${CONFIG.retry.timeoutMs}ms)`);
      } else {
        console.error(`[QUERY ERROR] ${err.message}`);
      }
      serialPort.write(Buffer.from([ASTM.NAK]));
    }
  }
};

// ============================================================================
// RESULT SYNC - Offline Queue Management
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

        console.log(`[RETRY] Attempting sync for record ${record.id} (attempt=${record.retry_count + 1}/10)`);
        await this.sync(record.id, payload);
        
      } catch (err) {
        console.error(`[RETRY ERROR] Record ${record.id}: ${err.message}`);
        
        const [checkRecord] = await dbPool.execute(
          `SELECT retry_count FROM pending_results WHERE id = ?`,
          [record.id]
        );

        if (checkRecord && checkRecord[0] && checkRecord[0].retry_count >= 10) {
          await Database.markFailed(record.id, `Max retries exceeded: ${err.message}`);
          console.error(`[ALERT] Record ${record.id} permanently failed after 10 retries`);
        }
      }
    }

    console.log(`[RETRY WORKER] Retry batch completed`);
  }
};

// ============================================================================
// RESULT HANDLER
// ============================================================================

const ResultHandler = {
  async handle(visitId, sampleId, rawAstm, parsedData, machineName) {
    try {
      if (!visitId || !sampleId) {
        console.error(`[RESULT ERROR] Missing visitId or sampleId`);
        return;
      }

      // ✅ Pass machine name to saveResult
      const recordId = await Database.saveResult(visitId, sampleId, machineName, rawAstm, parsedData);
      const payload = this.buildPayload(visitId, sampleId, parsedData, machineName);
      await ResultSync.sync(recordId, payload);
    } catch (err) {
      console.error(`[RESULT ERROR] ${err.message}`);
    }
  },

  buildPayload(visitId, sampleId, parsedData, machineName) {
    return {
      visitId: visitId,
      sampleId: sampleId,
      machineName: machineName,
      results: [{
        testCode: 'A1C',
        parameters: {
          'A1C': parsedData.value,
          'A1C_UNIT': parsedData.unit,
          'A1C_REFERENCE': parsedData.referenceRange,
          'A1C_FLAG': parsedData.flag,
          'A1C_ABNORMAL': parsedData.isAbnormal
        }
      }],
      timestamp: new Date().toISOString()
    };
  }
};

// ============================================================================
// SERIAL PORT LISTENER - ASTM Frame Handling with ETB Multi-frame Support & QueryHandler
// ============================================================================

function createSerialPortListener() {
  const port = new SerialPort({
    path: CONFIG.serial.port,
    baudRate: CONFIG.serial.baudRate,
    dataBits: CONFIG.serial.dataBits,
    stopBits: CONFIG.serial.stopBits,
    parity: CONFIG.serial.parity,
    autoOpen: CONFIG.serial.autoOpen
  });

  let buffer = Buffer.alloc(0);
  let sessionOpen = false;
  let currentFrameNumber = 0;
  let accumulatedFrames = [];  // ✅ For ETB multi-frame assembly
  let machineAnalyzer = null;  // ✅ Store analyzer from HEADER frame
  let currentVisitId = null;   // ✅ Store visitId from ORDER frame
  let currentSampleId = null;  // ✅ Store sampleId from ORDER frame

  // ✅ Send initial ACK to machine when port opens
  port.on('open', () => {
    console.log(`\n[SERIAL] 📱 Serial port opened: ${CONFIG.serial.port} @ ${CONFIG.serial.baudRate} baud`);
    port.write(Buffer.from([ASTM.ACK]));
    console.log(`[SERIAL] Sent initial ACK to Bio-Rad D-10`);
    sessionOpen = true;
  });

  port.on('data', async (chunk) => {
      try {
        buffer = Buffer.concat([buffer, chunk]);
        console.log(`[SERIAL BUFFER] Total buffer length: ${buffer.length}, content: "${buffer.toString('utf8')}"`);

        // ✅ Process all complete frames in buffer
        let processed = true;
        while (processed && buffer.length > 0) {
          processed = false;

          // Look for STX
          const stxIndex = buffer.indexOf(ASTM.STX);
          if (stxIndex === -1) {
            console.log(`[SERIAL] No STX found, waiting for more data`);
            break;  // ✅ FIX: Don't slice when stxIndex is -1
          }

          // Look for ETX or ETB after STX
          let terminatorIndex = -1;
          let isETB = false;
          
          const etxIndex = buffer.indexOf(ASTM.ETX);
          const etbIndex = buffer.indexOf(ASTM.ETB);

          if (etxIndex !== -1 && (etbIndex === -1 || etxIndex < etbIndex)) {
            terminatorIndex = etxIndex;
            isETB = false;
          } else if (etbIndex !== -1) {
            terminatorIndex = etbIndex;
            isETB = true;
          }

          if (terminatorIndex === -1) {
            console.log(`[SERIAL] No terminator (ETX/ETB) found, waiting for more data`);
            break;
          }

          // ✅ Frame structure: STX...ETX/ETB + 2 checksum chars (+ optional CR/LF)
          const checksumStart = terminatorIndex + 1;
          const checksumEnd = checksumStart + 2;
          
          if (buffer.length < checksumEnd) {
            console.log(`[SERIAL] Incomplete frame (have ${buffer.length} bytes, need at least ${checksumEnd}), waiting`);
            break;
          }

          const frameChecksum = buffer.slice(checksumStart, checksumEnd).toString('utf8');
          const frame = buffer.slice(stxIndex, checksumEnd);

          console.log(`[SERIAL FRAME] Raw frame (with STX/ETX/ETB): "${frame.toString('utf8')}" (hex: ${frame.toString('hex')})`);

          // Extract content (between STX and ETX/ETB)
          let frameContent = buffer.slice(stxIndex + 1, terminatorIndex).toString('utf8');
          console.log(`[SERIAL FRAME] Cleaned frame content: "${frameContent}"`);
          console.log(`[SERIAL FRAME] Frame checksum: ${frameChecksum}`);

          // ✅ Verify checksum
          const calculatedChecksum = ASTMFrame.checksum(frameContent);
          const isChecksumValid = frameChecksum.toUpperCase() === calculatedChecksum;
          console.log(`[SERIAL FRAME] Checksum validation: calculated=${calculatedChecksum}, received=${frameChecksum}, valid=${isChecksumValid}`);

          if (!isChecksumValid) {
            console.error(`[SERIAL FRAME] ❌ INVALID CHECKSUM - Sending NAK`);
            port.write(Buffer.from([ASTM.NAK]));
            buffer = buffer.slice(checksumEnd + 2);
            processed = true;
            continue;
          }

          // ✅ Valid frame - send ACK and process
          port.write(Buffer.from([ASTM.ACK]));
          console.log(`[SERIAL FRAME] ✅ Frame valid, sent ACK`);

          // Parse the frame
          const parsed = ASTMParser.parse(frameContent);
          console.log(`[SERIAL FRAME] Parsed: frameType=${parsed.frameType}`);

          // ✅ Store analyzer from HEADER frame
          if (parsed.frameType === 'HEADER' && parsed.analyzer) {
            machineAnalyzer = parsed.analyzer;
            console.log(`[SERIAL] Stored analyzer for this connection: ${machineAnalyzer}`);
          }

          // ✅ Handle ORDER frame - Bio-Rad sends visitId and sampleId in ORDER (not QUERY)
          if (parsed.frameType === 'ORDER') {
            // ✅ Extract visitId and sampleId from ORDER frame
            currentVisitId = parsed.visitId;
            currentSampleId = parsed.sampleId;
            console.log(`[SERIAL] ORDER frame detected: visitId=${currentVisitId}, sampleId=${currentSampleId}`);
            
            // ✅ Now we have visitId, sampleId, and analyzer - fetch assigned tests
            if (currentVisitId && currentSampleId && machineAnalyzer) {
              console.log(`[SERIAL] Fetching assigned tests from VPS`);
              await QueryHandler.handle(currentVisitId, currentSampleId, machineAnalyzer, port);
            } else {
              console.warn(`[SERIAL] Cannot fetch tests - missing visitId/sampleId/analyzer`);
            }
          }

          // ✅ Handle ETB frames (accumulate for multi-frame data)
          if (isETB && parsed.frameType === 'RESULT') {
            accumulatedFrames.push(frameContent);
            console.log(`[SERIAL] Accumulated ETB frame, waiting for more...`);
            buffer = buffer.slice(checksumEnd + 2);
            processed = true;
            continue;
          }

          // ✅ Handle ETX (final frame) - process accumulated or single frame
          if (!isETB && parsed.frameType === 'RESULT') {
            accumulatedFrames.push(frameContent);
            
            // Now we have complete result (possibly from multiple ETB frames)
            console.log(`[SERIAL] Processing complete result from ${accumulatedFrames.length} frame(s)`);
            
            // ✅ Bio-Rad: Extract A1C from result and save with visitId/sampleId from ORDER
            for (const resultFrame of accumulatedFrames) {
              const resultParsed = ASTMParser.parse(resultFrame);
              if (resultParsed.frameType === 'RESULT') {
                console.log(`[RESULT] A1C=${resultParsed.value}${resultParsed.unit}, Flag=${resultParsed.flag}, Abnormal=${resultParsed.isAbnormal}`);
                
                // ✅ Process result with ResultHandler
                if (currentVisitId && currentSampleId) {
                  await ResultHandler.handle(currentVisitId, currentSampleId, resultFrame, resultParsed, machineAnalyzer || 'Bio-Rad D-10');
                } else {
                  console.error(`[RESULT ERROR] Missing visitId or sampleId - cannot process result`);
                }
              }
            }
            
            accumulatedFrames = [];  // Reset for next transmission
          }

          // ✅ Handle TERMINATOR - flush if ETX
          if (!isETB && parsed.frameType === 'TERMINATOR') {
            console.log(`[SERIAL] Received TERMINATOR, session ending`);
            sessionOpen = false;
          }

          // ✅ Move buffer pointer past this frame (STX to checksum + optional CR/LF)
          let skipBytes = checksumEnd;
          // Check for CR/LF after checksum and skip if present
          if (buffer.length > checksumEnd + 1) {
            const nextByte = buffer[checksumEnd];
            const nextNextByte = buffer.length > checksumEnd + 1 ? buffer[checksumEnd + 1] : null;
            if (nextByte === ASTM.CR && nextNextByte === ASTM.LF) {
              skipBytes = checksumEnd + 2;
            } else if (nextByte === ASTM.CR || nextByte === ASTM.LF) {
              skipBytes = checksumEnd + 1;
            }
          }
          buffer = buffer.slice(skipBytes);
          processed = true;
        }
      } catch (err) {
        console.error(`[SERIAL ERROR] ${err.message}`);
        port.write(Buffer.from([ASTM.NAK]));
      }
    });

  port.on('close', () => {
    console.log(`[SERIAL] Port closed`);
    sessionOpen = false;
  });

  port.on('error', (err) => {
    console.error(`[SERIAL ERROR] ${err.message}`);
    if (err.code === 'EACCES') {
      console.error(`[SERIAL ERROR] Permission denied - check serial port permissions`);
    } else if (err.code === 'ENOENT') {
      console.error(`[SERIAL ERROR] Serial port not found: ${CONFIG.serial.port}`);
    }
  });

  return port;
}

// ============================================================================
// STARTUP & MONITORING
// ============================================================================

let serialPort = null;

async function startup() {
  console.log('\n' + '='.repeat(70));
  console.log('BIO-RAD D-10 LOCAL AGENT - STARTING');
  console.log('='.repeat(70));
  console.log(`Serial Port:      ${CONFIG.serial.port} @ ${CONFIG.serial.baudRate} baud`);
  console.log(`Data Bits:        ${CONFIG.serial.dataBits}`);
  console.log(`Stop Bits:        ${CONFIG.serial.stopBits}`);
  console.log(`Parity:           ${CONFIG.serial.parity}`);
  console.log(`Database:         ${CONFIG.database.host}:${CONFIG.database.port}/${CONFIG.database.database}`);
  console.log(`VPS Backend:      ${CONFIG.vps.baseUrl}`);
  console.log('='.repeat(70) + '\n');

  // Test database connection
  try {
    const connection = await dbPool.getConnection();
    console.log(`[DB] ✓ Database connection successful`);
    connection.release();
  } catch (err) {
    console.error(`[DB] ✗ Database connection failed: ${err.message}`);
    console.error('[DB] Make sure MySQL is running and pending_results table exists');
    process.exit(1);
  }

  // Start serial port listener
  serialPort = createSerialPortListener();
  
  try {
    await serialPort.open();
    console.log(`[SERIAL] ✓ Serial port opened and listening`);
  } catch (err) {
    if (err.code === 'EACCES') {
      console.error(`[SERIAL] ✗ Permission denied - check serial port permissions`);
      console.error(`[SERIAL] On Linux: sudo chmod 666 ${CONFIG.serial.port}`);
    } else if (err.code === 'ENOENT') {
      console.error(`[SERIAL] ✗ Serial port not found: ${CONFIG.serial.port}`);
      console.error(`[SERIAL] Available ports: Check device manager or run 'dmesg' on Linux`);
    } else {
      console.error(`[SERIAL] ✗ Error opening serial port: ${err.message}`);
    }
    process.exit(1);
  }

  // Start retry worker (every 30 seconds)
  const retryWorker = setInterval(() => ResultSync.retryOfflineRecords(), CONFIG.retry.intervalMs);
  console.log(`[WORKER] ✓ Retry job scheduled every ${CONFIG.retry.intervalMs}ms`);

  // Health check function
  async function healthCheck() {
    try {
      const stats = await Database.getStats();
      
      if (stats && stats.length > 0) {
        console.log(`[HEALTH] ═══════════════════════════════════════`);
        for (const stat of stats) {
          console.log(`[HEALTH] ${stat.status}: ${stat.count} record(s) (avg retries: ${Math.round(stat.avg_retries || 0)}, max: ${stat.max_retries || 0})`);
        }
        console.log(`[HEALTH] ═══════════════════════════════════════`);
      }

      // Check for permanently failed records
      const failedRecords = await Database.getFailedRecords(5);
      if (failedRecords && failedRecords.length > 0) {
        console.error(`[HEALTH] ⚠️ ALERT: ${failedRecords.length} permanently failed record(s)`);
        for (const record of failedRecords.slice(0, 3)) {
          console.error(`[HEALTH]   • Record ${record.id}: visitId=${record.visit_id}, retries=${record.retry_count}, error: ${record.error_message}`);
        }
      }

      // Check for stuck records
      const [stuckRecords] = await dbPool.execute(
        `SELECT COUNT(*) as count FROM pending_results 
         WHERE status = 'OFFLINE_QUEUED' AND retry_count > 5`
      );
      if (stuckRecords && stuckRecords[0] && stuckRecords[0].count > 0) {
        console.warn(`[HEALTH] ⚠️ WARNING: ${stuckRecords[0].count} record(s) in high-retry loop (>5 attempts)`);
      }

    } catch (err) {
      console.error(`[HEALTH] Database check failed: ${err.message}`);
    }
  }

  // Run health check every 5 minutes
  const healthCheckInterval = setInterval(healthCheck, 5 * 60 * 1000);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n[SHUTDOWN] SIGTERM received');
    shutdown(retryWorker, healthCheckInterval);
  });

  process.on('SIGINT', () => {
    console.log('\n[SHUTDOWN] SIGINT received');
    shutdown(retryWorker, healthCheckInterval);
  });

  console.log('[AGENT] ✓ Ready to accept A1C results from Bio-Rad D-10 on serial port\n');
}

async function shutdown(retryWorker, healthCheckInterval) {
  console.log('[SHUTDOWN] Stopping services...');

  clearInterval(retryWorker);
  clearInterval(healthCheckInterval);
  console.log('[SHUTDOWN] ✓ Intervals cleared');

  if (serialPort && serialPort.isOpen) {
    serialPort.close(() => {
      console.log('[SHUTDOWN] ✓ Serial port closed');
    });
  }

  try {
    console.log('[SHUTDOWN] Attempting to sync pending records...');
    await ResultSync.retryOfflineRecords();
    console.log('[SHUTDOWN] ✓ Pending records processed');
  } catch (err) {
    console.warn(`[SHUTDOWN] Could not sync pending records: ${err.message}`);
  }

  await dbPool.end();
  console.log('[SHUTDOWN] ✓ Database connections closed');
  console.log('[SHUTDOWN] ✓ Graceful shutdown complete\n');
  process.exit(0);
}

startup().catch(err => {
  console.error('[FATAL] Startup failed:', err.message);
  process.exit(1);
});
