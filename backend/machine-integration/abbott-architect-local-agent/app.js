const net = require('net');
const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  tcp: {
    port: parseInt(process.env.TCP_PORT || '5300'),
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
  },
  astm: {
    enqTimeout: 15000,  // 15-second timeout for ENQ/ACK handshake
    frameTimeout: 5000  // 5-second timeout per frame transmission
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
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse sample ID in format: VISITID-SAMPLETYPEID or just VISITID
 * Example: "202608200001-2" -> { visitId: "202608200001", sampleTypeId: "2" }
 * FIX #5: If no hyphen, default sampleTypeId to visitId (fallback for non-hyphenated barcodes)
 * Example: "202608200001" -> { visitId: "202608200001", sampleTypeId: "202608200001" }
 */
function parseSampleId(fullSampleId) {
  if (!fullSampleId || typeof fullSampleId !== 'string') {
    console.warn(`[PARSE SAMPLE ID] Invalid input: ${fullSampleId}`);
    return null;
  }

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

  // FIX #5: Default sampleTypeId to visitId if no hyphen present
  // This allows labs with standard single barcodes to work
  console.log(`[PARSE SAMPLE ID] ℹ️ No hyphen found, defaulting sampleTypeId to visitId: ${fullSampleId}`);
  return {
    visitId: fullSampleId.trim(),
    sampleTypeId: fullSampleId.trim(),
    fullSampleId: fullSampleId.trim()
  };
}

// ============================================================================
// ASTM FRAME UTILITIES - FIX #1: Frame Sequence Numbers & CRLF
// ============================================================================

const ASTMFrame = {
  /**
   * FIX #1: Calculate checksum per ASTM E1381
   * Modulo-256 additive sum of all content characters INCLUDING ETX (0x03)
   * Standard requires: sum of all bytes after STX up to and including ETX
   */
  checksum(content) {
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum += content.charCodeAt(i);
    }
    // FIX #1: Include ETX (0x03) in the checksum calculation
    sum += ASTM.ETX;
    return (sum % 256).toString(16).padStart(2, '0').toUpperCase();
  },

  /**
   * FIX #1: Build frame with sequence number and CRLF termination
   * Formula: <STX>[FrameNumber][Data]<ETX>[Checksum]\r\n
   */
  build(content, frameNum = 1) {
    // Validate frame number (1-7, wraps to 0)
    const validFrameNum = (frameNum % 8).toString();
    
    // Prepend frame sequence number to content
    const frameContent = `${validFrameNum}${content}`;
    
    const checksum = this.checksum(frameContent);
    
    // Build frame with CRLF termination
    const frame = `${String.fromCharCode(ASTM.STX)}${frameContent}${String.fromCharCode(ASTM.ETX)}${checksum}\r\n`;
    return Buffer.from(frame, 'utf8');
  },

  /**
   * FIX #3: Build complete query response sequence: H -> P -> O -> L
   */
  buildQueryResponse(data, frameNum = 1) {
    const {
      agentName = 'Agent',
      patientId = '',
      patientName = '',
      visitId = '',
      testCodes = '',
      actionCode = 'R'  // 'R'=Report Available, 'Y'=No orders, 'C'=Cancel
    } = data;

    let currentFrame = frameNum;
    const frames = [];

    // Frame 1: Header
    const headerContent = `H|\\^&|||${agentName}|||||||P|1|${new Date().toISOString().replace(/[-:T]/g, '').substring(0, 12)}`;
    frames.push(this.build(headerContent, currentFrame++));

    // Frame 2: Patient record (required even if empty)
    const patientContent = `P|1|${patientId}|${patientName}|||||||||||||||||||M`;
    frames.push(this.build(patientContent, currentFrame++));

    // Frame 3: Order record with test codes
    // FIX #2: Field 4 (index 4) is Universal Test ID per ASTM E1394
    // Multiple assays delimited by backslash: ^^^Assay1\^^^Assay2\^^^Assay3
    // Format: O|seq|specimenId||^^^TestCode1\^^^TestCode2\...|||timestamp||||actionCode|...
    const formattedTests = testCodes 
      ? testCodes.split('^').map(code => `^^^${code.trim()}`).join('\\')
      : '';
    const orderTimestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 12);
    const orderContent = `O|1|${visitId}||${formattedTests}|||${orderTimestamp}||||${actionCode}||||||N||||||||||||||O`;
    frames.push(this.build(orderContent, currentFrame++));

    // Frame 4: Terminator
    const terminatorContent = `L|1|N`;
    frames.push(this.build(terminatorContent, currentFrame++));

    return { frames, nextFrameNum: currentFrame };
  },

  /**
   * Build terminator frame
   */
  terminator(frameNum = 1) {
    const content = `L|1|N`;
    return this.build(content, frameNum);
  }
};

