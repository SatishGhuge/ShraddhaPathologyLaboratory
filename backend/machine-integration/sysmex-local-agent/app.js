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
    timeoutMs: 5000
  }
};

// ASTM Protocol Constants
const ASTM = {
  ENQ: 0x05,
  ACK: 0x06,
  NAK: 0x15,
  STX: 0x02,
  ETX: 0x03
};

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
  // ✅ FIX 1: Modulo-256 additive checksum per ASTM E1381 standard (not XOR)
  checksum(content) {
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum += content.charCodeAt(i);  // ✅ CHANGED: Additive sum (was XOR)
    }
    return (sum % 256).toString(16).padStart(2, '0').toUpperCase();  // ✅ CHANGED: Modulo-256
  },

  build(content) {
    const checksum = this.checksum(content);
    const frame = `${String.fromCharCode(ASTM.STX)}${content}${String.fromCharCode(ASTM.ETX)}${checksum}`;
    return Buffer.from(frame, 'utf8');
  },

  order(data) {
    const {
      visitId = '',
      patientId = '',
      patientName = '',
      priority = 'N',
      testCodes = '',
      sequenceNumber = '1'
    } = data;

    const record = `O|${sequenceNumber}|${visitId}|${patientId}|${patientName}||${priority}|||||${testCodes}`;
    return this.build(record);
  },

  terminator() {
    return this.build('L|1|N');
  }
};

// ============================================================================
// ASTM PARSER
// ============================================================================

const ASTMParser = {
  /**
   * Parse ASTM frame content (already cleaned of STX/ETX/checksum)
   * Input example: "H|\^&|||Sysmex^XN-350|||||||P|1|20260729183000"
   * Input example: "Q|1|202607290001|5"
   * ✅ FIX 2: Handle frame sequence number (FN digit 0-7 before record type)
   */
  parse(frameContent) {
    console.log(`[ASTM PARSER] Input: "${frameContent}"`);
    
    let frameType = null;
    let visitId = null;
    let sampleId = null;
    let testCode = null;
    let analyzer = null;
    let parameters = {};

    // ✅ FIX 2: Strip leading frame sequence number (0-7) if present
    // Real ASTM machines send: "1H|..." or "2Q|..." 
    // We need to extract just the record type
    let contentToParse = frameContent;
    if (frameContent.length > 0 && /^\d/.test(frameContent[0])) {
      // First character is a digit (frame number 0-7), skip it
      contentToParse = frameContent.substring(1);
      console.log(`[ASTM PARSER] Stripped FN digit, now parsing: "${contentToParse}"`);
    }

    // Split by pipe separator
    const parts = contentToParse.split('|');
    console.log(`[ASTM PARSER] Split into ${parts.length} parts: [${parts.map((p, i) => `${i}:"${p}"`).join(', ')}]`);

    const recordType = parts[0];  // ✅ Now correctly "H", "Q", "R", or "L"
    console.log(`[ASTM PARSER] Record type: ${recordType}`);

    // Handle different frame types
    if (recordType === 'H') {
      // Header frame: H|\\^&|||Sysmex^XN-350|||||||P|1|20260729183000
      frameType = 'HEADER';
      
      // parts[0] = "H"
      // parts[1] = field separator "\\^&"
      // parts[2] = reserved
      // parts[3] = reserved
      // parts[4] = instrument identifier (e.g., "Sysmex^XN-350")
      if (parts[4]) {
        analyzer = parts[4].trim();
        console.log(`[ASTM PARSER] Extracted analyzer from parts[4]: ${analyzer}`);
      }
    } 
    else if (recordType === 'Q') {
      // Query frame: Q|1|visitId|sampleId
      // parts[0] = "Q"
      // parts[1] = sequence number (1)
      // parts[2] = visitId
      // parts[3] = sampleId
      frameType = 'QUERY';
      visitId = parts[2]?.trim() || null;
      sampleId = parts[3]?.trim() || null;
      console.log(`[ASTM PARSER] Query frame: visitId=${visitId}, sampleId=${sampleId}`);
    } 
    else if (recordType === 'R') {
      // Result frame: R|seq|testCode|paramCode|value|unit|status
      frameType = 'RESULT';
      if (parts.length >= 5) {
        testCode = parts[2]?.trim() || '';
        const paramCode = parts[3]?.trim() || '';
        const value = parts[4]?.trim() || '';
        const key = `${testCode}_${paramCode}`;
        parameters[key] = value;
      }
    } 
    else if (recordType === 'L') {
      // Terminator frame: L|1|N
      frameType = 'TERMINATOR';
    }

    const result = {
      frameType: frameType || 'UNKNOWN',
      visitId,
      sampleId,
      analyzer,
      testCode,
      timestamp: new Date().toISOString(),
      parameters
    };
    
    console.log(`[ASTM PARSER] Result:`, result);
    return result;
  }
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const Database = {
  // ✅ NEW: Calculate checksum for duplicate detection
  calculateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  },

  // ✅ UPDATED: Store complete payload with visitId/sampleId/machine info
  async saveResult(visitId, sampleId, machineName, rawAstm, parsedData) {
    try {
      // ✅ Validate critical data before storing
      if (!visitId || !sampleId || !parsedData || !parsedData.parameters) {
        throw new Error('Missing required result data: visitId, sampleId, or parameters');
      }

      console.log(`[DB] 📥 Received parsedData.parameters:`, JSON.stringify(parsedData.parameters));

      // ✅ Build results array from parameters
      const results = [];
      const testMap = {};

      for (const [key, value] of Object.entries(parsedData.parameters || {})) {
        console.log(`[DB] Processing key="${key}", value="${value}"`);
        const [testCode, paramCode] = key.split('_');
        
        console.log(`[DB] Split result: testCode="${testCode}", paramCode="${paramCode}"`);
        
        if (!testCode || !paramCode) {
          console.log(`[DB] ⚠️ Skipping - missing testCode or paramCode`);
          continue;
        }

        if (!testMap[testCode]) {
          testMap[testCode] = {
            testCode: testCode,
            parameters: {}
          };
        }

        testMap[testCode].parameters[paramCode] = value;
      }

      console.log(`[DB] ✅ Built testMap:`, JSON.stringify(testMap));

      for (const [testCode, data] of Object.entries(testMap)) {
        results.push({
          testCode: data.testCode,
          parameters: data.parameters
        });
      }

      console.log(`[DB] ✅ Final results array:`, JSON.stringify(results));

      // ✅ Build COMPLETE payload NOW (not later during sync)
      const completePayload = {
        visitId: visitId,
        sampleId: sampleId,
        results: results,  // ✅ NOW HAS RESULTS ARRAY
        timestamp: new Date().toISOString(),
        checksum: this.calculateChecksum(parsedData),
        source: 'MACHINE',
        machineName: machineName  // ✅ Single machine name field
      };

      const query = `
        INSERT INTO pending_results 
        (sample_id, visit_id, machine_name, raw_astm, data_json, status, retry_count)
        VALUES (?, ?, ?, ?, ?, 'PENDING', 0)
      `;

      const [result] = await dbPool.execute(query, [
        sampleId,
        visitId,
        machineName,  // ✅ Store machine name as-is
        rawAstm,
        JSON.stringify(completePayload)
      ]);

      console.log(`[DB SUCCESS] Result stored: id=${result.insertId}, visitId=${visitId}, sampleId=${sampleId}, machine=${machineName}`);
      return result.insertId;
    } catch (err) {
      console.error(`[DB ERROR] Failed to save result: ${err.message}`);
      throw err;
    }
  },

  // ✅ UPDATED: Mark as synced with timestamp
  async markSynced(recordId) {
    try {
      const [result] = await dbPool.execute(
        `UPDATE pending_results 
         SET status = 'SYNCED', synced_at = NOW(), retry_count = 0, error_message = NULL
         WHERE id = ?`,
        [recordId]
      );
      console.log(`[DB] Result ${recordId} marked as SYNCED`);
      return result.affectedRows > 0;
    } catch (err) {
      console.error(`[DB ERROR] Failed to mark synced: ${err.message}`);
      return false;
    }
  },

  // ✅ UPDATED: Mark as offline queued with error tracking
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
      console.log(`[DB] Result ${recordId} marked as OFFLINE_QUEUED (attempt ${recordId} recorded), error: ${errorMessage}`);
      return result.affectedRows > 0;
    } catch (err) {
      console.error(`[DB ERROR] Failed to mark offline queued: ${err.message}`);
      return false;
    }
  },

  // ✅ NEW: Mark as permanently failed after max retries
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

  // ✅ UPDATED: Smart retry - fetch every 30 seconds, no backoff delays
  async getPendingOffline() {
    try {
      // Get ALL offline records regardless of retry count
      // Retry every 30 seconds until max 10 retries
      const [rows] = await dbPool.execute(
        `SELECT 
           id, 
           data_json, 
           retry_count, 
           sample_id,
           visit_id,
           machine_name
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

  // ✅ NEW: Get failed records for monitoring
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

  // ✅ NEW: Get sync statistics
  async getStats() {
    try {
      const [stats] = await dbPool.execute(
        `SELECT 
           status,
           COUNT(*) as count,
           AVG(retry_count) as avg_retries,
           MAX(retry_count) as max_retries
         FROM pending_results
         GROUP BY status`
      );
      return stats;
    } catch (err) {
      console.error(`[DB ERROR] Failed to get stats: ${err.message}`);
      return [];
    }
  },

  // ✅ NEW: Look up machine ID from database by full machine name
  async getMachineByName(machineName) {
    try {
      if (!machineName) {
        throw new Error('Machine name is required');
      }

      const connection = await dbPool.getConnection();
      const [rows] = await connection.execute(
        'SELECT id, name FROM machines WHERE name = ? LIMIT 1',
        [machineName]
      );
      connection.release();

      if (rows.length > 0) {
        return rows[0];
      }

      console.warn(`[DB] Machine not found: "${machineName}"`);
      return null;
    } catch (err) {
      console.error(`[DB ERROR] Failed to lookup machine: ${err.message}`);
      return null;
    }
  }
};

// ============================================================================
// CLOUD OPERATIONS
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

      // Validate result structure
      for (const result of payload.results) {
        if (!result.testCode) {
          throw new Error('Each result must have testCode');
        }
        if (!result.parameters || typeof result.parameters !== 'object') {
          throw new Error('Each result must have parameters object');
        }
      }

      const url = `${CONFIG.vps.baseUrl}/api/machine/v1/results`;
      
      console.log(`[CLOUD] Posting results to: ${url}`);
      const response = await axios.post(url, payload, { timeout: CONFIG.retry.timeoutMs });
      
      if (!response.data || !response.data.success) {
        throw new Error('Backend did not confirm success');
      }
      
      console.log(`[CLOUD] Result sent for ${payload.visitId}: ${payload.results.length} test(s) processed`);
      return response.data;
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error(`[CLOUD ERROR] Connection refused: VPS unreachable at ${CONFIG.vps.baseUrl}`);
      } else if (err.response?.status === 400) {
        console.error(`[CLOUD ERROR] Bad request: ${err.response.data?.message || err.message}`);
      } else if (err.response?.status === 500) {
        console.error(`[CLOUD ERROR] Server error: ${err.response.data?.message || 'Internal server error'}`);
      } else if (err.code === 'ECONNABORTED') {
        console.error(`[CLOUD ERROR] Request timeout (${CONFIG.retry.timeoutMs}ms) while posting results`);
      } else if (err.message.includes('Missing') || err.message.includes('Invalid')) {
        console.error(`[CLOUD ERROR] Payload validation failed: ${err.message}`);
      } else {
        console.error(`[CLOUD ERROR] ${err.message}`);
      }
      throw err;
    }
  },

  // ✅ NEW: Check if VPS is reachable before attempting sync
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
        console.warn(`[VPS HEALTH] ✗ VPS timeout (>3s) - ${CONFIG.vps.baseUrl}`);
      } else {
        console.warn(`[VPS HEALTH] ✗ VPS check failed: ${err.message}`);
      }
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
      // ✅ NEW: Check if VPS is reachable BEFORE trying to sync
      const isVpsReachable = await CloudAPI.checkVpsHealth();
      
      if (!isVpsReachable) {
        console.warn(`[SYNC] VPS not reachable - will retry later`);
        // Don't mark as offline queued - just return silently
        // This prevents incrementing retry_count for network issues
        return;
      }

      await CloudAPI.sendResult(payload);
      await Database.markSynced(recordId);
    } catch (err) {
      await Database.markOfflineQueued(recordId, err.message);
    }
  },

  // ✅ UPDATED: Check VPS health before retrying
  async retryOfflineRecords() {
    // ✅ NEW: Check VPS health first - if down, skip entire retry cycle
    const isVpsReachable = await CloudAPI.checkVpsHealth();
    
    if (!isVpsReachable) {
      console.warn(`[RETRY WORKER] VPS unreachable - skipping retry cycle, will try again in 30s`);
      return;  // Exit without processing any records - no retry_count increment
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

        // ✅ Validate payload has required fields
        if (!payload.visitId || !payload.sampleId) {
          console.error(`[RETRY ERROR] Record ${record.id}: Missing visitId or sampleId in payload`);
          await Database.markFailed(
            record.id,
            'Payload missing visitId or sampleId'
          );
          continue;
        }

        console.log(`[RETRY] Attempting sync for record ${record.id} (visitId=${payload.visitId}, attempt=${record.retry_count + 1}/10)`);
        
        await this.sync(record.id, payload);
        
      } catch (err) {
        console.error(`[RETRY ERROR] Record ${record.id}: ${err.message}`);
        
        // ✅ Get updated retry count from database
        const [checkRecord] = await dbPool.execute(
          `SELECT retry_count FROM pending_results WHERE id = ?`,
          [record.id]
        );

        if (checkRecord && checkRecord[0] && checkRecord[0].retry_count >= 10) {
          // ✅ Max retries reached - mark as failed
          await Database.markFailed(record.id, `Max retries exceeded: ${err.message}`);
          console.error(`[ALERT] Record ${record.id} permanently failed after 10 retries`);
        } else {
          // ✅ Mark for retry with error message
          await Database.markOfflineQueued(record.id, err.message);
        }
      }
    }

    console.log(`[RETRY WORKER] Retry batch completed`);
  }
};

// ============================================================================
// QUERY HANDLER
// ============================================================================

const QueryHandler = {
  async handle(visitId, sampleId, analyzer, socket) {
    try {
      if (!visitId || !sampleId) {
        console.error(`[QUERY ERROR] Missing visitId or sampleId`);
        console.log(`[DEBUG] visitId: ${visitId}, sampleId: ${sampleId}`);
        socket.write(Buffer.from([ASTM.NAK]));
        return;
      }

      if (!analyzer) {
        console.error(`[QUERY ERROR] Missing analyzer name from ASTM header`);
        socket.write(Buffer.from([ASTM.NAK]));
        return;
      }

      console.log(`[QUERY HANDLER] Fetching order data for: visitId=${visitId}, sampleId=${sampleId}, analyzer=${analyzer}`);
      const orderData = await CloudAPI.fetchOrder(visitId, sampleId, analyzer);
      console.log(`[QUERY HANDLER] ✓ Got order data:`, orderData);

      if (!orderData.patientTests || !Array.isArray(orderData.patientTests)) {
        console.error(`[QUERY ERROR] Invalid response - no patientTests array`);
        throw new Error('Backend response missing patientTests array');
      }

      if (orderData.patientTests.length === 0) {
        console.error(`[QUERY ERROR] No patient tests found`);
        socket.write(Buffer.from([ASTM.NAK]));
        return;
      }

      const testCodes = orderData.patientTests
        .map(t => t.testCode)
        .filter(code => code)
        .join('^');

      console.log(`[QUERY HANDLER] ✓ Extracted machine test codes (shortNames): ${testCodes}`);

      if (!testCodes) {
        console.error(`[QUERY] Could not extract test codes from response`);
        socket.write(Buffer.from([ASTM.NAK]));
        return;
      }

      const orderFrame = ASTMFrame.order({
        visitId: orderData.visitId || visitId,
        patientId: orderData.patientId || '',
        patientName: orderData.patientName || '',
        priority: orderData.priority || 'N',
        testCodes: testCodes
      });

      console.log(`[QUERY HANDLER] ✓ Sending ORDER frame to machine`);
      socket.write(orderFrame);
      socket.write(Buffer.from([ASTM.ACK]));

      const terminator = ASTMFrame.terminator();
      socket.write(terminator);
      socket.write(Buffer.from([ASTM.ACK]));

    } catch (err) {
      console.error(`[QUERY ERROR] Failed to process query: ${err.message}`);
      console.error(`[QUERY ERROR] Stack:`, err.stack);
      socket.write(Buffer.from([ASTM.NAK]));
    }
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
    const results = [];
    const testMap = {};

    for (const [key, value] of Object.entries(parsedData.parameters || {})) {
      const [testCode, paramCode] = key.split('_');
      
      if (!testCode || !paramCode) {
        continue;
      }

      if (!testMap[testCode]) {
        testMap[testCode] = {
          testCode: testCode,
          parameters: {}
        };
      }

      testMap[testCode].parameters[paramCode] = value;
    }

    for (const [testCode, data] of Object.entries(testMap)) {
      results.push({
        testCode: data.testCode,
        parameters: data.parameters
      });
    }

    return {
      visitId: visitId,
      sampleId: sampleId,
      machineName: machineName,
      results: results,
      timestamp: new Date().toISOString()
    };
  }
};

// ============================================================================
// TCP SERVER
// ============================================================================

function createTcpServer() {
  return net.createServer(socket => {
    console.log(`[TCP] Connected: ${socket.remoteAddress}`);
    let buffer = '';
    let machineAnalyzer = null; // Store analyzer from HEADER frame
    let currentVisitId = null; // Store visitId from QUERY frame
    let currentSampleId = null; // Store sampleId from QUERY frame
    let accumulatedResults = {}; // Accumulate RESULT frames

    socket.on('data', async data => {
      if (data.length === 1 && data[0] === ASTM.ENQ) {
        console.log('[TCP] Received ENQ, sending ACK');
        socket.write(Buffer.from([ASTM.ACK]));
        return;
      }

      // Add to buffer
      buffer += data.toString('utf8');
      console.log(`[TCP RAW] Received (${data.length} bytes): ${data.toString('hex')}`);
      console.log(`[TCP BUFFER] Total buffer length: ${buffer.length}, content: "${buffer}"`);
      
      // ✅ FIX 4: Do NOT send ACK immediately - validate frame first

      // Process frames one by one (each frame starts with STX and ends with ETX+checksum)
      while (buffer.includes(String.fromCharCode(ASTM.STX))) {
        const stxIndex = buffer.indexOf(String.fromCharCode(ASTM.STX));
        const etxIndex = buffer.indexOf(String.fromCharCode(ASTM.ETX), stxIndex);
        
        if (etxIndex === -1) {
          console.log(`[TCP FRAME] Incomplete frame (no ETX), waiting for more data...`);
          break;
        }

        // ✅ FIX 3: Verify checksum bytes are available before extraction
        const requiredLength = etxIndex + 3;  // ETX + 2 hex checksum characters
        if (buffer.length < requiredLength) {
          console.log(`[TCP FRAME] Incomplete checksum (have ${buffer.length} bytes, need ${requiredLength}), waiting for more data...`);
          break;  // ✅ CHANGED: Wait for next packet instead of truncating
        }

        // Extract the frame from STX to ETX (inclusive) plus 2 checksum hex chars
        const frameEnd = requiredLength;
        const rawFrame = buffer.substring(stxIndex, frameEnd);
        console.log(`[TCP FRAME] Raw frame (with STX/ETX): "${rawFrame}" (hex: ${Buffer.from(rawFrame).toString('hex')})`);

        // Clean frame content: remove STX, ETX, checksum
        let frameContent = rawFrame.substring(1); // Remove STX
        
        const innerEtxIndex = frameContent.indexOf(String.fromCharCode(ASTM.ETX));
        let checksumFromFrame = '';
        if (innerEtxIndex !== -1) {
          checksumFromFrame = frameContent.substring(innerEtxIndex + 1);  // Extract checksum
          frameContent = frameContent.substring(0, innerEtxIndex);
        }
        
        console.log(`[TCP FRAME] Cleaned frame content: "${frameContent}"`);
        console.log(`[TCP FRAME] Frame checksum: ${checksumFromFrame}`);

        // ✅ FIX 4: Validate checksum before processing
        const calculatedChecksum = ASTMFrame.checksum(frameContent);
        const isValidChecksum = checksumFromFrame.toUpperCase() === calculatedChecksum;
        console.log(`[TCP FRAME] Checksum validation: calculated=${calculatedChecksum}, received=${checksumFromFrame.toUpperCase()}, valid=${isValidChecksum}`);

        if (!isValidChecksum) {
          console.error(`[TCP FRAME] ❌ INVALID CHECKSUM - Sending NAK`);
          socket.write(Buffer.from([ASTM.NAK]));
          // Skip this frame and move buffer pointer forward
          buffer = buffer.substring(frameEnd);
          console.log(`[TCP BUFFER] Remaining buffer after bad frame (${buffer.length} bytes): "${buffer}"`);
          continue;
        }

        // ✅ Checksum valid, now parse the frame
        // Parse the frame 
        const parsed = ASTMParser.parse(frameContent);
        console.log(`[TCP FRAME] Parsed: frameType=${parsed.frameType}, visitId=${parsed.visitId}, sampleId=${parsed.sampleId}, analyzer=${parsed.analyzer}`);

        // ✅ FIX 4: Send ACK only AFTER successful validation and parsing
        console.log(`[TCP] Frame valid, sending ACK`);
        socket.write(Buffer.from([ASTM.ACK]));

        // Store analyzer from HEADER frame
        if (parsed.frameType === 'HEADER' && parsed.analyzer) {
          machineAnalyzer = parsed.analyzer;
          console.log(`[TCP] Stored analyzer for this connection: ${machineAnalyzer}`);
        }

        // Handle QUERY frames immediately (use stored analyzer if not in frame)
        if (parsed.frameType === 'QUERY' && parsed.visitId && parsed.sampleId) {
          const analyzer = parsed.analyzer || machineAnalyzer;
          currentVisitId = parsed.visitId;
          currentSampleId = parsed.sampleId;
          accumulatedResults = {}; // Reset accumulated results for new query
          console.log(`[QUERY] ✓ Processing query: visitId=${parsed.visitId}, sampleId=${parsed.sampleId}, analyzer=${analyzer}`);
          await QueryHandler.handle(parsed.visitId, parsed.sampleId, analyzer, socket);
        }

        // Accumulate RESULT frames
        if (parsed.frameType === 'RESULT') {
          console.log(`[RESULT FRAME] Accumulated: ${JSON.stringify(parsed.parameters)}`);
          // Merge parameters into accumulated results
          accumulatedResults = { ...accumulatedResults, ...parsed.parameters };
        }

        // Handle TERMINATOR frame - process all accumulated results
        if (parsed.frameType === 'TERMINATOR') {
          console.log(`[TERMINATOR] Received, processing ${Object.keys(accumulatedResults).length} accumulated parameters`);
          if (currentVisitId && currentSampleId && Object.keys(accumulatedResults).length > 0) {
            console.log(`[RESULT] Processing all results for ${currentVisitId}/${currentSampleId} from machine: ${machineAnalyzer}`);
            
            // ✅ Send full machine name "Sysmex XN-550" to VPS for lookup
            console.log(`[RESULT] Machine name to send: ${machineAnalyzer}`);
            
            await ResultHandler.handle(currentVisitId, currentSampleId, frameContent, { 
              frameType: 'RESULT',
              parameters: accumulatedResults,
              timestamp: new Date().toISOString()
            }, machineAnalyzer);
          } else {
            console.log(`[TERMINATOR] Skipping - missing visitId/sampleId or no results accumulated`);
          }
          accumulatedResults = {};
        }

        // Remove processed frame from buffer
        buffer = buffer.substring(frameEnd);
        console.log(`[TCP BUFFER] Remaining buffer (${buffer.length} bytes): "${buffer}"`);
      }
    });

    socket.on('end', () => console.log(`[TCP] Disconnected: ${socket.remoteAddress}`));
    socket.on('error', err => console.error(`[TCP ERROR] ${err.message}`));
  });
}

// ============================================================================
// STARTUP
// ============================================================================

let tcpServer = null;

async function startup() {
  console.log('\n' + '='.repeat(70));
  console.log('SYSMEX LOCAL AGENT - STARTING');
  console.log('='.repeat(70));
  console.log(`TCP Server:       0.0.0.0:${CONFIG.tcp.port}`);
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

  // Start TCP server
  tcpServer = createTcpServer();
  tcpServer.listen(CONFIG.tcp.port, CONFIG.tcp.host, () => {
    console.log(`[TCP] ✓ Listening on port ${CONFIG.tcp.port} for Sysmex machine`);
  });

  tcpServer.on('error', (err) => {
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

  // ✅ UPDATED: Enhanced health check with stats and failed record alerts
  async function healthCheck() {
    try {
      // Get overall statistics
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
        console.error(`[HEALTH] ⚠️ ALERT: ${failedRecords.length} permanently failed record(s) - manual intervention needed!`);
        for (const record of failedRecords.slice(0, 3)) {
          console.error(`[HEALTH]   • Record ${record.id}: visitId=${record.visit_id}, retries=${record.retry_count}, error: ${record.error_message}`);
        }
      }

      // Check for records stuck in retry loop
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
    console.log('\n[SHUTDOWN] SIGTERM received, starting graceful shutdown...');
    shutdown(retryWorker, healthCheckInterval);
  });

  process.on('SIGINT', () => {
    console.log('\n[SHUTDOWN] SIGINT received, starting graceful shutdown...');
    shutdown(retryWorker, healthCheckInterval);
  });

  console.log('[AGENT] ✓ Ready to accept connections\n');
}

async function shutdown(retryWorker, healthCheckInterval) {
  console.log('[SHUTDOWN] Stopping services...');

  // Clear intervals
  clearInterval(retryWorker);
  clearInterval(healthCheckInterval);
  console.log('[SHUTDOWN] ✓ Intervals cleared');

  // Close TCP server
  if (tcpServer) {
    tcpServer.close(() => {
      console.log('[SHUTDOWN] ✓ TCP server closed');
    });
  }

  // Try to flush pending offline records before closing
  try {
    console.log('[SHUTDOWN] Attempting to sync pending records...');
    await ResultSync.retryOfflineRecords();
    console.log('[SHUTDOWN] ✓ Pending records processed');
  } catch (err) {
    console.warn(`[SHUTDOWN] Could not sync pending records: ${err.message}`);
  }

  // Close database connection pool
  await dbPool.end();
  console.log('[SHUTDOWN] ✓ Database connections closed');

  console.log('[SHUTDOWN] ✓ Graceful shutdown complete\n');
  process.exit(0);
}

startup().catch(err => {
  console.error('[FATAL] Startup failed:', err.message);
  process.exit(1);
});