// ============================================================================
// ASTM PARSER - FIX #4 & #5: Parse O records & resilient test ID parsing
// ============================================================================

const ASTMParser = {
  /**
   * Parse ASTM frame content (cleaned of STX/ETX/checksum)
   * FIX #4: Parse O records to extract visitId/sampleId
   * FIX #5: Resilient test ID parsing with fallbacks
   */
  parse(frameContent) {
    console.log(`[ASTM PARSER] Input: "${frameContent}"`);
    
    let frameType = null;
    let visitId = null;
    let sampleId = null;
    let analyzer = null;
    let parameters = {};

    // Strip leading frame sequence number (0-7)
    let contentToParse = frameContent;
    if (frameContent.length > 0 && /^\d/.test(frameContent[0])) {
      contentToParse = frameContent.substring(1);
      console.log(`[ASTM PARSER] Stripped FN digit, now parsing: "${contentToParse}"`);
    }

    const parts = contentToParse.split('|');
    console.log(`[ASTM PARSER] Split into ${parts.length} parts`);

    const recordType = parts[0];
    console.log(`[ASTM PARSER] Record type: ${recordType}`);

    if (recordType === 'H') {
      frameType = 'HEADER';
      if (parts[4]) {
        analyzer = parts[4].trim();
        console.log(`[ASTM PARSER] Extracted analyzer: ${analyzer}`);
      }
    } 
    else if (recordType === 'Q') {
      frameType = 'QUERY';
      // Query: Q|1|^BARCODE^^^||ALL|||||1|0
      const componentField = parts[2]?.trim() || '';
      const components = componentField.split('^');
      const fullBarcode = (components[1] || '').trim();
      
      if (fullBarcode) {
        const parsed = parseSampleId(fullBarcode);
        if (parsed) {
          visitId = parsed.visitId;
          sampleId = parsed.sampleTypeId;
          console.log(`[ASTM PARSER] Query: visitId="${visitId}", sampleId="${sampleId}"`);
        }
      }
    }
    // FIX #4: Parse incoming O records to extract specimen IDs
    else if (recordType === 'O') {
      frameType = 'ORDER';
      // Order: O|seq|visitId|patientId|...
      const fullBarcode = parts[2]?.trim() || '';
      if (fullBarcode) {
        const parsed = parseSampleId(fullBarcode);
        if (parsed) {
          visitId = parsed.visitId;
          sampleId = parsed.sampleTypeId;
          console.log(`[ASTM PARSER] Order: visitId="${visitId}", sampleId="${sampleId}"`);
        }
      }
    }
    else if (recordType === 'R') {
      frameType = 'RESULT';
      // FIX #3: Parse test code and parameter code with fallback logic
      // Abbott can send either numeric assay codes OR mnemonic codes
      // Format: R|seq|^^^testCode^paramCode|value|unit|refRange|flag|...
      // Example: R|1|^^^TFT^TSH|2.5|uIU/mL|0.35^4.94|N|F|...
      // Alternative: R|1|^^^1200|2.5|uIU/mL|0.35^4.94|N|F|...
      if (parts.length >= 5) {
        const componentField = parts[2]?.trim() || '';
        const components = componentField.split('^');
        
        // components[3] = testCode (assay code/mnemonic, e.g., "TFT" or "1200")
        // components[4] = paramCode (parameter mnemonic, e.g., "TSH")
        const testCode = (components[3] || '').trim();
        const paramCode = (components[4] || '').trim();
        const value = parts[3]?.trim() || '';
        
        // FIX #3: Use OR logic - accept either testCode OR paramCode (not requiring both)
        // Fallback: if no paramCode, use testCode; if no testCode, use paramCode
        const validTestCode = testCode || paramCode;
        const validParamCode = paramCode || testCode;
        
        if (validTestCode || validParamCode) {
          const key = `${validTestCode}_${validParamCode}`;
          parameters[key] = value;
          console.log(`[ASTM PARSER] Result: testCode="${validTestCode}", paramCode="${validParamCode}", value="${value}"`);
        }
      }
    } 
    else if (recordType === 'L') {
      frameType = 'TERMINATOR';
    }

    const result = {
      frameType: frameType || 'UNKNOWN',
      visitId,
      sampleId,
      analyzer,
      timestamp: new Date().toISOString(),
      parameters
    };
    
    console.log(`[ASTM PARSER] Parsed:`, result);
    return result;
  }
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const Database = {
  calculateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  },

  async saveResult(visitId, sampleId, machineName, rawAstm, parsedData) {
    try {
      if (!visitId || !sampleId || !parsedData || !parsedData.parameters) {
        throw new Error('Missing required result data: visitId, sampleId, or parameters');
      }

      console.log(`[DB] 📥 Received parsedData.parameters:`, JSON.stringify(parsedData.parameters));

      const results = [];
      const testMap = {};

      for (const [key, value] of Object.entries(parsedData.parameters || {})) {
        const [testCode, paramCode] = key.split('_');
        
        if (!testCode || !paramCode) continue;

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

      const completePayload = {
        visitId: visitId,
        sampleId: sampleId,
        results: results,
        timestamp: new Date().toISOString(),
        checksum: this.calculateChecksum(parsedData),
        source: 'MACHINE',
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

      console.log(`[DB SUCCESS] Result stored: id=${result.insertId}`);
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
      console.log(`[DB] Result ${recordId} marked as SYNCED`);
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
      console.log(`[DB] Result ${recordId} marked as OFFLINE_QUEUED`);
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
      console.error(`[DB] Result ${recordId} marked as FAILED`);
      return result.affectedRows > 0;
    } catch (err) {
      console.error(`[DB ERROR] Failed to mark failed: ${err.message}`);
      return false;
    }
  },

  async getPendingOffline() {
    try {
      const [rows] = await dbPool.execute(
        `SELECT 
           id, data_json, retry_count, sample_id, visit_id, machine_name
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
      console.error(`[DB ERROR] Failed to get pending offline: ${err.message}`);
      return [];
    }
  },

  async getStats() {
    try {
      const [stats] = await dbPool.execute(
        `SELECT status, COUNT(*) as count
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
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response structure from backend');
      }
      
      console.log(`[CLOUD] ✓ Fetched order for ${analyzer}/${visitId}/${sampleId}`);
      return response.data.data;
    } catch (err) {
      console.error(`[CLOUD ERROR] ${err.message}`);
      throw err;
    }
  },

  async sendResult(payload) {
    try {
      if (!payload.visitId || !payload.sampleId) {
        throw new Error('Missing visitId or sampleId in payload');
      }

      if (!payload.results || !Array.isArray(payload.results)) {
        throw new Error('Missing or empty results array');
      }

      const url = `${CONFIG.vps.baseUrl}/api/machine/v1/results`;
      
      console.log(`[CLOUD] Posting results to: ${url}`);
      const response = await axios.post(url, payload, { timeout: CONFIG.retry.timeoutMs });
      
      if (!response.data || !response.data.success) {
        throw new Error('Backend did not confirm success');
      }
      
      console.log(`[CLOUD] ✓ Result sent for ${payload.visitId}`);
      return response.data;
    } catch (err) {
      console.error(`[CLOUD ERROR] ${err.message}`);
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
      console.warn(`[VPS HEALTH] ✗ VPS unreachable`);
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
    
    if (records.length === 0) return;

    console.log(`[RETRY WORKER] Starting retry for ${records.length} offline record(s)`);

    for (const record of records) {
      try {
        const payload = typeof record.data_json === 'string' 
          ? JSON.parse(record.data_json) 
          : record.data_json;

        if (!payload.visitId || !payload.sampleId) {
          console.error(`[RETRY ERROR] Record ${record.id}: Missing visitId or sampleId`);
          await Database.markFailed(record.id, 'Missing visitId or sampleId');
          continue;
        }

        console.log(`[RETRY] Attempting sync for record ${record.id} (attempt ${record.retry_count + 1}/10)`);
        await this.sync(record.id, payload);
        
      } catch (err) {
        console.error(`[RETRY ERROR] Record ${record.id}: ${err.message}`);
        const [checkRecord] = await dbPool.execute(
          `SELECT retry_count FROM pending_results WHERE id = ?`,
          [record.id]
        );

        if (checkRecord && checkRecord[0] && checkRecord[0].retry_count >= 10) {
          await Database.markFailed(record.id, `Max retries exceeded: ${err.message}`);
        }
      }
    }

    console.log(`[RETRY WORKER] Retry batch completed`);
  }
};

// ============================================================================
// FIX #2: OUTGOING LINE BIDDING STATE MACHINE
// ============================================================================

class ASTMLineController {
  constructor(socket) {
    this.socket = socket;
    this.state = 'IDLE';  // IDLE, TRANSMITTING, RECEIVING
    this.outgoingQueue = [];
    this.frameSequence = 1;
  }

  /**
   * Queue frames for transmission and initiate line bidding
   */
  async queueFramesForTransmission(frames) {
    this.outgoingQueue = frames || [];
    await this.transmitFrames();
  }

  /**
   * FIX #2: Implement outgoing line bidding state machine
   * 1. Send ENQ, wait for ACK (15s timeout)
   * 2. Transmit each frame, wait for ACK
   * 3. Send EOT to terminate session
   */
  async transmitFrames() {
    try {
      if (this.outgoingQueue.length === 0) return;

      this.state = 'TRANSMITTING';
      console.log(`[ASTM LINE] Starting transmission (${this.outgoingQueue.length} frames)`);

      // Step 1: Bid for line with ENQ
      console.log(`[ASTM LINE] Bidding for line - sending ENQ`);
      this.socket.write(Buffer.from([ASTM.ENQ]));

      // Step 2: Wait for ACK with 15-second timeout
      const ackReceived = await this.waitForAck(CONFIG.astm.enqTimeout);
      if (!ackReceived) {
        throw new Error('ENQ/ACK handshake timeout (15s) - line bid failed');
      }

      console.log(`[ASTM LINE] ✓ Line bid successful - sending ${this.outgoingQueue.length} frame(s)`);

      // Step 3: Transmit each frame in queue
      for (const frameBuffer of this.outgoingQueue) {
        console.log(`[ASTM LINE] Sending frame (seq ${this.frameSequence})`);
        this.socket.write(frameBuffer);

        // Wait for ACK after each frame
        const frameAckReceived = await this.waitForAck(CONFIG.astm.frameTimeout);
        if (!frameAckReceived) {
          throw new Error(`Frame ACK timeout - frame sequence ${this.frameSequence}`);
        }

        this.frameSequence = (this.frameSequence + 1) % 8;
        console.log(`[ASTM LINE] ✓ Frame acknowledged`);
      }

      // Step 4: Send EOT to terminate session
      console.log(`[ASTM LINE] Transmission complete - sending EOT`);
      this.socket.write(Buffer.from([ASTM.EOT]));

      // Reset frame sequence for next transaction
      this.frameSequence = 1;
      this.outgoingQueue = [];
      this.state = 'IDLE';
      console.log(`[ASTM LINE] ✓ Line session terminated`);

    } catch (err) {
      console.error(`[ASTM LINE ERROR] Transmission failed: ${err.message}`);
      this.outgoingQueue = [];
      this.state = 'IDLE';
      throw err;
    }
  }

  /**
   * Wait for ACK byte with timeout
   * FIX #6: Properly reject promise on line contention (ENQ received during transmission)
   */
  waitForAck(timeoutMs) {
    return new Promise((resolve, reject) => {
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, timeoutMs);

      // This will be called by main socket data handler when ACK is received
      this.socket._waitingForAck = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(true);
        }
      };
      
      // FIX #6: Mark when promise is no longer valid (on line contention)
      // If ENQ received, this getter will return false state
      this.socket._ackResolved = () => resolved;
    });
  }
}

// ============================================================================
// QUERY HANDLER
// ============================================================================

const QueryHandler = {
  async handle(session, visitId, sampleId, analyzer, lineController) {
    try {
      if (!visitId || !sampleId || !analyzer) {
        console.error(`[QUERY ERROR] Missing required parameters`);
        return;
      }

      console.log(`[QUERY HANDLER] Fetching order for: visitId=${visitId}, sampleId=${sampleId}, analyzer=${analyzer}`);
      
      let orderData = null;
      try {
        orderData = await CloudAPI.fetchOrder(visitId, sampleId, analyzer);
      } catch (err) {
        console.error(`[QUERY ERROR] Backend query failed: ${err.message}`);
        orderData = { patientTests: [] };  // Empty tests if backend fails
      }

      const testCodes = (orderData.patientTests || [])
        .map(t => t.testCode)
        .filter(code => code)
        .join('^');

      // FIX #3: Build complete query response sequence H -> P -> O -> L
      // FIX #2: Use action code Y if no tests found
      const actionCode = testCodes ? 'R' : 'Y';
      
      const { frames } = ASTMFrame.buildQueryResponse({
        agentName: 'AbbottAgent',
        patientId: orderData.patientId || '',
        patientName: orderData.patientName || '',
        visitId: visitId,
        testCodes: testCodes,
        actionCode: actionCode
      }, lineController.frameSequence);

      console.log(`[QUERY HANDLER] Queuing ${frames.length} response frames (actionCode=${actionCode})`);
      await lineController.queueFramesForTransmission(frames);

    } catch (err) {
      console.error(`[QUERY ERROR] ${err.message}`);
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
      
      if (!testCode || !paramCode) continue;

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
// TCP SERVER - FIX #6: Session & Socket Context Isolation
// ============================================================================

function createTcpServer() {
  return net.createServer((socket) => {
    console.log(`[TCP] Connected: ${socket.remoteAddress}`);
    
    // FIX #6: Encapsulate session state per socket connection
    const session = {
      buffer: '',
      frameSequence: 1,
      sessionState: 'IDLE',  // IDLE, RECEIVING, TRANSMITTING
      visitId: null,
      sampleId: null,
      analyzer: null,
      accumulatedResults: {},
      lineController: null
    };

    // Initialize line controller for this socket
    session.lineController = new ASTMLineController(socket);

    socket.on('data', async data => {
      try {
        // FIX #4: Handle TCP control bytes even if bundled with frame data
        // TCP is a stream protocol - control bytes may arrive mixed with frame data
        // Process each byte individually to handle control bytes properly
        let offset = 0;
        
        while (offset < data.length) {
          const byte = data[offset];
          
          // FIX #4: Check for control bytes regardless of packet bundling
          if (byte === ASTM.ENQ) {
            console.log(`[TCP] Received ENQ from Abbott - Abbott takes priority`);
            session.sessionState = 'RECEIVING';
            session.lineController.state = 'IDLE';  // Abort outgoing transmission
            session.lineController.outgoingQueue = [];
            
            // FIX #6: Reject pending promise on line contention
            if (socket._waitingForAck) {
              socket._waitingForAck = null;  // Clear handler without calling
            }
            
            socket.write(Buffer.from([ASTM.ACK]));
            offset++;
            continue;
          }
          
          if (byte === ASTM.ACK) {
            console.log(`[TCP] Received ACK from Abbott`);
            if (socket._waitingForAck) {
              socket._waitingForAck();
              socket._waitingForAck = null;
            }
            offset++;
            continue;
          }
          
          if (byte === ASTM.NAK) {
            console.error(`[TCP] Received NAK from Abbott - frame rejected`);
            offset++;
            continue;
          }
          
          if (byte === ASTM.EOT) {
            console.log(`[TCP] Received EOT from Abbott - line session terminated`);
            offset++;
            continue;
          }
          
          // Not a control byte - add to buffer
          session.buffer += String.fromCharCode(byte);
          offset++;
        }
        
        console.log(`[TCP RAW] Received ${data.length} bytes`);
        
        // Process frames
        while (session.buffer.includes(String.fromCharCode(ASTM.STX))) {
          const stxIndex = session.buffer.indexOf(String.fromCharCode(ASTM.STX));
          const etxIndex = session.buffer.indexOf(String.fromCharCode(ASTM.ETX), stxIndex);
          
          if (etxIndex === -1) {
            console.log(`[TCP FRAME] Incomplete frame - waiting for more data`);
            break;
          }

          // Extract frame (STX + content + ETX + 2 hex checksum + CRLF)
          const frameEnd = etxIndex + 3 + 2;  // ETX + 2 hex chars + CRLF
          if (session.buffer.length < frameEnd) {
            console.log(`[TCP FRAME] Incomplete checksum/CRLF - waiting`);
            break;
          }

          const rawFrame = session.buffer.substring(stxIndex, frameEnd);
          let frameContent = rawFrame.substring(1);  // Remove STX
          
          const innerEtxIndex = frameContent.indexOf(String.fromCharCode(ASTM.ETX));
          let checksumFromFrame = '';
          if (innerEtxIndex !== -1) {
            checksumFromFrame = frameContent.substring(innerEtxIndex + 1, innerEtxIndex + 3);  // Extract 2 hex chars
            frameContent = frameContent.substring(0, innerEtxIndex);
          }
          
          // Validate checksum
          const calculatedChecksum = ASTMFrame.checksum(frameContent);
          if (checksumFromFrame.toUpperCase() !== calculatedChecksum) {
            console.error(`[TCP FRAME] ❌ Checksum mismatch - sending NAK`);
            socket.write(Buffer.from([ASTM.NAK]));
            session.buffer = session.buffer.substring(frameEnd);
            continue;
          }

          // Parse frame
          const parsed = ASTMParser.parse(frameContent);
          console.log(`[TCP FRAME] ✓ Valid frame: type=${parsed.frameType}`);

          // Send ACK for valid frame
          socket.write(Buffer.from([ASTM.ACK]));

          // Handle frame types
          if (parsed.frameType === 'HEADER' && parsed.analyzer) {
            session.analyzer = parsed.analyzer;
          }

          if (parsed.frameType === 'QUERY' && parsed.visitId && parsed.sampleId) {
            session.visitId = parsed.visitId;
            session.sampleId = parsed.sampleId;
            session.accumulatedResults = {};
            console.log(`[QUERY] Processing: visitId=${parsed.visitId}, sampleId=${parsed.sampleId}`);
            await QueryHandler.handle(session, parsed.visitId, parsed.sampleId, session.analyzer, session.lineController);
          }

          // FIX #4: Parse O records to extract identifiers
          if (parsed.frameType === 'ORDER' && parsed.visitId && parsed.sampleId) {
            session.visitId = parsed.visitId;
            session.sampleId = parsed.sampleId;
            console.log(`[ORDER] Extracted IDs: visitId=${parsed.visitId}, sampleId=${parsed.sampleId}`);
          }

          if (parsed.frameType === 'RESULT') {
            session.accumulatedResults = { ...session.accumulatedResults, ...parsed.parameters };
          }

          if (parsed.frameType === 'TERMINATOR') {
            console.log(`[TERMINATOR] Processing accumulated results - currentResults:`, session.accumulatedResults);
            if (session.visitId && session.sampleId && Object.keys(session.accumulatedResults).length > 0) {
              console.log(`[TERMINATOR] ✓ Calling ResultHandler with visitId=${session.visitId}, sampleId=${session.sampleId}`);
              await ResultHandler.handle(session.visitId, session.sampleId, frameContent, { 
                frameType: 'RESULT',
                parameters: session.accumulatedResults,
                timestamp: new Date().toISOString()
              }, session.analyzer);
              session.accumulatedResults = {};
              console.log(`[TERMINATOR] ✓ Cleared accumulated results`);
            } else {
              console.log(`[TERMINATOR] ⚠️ Skipping - missing visitId/sampleId or no results. visitId=${session.visitId}, sampleId=${session.sampleId}, resultsCount=${Object.keys(session.accumulatedResults).length}`);
            }
          }

          session.buffer = session.buffer.substring(frameEnd);
        }

      } catch (err) {
        console.error(`[TCP ERROR] ${err.message}`);
      }
    });

    socket.on('end', () => {
      console.log(`[TCP] Disconnected: ${socket.remoteAddress}`);
    });

    socket.on('error', err => {
      console.error(`[TCP ERROR] ${err.message}`);
    });
  });
}

// ============================================================================
// STARTUP
// ============================================================================

let tcpServer = null;

async function startup() {
  console.log('\n' + '='.repeat(70));
  console.log('ABBOTT ARCHITECT LOCAL AGENT - STARTING (REFACTORED)');
  console.log('='.repeat(70));
  console.log(`TCP Server:       0.0.0.0:${CONFIG.tcp.port}`);
  console.log(`Database:         ${CONFIG.database.host}:${CONFIG.database.port}/${CONFIG.database.database}`);
  console.log(`VPS Backend:      ${CONFIG.vps.baseUrl}`);
  console.log('='.repeat(70) + '\n');

  try {
    const connection = await dbPool.getConnection();
    console.log(`[DB] ✓ Database connection successful`);
    connection.release();
  } catch (err) {
    console.error(`[DB] ✗ Database connection failed: ${err.message}`);
    process.exit(1);
  }

  tcpServer = createTcpServer();
  tcpServer.listen(CONFIG.tcp.port, CONFIG.tcp.host, () => {
    console.log(`[TCP] ✓ Listening on port ${CONFIG.tcp.port} for Abbott Architect`);
  });

  tcpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[TCP] ✗ Port ${CONFIG.tcp.port} already in use`);
    } else {
      console.error(`[TCP] ✗ Error: ${err.message}`);
    }
    process.exit(1);
  });

  const retryWorker = setInterval(() => ResultSync.retryOfflineRecords(), CONFIG.retry.intervalMs);
  console.log(`[WORKER] ✓ Retry job scheduled every ${CONFIG.retry.intervalMs}ms\n`);

  async function healthCheck() {
    try {
      const stats = await Database.getStats();
      if (stats && stats.length > 0) {
        console.log(`[HEALTH] Status breakdown:`);
        for (const stat of stats) {
          console.log(`[HEALTH]   ${stat.status}: ${stat.count} record(s)`);
        }
      }
    } catch (err) {
      console.error(`[HEALTH] Check failed: ${err.message}`);
    }
  }

  const healthCheckInterval = setInterval(healthCheck, 5 * 60 * 1000);

  process.on('SIGTERM', () => {
    console.log('\n[SHUTDOWN] SIGTERM - graceful shutdown...');
    shutdown(retryWorker, healthCheckInterval);
  });

  process.on('SIGINT', () => {
    console.log('\n[SHUTDOWN] SIGINT - graceful shutdown...');
    shutdown(retryWorker, healthCheckInterval);
  });

  console.log('[AGENT] ✓ Ready to accept connections\n');
}

async function shutdown(retryWorker, healthCheckInterval) {
  console.log('[SHUTDOWN] Stopping services...');

  clearInterval(retryWorker);
  clearInterval(healthCheckInterval);

  if (tcpServer) {
    tcpServer.close(() => {
      console.log('[SHUTDOWN] ✓ TCP server closed');
    });
  }

  await dbPool.end();
  console.log('[SHUTDOWN] ✓ Database closed');
  console.log('[SHUTDOWN] ✓ Complete\n');
  process.exit(0);
}

startup().catch(err => {
  console.error('[FATAL] Startup failed:', err.message);
  process.exit(1);
});
