const net = require('net');
const mysql = require('mysql2/promise');
const axios = require('axios');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  tcp: {
    port: parseInt(process.env.TCP_PORT || '5200'),
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
    intervalMs: parseInt(process.env.RETRY_INTERVAL_MS || '30000'),
    batchSize: parseInt(process.env.RETRY_BATCH_SIZE || '50'),
    timeoutMs: parseInt(process.env.RETRY_TIMEOUT_MS || '5000')
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

// Erba EM 200 Test Codes Mapping (for quick reference)
const ERBA_TESTS = {
  'ALT': { name: 'Alanine Transaminase', unit: 'U/L', refRange: '7-56' },
  'AST': { name: 'Aspartate Transaminase', unit: 'U/L', refRange: '10-40' },
  'ALB': { name: 'Albumin', unit: 'g/dL', refRange: '3.5-5.2' },
  'ALP': { name: 'Alkaline Phosphatase', unit: 'U/L', refRange: '44-147' },
  'ACP': { name: 'Acid Phosphatase', unit: 'U/L', refRange: '0.0-5.0' },
  'AMY': { name: 'Alpha Amylase', unit: 'U/L', refRange: '28-100' },
  'BIL-T': { name: 'Bilirubin Total', unit: 'mg/dL', refRange: '0.1-1.2' },
  'BIL-D': { name: 'Bilirubin Direct', unit: 'mg/dL', refRange: '0.0-0.3' },
  'BUN': { name: 'Blood Urea Nitrogen', unit: 'mg/dL', refRange: '7-20' },
  'CREA': { name: 'Creatinine', unit: 'mg/dL', refRange: '0.6-1.3' },
  'CHOL': { name: 'Total Cholesterol', unit: 'mg/dL', refRange: '125-200' },
  'TRIG': { name: 'Triglycerides', unit: 'mg/dL', refRange: '30-150' },
  'HDL': { name: 'HDL Cholesterol', unit: 'mg/dL', refRange: '40-60' },
  'LDL': { name: 'LDL Cholesterol', unit: 'mg/dL', refRange: '0-100' },
  'TP': { name: 'Total Protein', unit: 'g/dL', refRange: '6.4-8.3' },
  'UA': { name: 'Uric Acid', unit: 'mg/dL', refRange: '3.5-7.2' },

};

// ============================================================================
// DATABASE POOL
// ============================================================================

const dbPool = mysql.createPool(CONFIG.database);

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
  'GLU': { name: 'Glucose', unit: 'mg/dL', refRange: '70-99' },
  'LDH': { name: 'Lactate Dehydrogenase', unit: 'U/L', refRange: '140-280' },
  'CK-MB': { name: 'Creatine Kinase MB', unit: 'U/L', refRange: '0-25' },
  'Na': { name: 'Sodium (ISE)', unit: 'mmol/L', refRange: '135-145' },
  'K': { name: 'Potassium (ISE)', unit: 'mmol/L', refRange: '3.5-5.1' },
  'Cl': { name: 'Chloride (ISE)', unit: 'mmol/L', refRange: '96-106' },
  'Li': { name: 'Lithium (ISE)', unit: 'mmol/L', refRange: '0.6-1.2' }
};

// Sample Type Codes
const SAMPLE_TYPES = {
  'S': 'Serum',
  'Serum': 'Serum',
  'W': 'Whole Blood',
  'Blood': 'Whole Blood',
  'U': 'Urine',
  'Urine': 'Urine',
  'P': 'Plasma',
  'Plasma': 'Plasma',
  'C': 'CSF',
  'CSF': 'CSF'
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

// ASTM Frame builder - stateless, frame number managed per-connection
const ASTMFrame = {
  // Modulo-256 additive checksum per ASTM E1381 standard
  // Checksum covers from FN (frame number) through CR before ETX
  checksum(content) {
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum += content.charCodeAt(i);
    }
    return (sum % 256).toString(16).padStart(2, '0').toUpperCase();
  },

  // Build frame per ASTM E1381-97: <STX> FN text <CR> <ETX> C1 C2
  // FN = Frame Number (0-7, cycles) - passed as parameter
  // text = record content with CR terminator
  // <ETX> = 0x03
  // C1 C2 = 2-char hex checksum (includes FN, text, CR)
  build(content, frameNumber) {
    // Use provided frame number (managed per-connection)
    const fn = frameNumber % 8;

    // Build content with FN, record, and CR terminator
    const textWithCR = `${fn}${content}\r`;
    
    // Checksum covers FN + record + CR
    const checksum = this.checksum(textWithCR);
    
    // Final frame: STX + FN + record + CR + ETX + checksum
    const frame = `${String.fromCharCode(ASTM.STX)}${textWithCR}${String.fromCharCode(ASTM.ETX)}${checksum}`;
    return Buffer.from(frame, 'utf8');
  },

  header(frameNumber) {
    // H|\^&|||EM200||||||N||E1394-97|20260729183000
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    const record = `H|\\^&|||EM200||||||N||E1394-97|${timestamp}`;
    return this.build(record, frameNumber);
  },

  order(data, frameNumber) {
    const {
      visitId = '',
      sampleId = '',
      patientId = '',
      patientName = '',
      testCodes = '',
      sequenceNumber = '1'
    } = data;

    // O|seq|sampleId|instrument_id|^^^testcode|priority|date_time|...
    const record = `O|${sequenceNumber}|${sampleId}||^^^${testCodes}|N|||||||||${patientId}|${patientName}`;
    return this.build(record, frameNumber);
  },

  terminator(frameNumber) {
    return this.build('L|1|N', frameNumber);
  }
};

// ============================================================================
// ASTM PARSER (Erba EM 200 Specific)
// ============================================================================

const ASTMParser = {
  /**
   * Parse ASTM frame content (already cleaned of STX/ETX/checksum)
   * Frame format per ASTM E1381-97: FN record CR
   * FN = Frame Number (0-7 digit)
   * record = pipe-delimited fields
   * CR = carriage return
   * 
   * Erba EM 200 sends: H, P (optional), O (optional), R (results), C (comments), L (terminator)
   */
  parse(frameContent) {
    console.log(`[ASTM PARSER] Input: "${frameContent}"`);
    
    let frameType = null;
    let visitId = null;
    let sampleId = null;
    let patientId = null;
    let patientName = null;
    let testCode = null;
    let resultValue = null;
    let resultUnits = null;
    let resultReferenceRange = null;
    let resultFlag = null;
    let resultStatus = null;
    let analyzer = null;
    let parameters = {};
    let comments = [];

    // Strip frame number digit (FN, 0-7) at the start
    let contentToParse = frameContent;
    if (frameContent.length > 0 && /^\d/.test(frameContent[0])) {
      contentToParse = frameContent.substring(1);
      console.log(`[ASTM PARSER] Stripped FN digit, now parsing: "${contentToParse}"`);
    }

    // Strip trailing CR if present (ASTM requires CR before ETX)
    if (contentToParse.endsWith('\r')) {
      contentToParse = contentToParse.substring(0, contentToParse.length - 1);
      console.log(`[ASTM PARSER] Stripped trailing CR, now parsing: "${contentToParse}"`);
    }

    // Split by pipe separator
    const parts = contentToParse.split('|');
    console.log(`[ASTM PARSER] Split into ${parts.length} parts`);

    const recordType = parts[0];
    console.log(`[ASTM PARSER] Record type: ${recordType}`);

    // ============================================
    // HEADER FRAME (H)
    // ============================================
    if (recordType === 'H') {
      frameType = 'HEADER';
      
      // H|delim|reserved|reserved|senderID|...
      // parts[0] = "H"
      // parts[1] = "\\^&" (delimiters)
      // parts[4] = sender name (EM200)
      if (parts[4]) {
        analyzer = parts[4].trim() || 'EM200';
        console.log(`[ASTM PARSER] Extracted analyzer: ${analyzer}`);
      }
    } 
    // ============================================
    // PATIENT FRAME (P)
    // ============================================
    else if (recordType === 'P') {
      frameType = 'PATIENT';
      
      // P|seq|practiceId|labPatientId|3rdId|name|...
      // parts[0] = "P"
      // parts[3] = Laboratory Assigned Patient ID
      // parts[5] = Patient Name (Last^First^Middle)
      patientId = parts[3]?.trim() || '';
      patientName = parts[5]?.trim() || '';
      console.log(`[ASTM PARSER] Patient: id=${patientId}, name=${patientName}`);
    }
    // ============================================
    // ORDER FRAME (O)
    // ============================================
    else if (recordType === 'O') {
      frameType = 'ORDER';
      
      // O|seq|specimenId|instrument_id|^^^testcode|priority|...
      // parts[0] = "O"
      // parts[2] = Specimen ID / Sample ID
      // parts[4] = Universal Test ID (^^^TestCode or ^^^Code1^Code2)
      sampleId = parts[2]?.trim() || '';
      
      // Extract test codes from field 4
      const testField = parts[4]?.trim() || '';
      if (testField) {
        // Format: ^^^ALT or ^^^ALT^AST^CHOL (component delimiter ^)
        const codes = testField.split('^').filter(c => c.length > 0);
        if (codes.length > 0) {
          testCode = codes.join('|'); // Join with pipe for consistency
          console.log(`[ASTM PARSER] Extracted test codes: ${testCode}`);
        }
      }

      console.log(`[ASTM PARSER] Order: sampleId=${sampleId}, testCode=${testCode}`);
    }
    // ============================================
    // RESULT FRAME (R)
    // ============================================
    else if (recordType === 'R') {
      frameType = 'RESULT';
      
      // R|seq|^^^testcode|value|units|refRange|abnormalFlag|...
      // parts[0] = "R"
      // parts[2] = Universal Test ID (^^^TestCode)
      // parts[3] = Result Value
      // parts[4] = Units (ISO 2955)
      // parts[5] = Reference Ranges
      // parts[6] = Result Abnormal Flag
      // parts[8] = Result Status (F=Final, C=Corrected, P=Preliminary)

      const testField = parts[2]?.trim() || '';
      if (testField) {
        // Extract test code from ^^^TESTCODE format
        const codes = testField.split('^').filter(c => c.length > 0);
        testCode = codes[0] || '';
      }

      resultValue = parts[3]?.trim() || '';
      resultUnits = parts[4]?.trim() || '';
      resultReferenceRange = parts[5]?.trim() || '';
      resultFlag = parts[6]?.trim() || 'N';
      resultStatus = parts[8]?.trim() || 'F';

      const key = `${testCode}`;
      parameters[key] = {
        value: resultValue,
        units: resultUnits,
        refRange: resultReferenceRange,
        flag: resultFlag,
        status: resultStatus
      };

      console.log(`[ASTM PARSER] Result: testCode=${testCode}, value=${resultValue}, flag=${resultFlag}`);
    }
    // ============================================
    // COMMENT FRAME (C)
    // ============================================
    else if (recordType === 'C') {
      frameType = 'COMMENT';
      
      // C|seq|source|commentText|commentType
      // parts[0] = "C"
      // parts[3] = Comment Text
      const commentText = parts[3]?.trim() || '';
      if (commentText) {
        comments.push(commentText);
        console.log(`[ASTM PARSER] Comment: ${commentText}`);
      }
    }
    // ============================================
    // QUERY FRAME (Q)
    // ============================================
    else if (recordType === 'Q') {
      frameType = 'QUERY';
      
      // Per EM200 ASTM E1394-97 Manual:
      // Q|seq|barcode|endSpecimenId|^^^testcode|nature|status
      // parts[0] = "Q"
      // parts[1] = Sequence Number
      // parts[2] = Starting Specimen ID (barcode scanned, e.g., "202608060002-3")
      // parts[3] = Ending Specimen ID (same as start for single specimen)
      // parts[4] = Universal Test ID (ALL or ^^^CODE1^CODE2)
      // parts[5] = Request Information Nature (optional)
      // parts[6] = Status Code (optional)
      
      const fullBarcode = parts[2]?.trim() || null;
      
      // Parse barcode to extract visitId and sampleTypeId
      if (fullBarcode && fullBarcode.includes('-')) {
        const parsed = parseSampleId(fullBarcode);
        if (parsed) {
          visitId = parsed.visitId;
          sampleId = parsed.sampleTypeId;
          console.log(`[ASTM PARSER] QUERY frame parsed: fullBarcode="${fullBarcode}" -> visitId="${visitId}", sampleId="${sampleId}"`);
        }
      } else {
        // Fallback: treat as visitId, use endSpecimenId as sampleId
        visitId = fullBarcode;
        sampleId = parts[3]?.trim() || null;
        console.log(`[ASTM PARSER] QUERY frame (unparsed): visitId="${visitId}", sampleId="${sampleId}"`);
      }
      
      const testField = parts[4]?.trim() || '';
      if (testField && testField !== 'ALL') {
        // Extract test codes from ^^^ALT^AST format
        const codes = testField.split('^').filter(c => c.length > 0);
        if (codes.length > 0) {
          testCode = codes.join('|');
        }
      }

      console.log(`[ASTM PARSER] Query: visitId=${visitId}, sampleId=${sampleId}, requestedTests=${testField || 'ALL'}`);
    }
    // ============================================
    // TERMINATOR FRAME (L)
    // ============================================
    else if (recordType === 'L') {
      frameType = 'TERMINATOR';
      console.log(`[ASTM PARSER] Message termination received`);
    }

    const result = {
      frameType: frameType || 'UNKNOWN',
      visitId,
      sampleId,
      patientId,
      patientName,
      analyzer,
      testCode,
      timestamp: new Date().toISOString(),
      parameters,
      comments
    };
    
    console.log(`[ASTM PARSER] Result:`, result);
    return result;
  }
};

// ============================================================================
// PER-CONNECTION STATE MANAGEMENT
// ============================================================================

const ConnectionState = {
  /**
   * Create per-connection session state for ASTM stop-and-wait flow control
   */
  create() {
    return {
      frameSequenceNumber: 0,           // 0-7 cycles per connection
      outboundFrameQueue: [],           // Queue of frames to send
      isWaitingForAck: false,           // Stop-and-wait flag
      lastSentFrame: null,              // Track last sent for debugging
      machineAnalyzer: null,            // EM200, Sysmex, etc.
      visitId: null,                    // Current session visit ID
      sampleId: null,                   // Current session sample ID
      accumulatedResults: {},           // Results buffer until terminator
      currentOrderData: {},             // Order data from VPS query
      sessionStartTime: new Date(),     // For timeout detection
      
      /**
       * Enqueue a frame for ASTM stop-and-wait transmission
       */
      enqueueFrame(recordContent, priority = 'normal') {
        const frameNumber = this.frameSequenceNumber;
        this.frameSequenceNumber = (this.frameSequenceNumber + 1) % 8;
        
        this.outboundFrameQueue.push({
          recordContent,
          frameNumber,
          priority,
          createdAt: new Date(),
          attempts: 0
        });
        
        console.log(`[SESSION] Enqueued frame FN=${frameNumber}, queue length=${this.outboundFrameQueue.length}`);
      },
      
      /**
       * Get next frame from queue (respects ASTM stop-and-wait)
       */
      getNextFrameToSend() {
        // Stop-and-wait: only send if we're not waiting for ACK
        if (this.isWaitingForAck) {
          console.log(`[SESSION] Waiting for ACK before sending next frame`);
          return null;
        }
        
        if (this.outboundFrameQueue.length === 0) {
          return null;
        }
        
        return this.outboundFrameQueue.shift();
      },
      
      /**
       * Mark that we're waiting for ACK from the machine
       */
      waitForAck(frameData) {
        this.isWaitingForAck = true;
        this.lastSentFrame = frameData;
      },
      
      /**
       * ACK received - move to next frame
       */
      ackReceived() {
        this.isWaitingForAck = false;
        console.log(`[SESSION] ACK received, ready to send next frame`);
      },
      
      /**
       * Reset for next message sequence
       */
      reset() {
        this.outboundFrameQueue = [];
        this.isWaitingForAck = false;
        this.lastSentFrame = null;
        this.visitId = null;
        this.sampleId = null;
        this.accumulatedResults = {};
        this.currentOrderData = {};
      }
    };
  }
};

const Database = {
  // Calculate checksum for duplicate detection
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

  // Store complete payload with visitId/sampleId/machine info
  async saveResult(visitId, sampleId, machineName, rawAstm, parsedData) {
    try {
      if (!visitId || !sampleId || !parsedData || !parsedData.parameters) {
        throw new Error('Missing required result data: visitId, sampleId, or parameters');
      }

      console.log(`[DB] 📥 Received parsedData.parameters:`, JSON.stringify(parsedData.parameters));

      // Build results array from parameters (flat structure)
      const results = [];
      const testMap = {};

      for (const [testCode, resultData] of Object.entries(parsedData.parameters || {})) {
        console.log(`[DB] Processing testCode="${testCode}", data="${JSON.stringify(resultData)}"`);
        
        if (!testCode) {
          console.log(`[DB] ⚠️ Skipping - missing testCode`);
          continue;
        }

        if (!testMap[testCode]) {
          testMap[testCode] = {
            testCode: testCode,
            parameters: {}
          };
        }

        // Store just the value string, matching Sysmex structure
        testMap[testCode].parameters[testCode] = resultData.value || '';
      }

      console.log(`[DB] ✅ Built testMap:`, JSON.stringify(testMap));

      for (const [testCode, data] of Object.entries(testMap)) {
        results.push({
          testCode: data.testCode,
          parameters: data.parameters
        });
      }

      console.log(`[DB] ✅ Final results array:`, JSON.stringify(results));

      // Build COMPLETE payload matching Sysmex structure
      const completePayload = {
        visitId: visitId,
        sampleId: sampleId,
        patientId: parsedData.patientId || '',
        patientName: parsedData.patientName || '',
        machineName: machineName,
        timestamp: new Date().toISOString(),
        results: results,
        checksum: this.calculateChecksum(parsedData),
        source: 'MACHINE',
        analyzer: parsedData.analyzer || 'EM200',
        comments: parsedData.comments || []
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

      console.log(`[DB SUCCESS] Result stored: id=${result.insertId}, visitId=${visitId}, sampleId=${sampleId}`);
      return result.insertId;
    } catch (err) {
      console.error(`[DB ERROR] Failed to save result: ${err.message}`);
      throw err;
    }
  },

  // Mark as synced with timestamp
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

  // Mark as offline queued with error tracking
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

  // Mark as permanently failed after max retries
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

  // Smart retry - fetch every 30 seconds
  async getPendingOffline() {
    try {
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

  // Get failed records for monitoring
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

  // Get sync statistics
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

  // Look up machine ID from database by machine name
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

  // Check if VPS is reachable before attempting sync
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

  // Retry offline records
  async retryOfflineRecords() {
    const isVpsReachable = await CloudAPI.checkVpsHealth();
    
    if (!isVpsReachable) {
      console.warn(`[RETRY WORKER] VPS unreachable - skipping retry cycle, will try again in ${CONFIG.retry.intervalMs / 1000}s`);
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
        
        const [checkRecord] = await dbPool.execute(
          `SELECT retry_count FROM pending_results WHERE id = ?`,
          [record.id]
        );

        if (checkRecord && checkRecord[0] && checkRecord[0].retry_count >= 10) {
          await Database.markFailed(record.id, `Max retries exceeded: ${err.message}`);
          console.error(`[ALERT] Record ${record.id} permanently failed after 10 retries`);
        } else {
          await Database.markOfflineQueued(record.id, err.message);
        }
      }
    }

    console.log(`[RETRY WORKER] Retry batch completed`);
  }
};

// ============================================================================
// QUERY HANDLER - With ASTM Stop-and-Wait Frame Queue
// ============================================================================

const QueryHandler = {
  async handle(visitId, sampleId, analyzer, socket, sessionState, onOrderDataReceived) {
    try {
      if (!visitId || !sampleId) {
        console.error(`[QUERY ERROR] Missing visitId or sampleId`);
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

      // Store the order data for later use
      if (onOrderDataReceived) {
        onOrderDataReceived(orderData);
      }

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

      console.log(`[QUERY HANDLER] ✓ Extracted test codes: ${testCodes}`);

      if (!testCodes) {
        console.error(`[QUERY] Could not extract test codes from response`);
        socket.write(Buffer.from([ASTM.NAK]));
        return;
      }

      // FIXED: Enqueue ORDER and TERMINATOR frames for ASTM stop-and-wait flow control
      // Frame $N+1$ will NOT be sent until ACK is received for frame $N$
      
      console.log(`[QUERY HANDLER] ✓ Enqueueing ORDER frame to queue (ASTM stop-and-wait)`);
      const orderRecord = `O|1|${orderData.sampleId || sampleId}||^^^${testCodes}|N|||||||||${orderData.patientId || ''}|${orderData.patientName || ''}`;
      sessionState.enqueueFrame(orderRecord, 'normal');

      console.log(`[QUERY HANDLER] ✓ Enqueueing TERMINATOR frame to queue`);
      const terminatorRecord = 'L|1|N';
      sessionState.enqueueFrame(terminatorRecord, 'normal');
      
      // Process queue: send first frame (ORDER)
      FrameTransmitter.sendNextFrame(socket, sessionState);

    } catch (err) {
      console.error(`[QUERY ERROR] Failed to process query: ${err.message}`);
      socket.write(Buffer.from([ASTM.NAK]));
    }
  }
};

// ============================================================================
// FRAME TRANSMITTER - ASTM Stop-and-Wait State Machine
// ============================================================================

const FrameTransmitter = {
  /**
   * Send next frame from queue using ASTM stop-and-wait flow control
   * Only sends if:
   * 1. Not currently waiting for ACK
   * 2. Frame queue is not empty
   */
  sendNextFrame(socket, sessionState) {
    const frameToSend = sessionState.getNextFrameToSend();
    
    if (!frameToSend) {
      console.log(`[TRANSMITTER] No frame to send or waiting for ACK`);
      return;
    }
    
    try {
      // Build frame with current sequence number
      const frameBuffer = ASTMFrame.build(frameToSend.recordContent, frameToSend.frameNumber);
      
      console.log(`[TRANSMITTER] Sending frame FN=${frameToSend.frameNumber} (${frameToSend.recordContent.substring(0, 30)}...)`);
      console.log(`[TRANSMITTER] Frame hex: ${frameBuffer.toString('hex')}`);
      
      // Send frame
      socket.write(frameBuffer);
      
      // Mark that we're waiting for ACK before sending next frame (stop-and-wait)
      sessionState.waitForAck(frameToSend);
      
      console.log(`[TRANSMITTER] Waiting for ACK before next frame...`);
    } catch (err) {
      console.error(`[TRANSMITTER ERROR] Failed to send frame: ${err.message}`);
    }
  }
};



const ResultHandler = {
  async handle(visitId, sampleId, rawAstm, parsedData, machineName, orderData) {
    try {
      if (!visitId || !sampleId) {
        console.error(`[RESULT ERROR] Missing visitId or sampleId`);
        return;
      }

      const recordId = await Database.saveResult(visitId, sampleId, machineName, rawAstm, parsedData, orderData);
      const payload = this.buildPayload(visitId, sampleId, parsedData, machineName, orderData);
      await ResultSync.sync(recordId, payload);
    } catch (err) {
      console.error(`[RESULT ERROR] ${err.message}`);
    }
  },

  buildPayload(visitId, sampleId, parsedData, machineName, orderData = {}) {
    const results = [];
    const testMap = {};

    // Convert to flat structure: testCode -> parameters -> { paramCode: value }
    for (const [testCode, resultData] of Object.entries(parsedData.parameters || {})) {
      if (!testCode) {
        continue;
      }

      if (!testMap[testCode]) {
        testMap[testCode] = {
          testCode: testCode,
          parameters: {}
        };
      }

      // Store just the value string, not the entire object
      testMap[testCode].parameters[testCode] = resultData.value || '';
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
      patientId: orderData.patientId || parsedData.patientId || '',
      patientName: orderData.patientName || parsedData.patientName || '',
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
    
    // Create per-connection session state for ASTM stop-and-wait
    const sessionState = ConnectionState.create();
    
    let buffer = '';

    socket.on('data', async data => {
      if (data.length === 1 && data[0] === ASTM.ENQ) {
        console.log('[TCP] Received ENQ, sending ACK');
        socket.write(Buffer.from([ASTM.ACK]));
        return;
      }

      if (data.length === 1 && data[0] === ASTM.ACK) {
        console.log('[TCP] Received ACK from machine');
        
        // Mark ACK as received in session state
        sessionState.ackReceived();
        
        // Send next frame from queue (ASTM stop-and-wait)
        FrameTransmitter.sendNextFrame(socket, sessionState);
        return;
      }

      if (data.length === 1 && data[0] === ASTM.NAK) {
        console.error('[TCP] Received NAK from machine - frame rejected');
        return;
      }

      // Add to buffer
      buffer += data.toString('utf8');
      console.log(`[TCP RAW] Received (${data.length} bytes): ${data.toString('hex')}`);
      console.log(`[TCP BUFFER] Total buffer length: ${buffer.length}`);
      
      // Process frames one by one
      while (buffer.includes(String.fromCharCode(ASTM.STX))) {
        const stxIndex = buffer.indexOf(String.fromCharCode(ASTM.STX));
        const etxIndex = buffer.indexOf(String.fromCharCode(ASTM.ETX), stxIndex);
        
        if (etxIndex === -1) {
          console.log(`[TCP FRAME] Incomplete frame (no ETX), waiting for more data...`);
          break;
        }

        // Extract frame (STX to ETX + 2 checksum hex chars)
        const requiredLength = etxIndex + 3;
        if (buffer.length < requiredLength) {
          console.log(`[TCP FRAME] Incomplete checksum, waiting for more data...`);
          break;
        }

        const rawFrame = buffer.substring(stxIndex, requiredLength);
        console.log(`[TCP FRAME] Raw frame (with STX/ETX): "${rawFrame}"`);

        // Clean frame content: extract from STX to ETX
        // Format per ASTM E1381-97: STX FN record CR ETX checksum
        // We need to extract: FN record CR (everything between STX and ETX)
        let frameContent = rawFrame.substring(1);  // Remove STX
        const innerEtxIndex = frameContent.indexOf(String.fromCharCode(ASTM.ETX));
        let checksumFromFrame = '';
        
        if (innerEtxIndex !== -1) {
          checksumFromFrame = frameContent.substring(innerEtxIndex + 1);
          frameContent = frameContent.substring(0, innerEtxIndex);  // FN record CR
        }
        
        console.log(`[TCP FRAME] Cleaned frame content (FN+record+CR): "${frameContent}"`);

        // Validate checksum (includes FN, record, and CR)
        const calculatedChecksum = ASTMFrame.checksum(frameContent);
        const isValidChecksum = checksumFromFrame.toUpperCase() === calculatedChecksum;
        console.log(`[TCP FRAME] Checksum validation: calculated=${calculatedChecksum}, received=${checksumFromFrame.toUpperCase()}, valid=${isValidChecksum}`);

        if (!isValidChecksum) {
          console.error(`[TCP FRAME] ❌ INVALID CHECKSUM - Sending NAK`);
          socket.write(Buffer.from([ASTM.NAK]));
          
          // FIXED: Slice from stxIndex + requiredLength to avoid leading noise bytes
          buffer = buffer.substring(stxIndex + requiredLength);
          continue;
        }

        // Parse the frame
        const parsed = ASTMParser.parse(frameContent);
        console.log(`[TCP FRAME] Parsed: frameType=${parsed.frameType}`);

        // Handle different frame types
        if (parsed.frameType === 'HEADER') {
          sessionState.machineAnalyzer = parsed.analyzer || 'EM200';
          console.log(`[TCP FRAME] Machine analyzer set to: ${sessionState.machineAnalyzer}`);
          socket.write(Buffer.from([ASTM.ACK]));
        } 
        else if (parsed.frameType === 'QUERY') {
          sessionState.visitId = parsed.visitId;
          sessionState.sampleId = parsed.sampleId;
          console.log(`[TCP FRAME] Query received: visitId=${sessionState.visitId}, sampleId=${sessionState.sampleId}`);
          
          // Send ACK for query frame first
          socket.write(Buffer.from([ASTM.ACK]));
          
          // Then process query and enqueue ORDER/TERMINATOR frames
          await QueryHandler.handle(
            sessionState.visitId, 
            sessionState.sampleId, 
            sessionState.machineAnalyzer || 'EM200', 
            socket,
            sessionState,
            (orderData) => {
              // Store order data for later use in ResultHandler
              sessionState.currentOrderData = orderData;
            }
          );
        } 
        else if (parsed.frameType === 'ORDER') {
          sessionState.sampleId = parsed.sampleId;
          console.log(`[TCP FRAME] Order received: sampleId=${sessionState.sampleId}`);
          socket.write(Buffer.from([ASTM.ACK]));
        } 
        else if (parsed.frameType === 'PATIENT') {
          // Extract patientId from PATIENT frame
          if (parsed.patientId) {
            sessionState.visitId = parsed.patientId;
          }
          console.log(`[TCP FRAME] Patient frame: patientId=${parsed.patientId}`);
          socket.write(Buffer.from([ASTM.ACK]));
        } 
        else if (parsed.frameType === 'RESULT') {
          // Accumulate result frames
          Object.assign(sessionState.accumulatedResults, parsed.parameters);
          console.log(`[TCP FRAME] Result accumulated for testCode=${parsed.testCode}`);
          socket.write(Buffer.from([ASTM.ACK]));
        } 
        else if (parsed.frameType === 'COMMENT') {
          console.log(`[TCP FRAME] Comment: ${parsed.comments.join(', ')}`);
          socket.write(Buffer.from([ASTM.ACK]));
        } 
        else if (parsed.frameType === 'TERMINATOR') {
          console.log(`[TCP FRAME] Terminator received - processing accumulated results`);
          
          if (sessionState.visitId && sessionState.sampleId && Object.keys(sessionState.accumulatedResults).length > 0) {
            const parsedPayload = {
              visitId: sessionState.visitId,
              sampleId: sessionState.sampleId,
              analyzer: sessionState.machineAnalyzer || 'EM200',
              parameters: sessionState.accumulatedResults
            };

            await ResultHandler.handle(
              sessionState.visitId, 
              sessionState.sampleId, 
              frameContent, 
              parsedPayload, 
              sessionState.machineAnalyzer || 'EM200', 
              sessionState.currentOrderData
            );
          }

          socket.write(Buffer.from([ASTM.ACK]));
          
          // Reset session state for next message sequence
          sessionState.reset();
        } 
        else {
          console.warn(`[TCP FRAME] Unknown frame type: ${parsed.frameType}`);
          socket.write(Buffer.from([ASTM.ACK]));
        }

        // Remove processed frame from buffer (FIXED: use stxIndex + requiredLength)
        buffer = buffer.substring(stxIndex + requiredLength);
        console.log(`[TCP BUFFER] Remaining buffer (${buffer.length} bytes)`);
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
// STARTUP & SHUTDOWN
// ============================================================================

async function startup() {
  try {
    // Test database connection
    console.log('[STARTUP] Testing database connection...');
    const connection = await dbPool.getConnection();
    await connection.ping();
    connection.release();
    console.log('[STARTUP] ✓ Database connected');

    // Create TCP server
    const server = createTcpServer();
    server.listen(CONFIG.tcp.port, CONFIG.tcp.host, () => {
      console.log(`[STARTUP] ✓ Erba EM 200 TCP Server listening on ${CONFIG.tcp.host}:${CONFIG.tcp.port}`);
    });

    // Start retry worker
    const retryWorker = setInterval(() => {
      ResultSync.retryOfflineRecords().catch(err => {
        console.error('[RETRY WORKER] Error:', err.message);
      });
    }, CONFIG.retry.intervalMs);

    // Health check interval
    const healthCheckInterval = setInterval(async () => {
      try {
        const stats = await Database.getStats();
        console.log('[HEALTH CHECK] Database stats:', stats);
      } catch (err) {
        console.error('[HEALTH CHECK] Error:', err.message);
      }
    }, 60000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      shutdown(retryWorker, healthCheckInterval);
    });

    console.log('[STARTUP] ✅ Erba EM 200 Agent is ready!');

  } catch (err) {
    console.error(`[STARTUP ERROR] ${err.message}`);
    process.exit(1);
  }
}

async function shutdown(retryWorker, healthCheckInterval) {
  console.log('[SHUTDOWN] Graceful shutdown initiated...');
  
  try {
    clearInterval(retryWorker);
    clearInterval(healthCheckInterval);
    
    await dbPool.end();
    console.log('[SHUTDOWN] Database pool closed');
    
    console.log('[SHUTDOWN] ✓ Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error(`[SHUTDOWN ERROR] ${err.message}`);
    process.exit(1);
  }
}

// ============================================================================
// MAIN
// ============================================================================

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       Erba EM 200 Local Agent - ASTM Protocol Bridge          ║
║                    Clinical Chemistry Analyzer                 ║
╚═══════════════════════════════════════════════════════════════╝

📋 Configuration:
   TCP Port: ${CONFIG.tcp.port}
   Database: ${CONFIG.database.host}:${CONFIG.database.port}/${CONFIG.database.database}
   VPS: ${CONFIG.vps.baseUrl}
   Retry Interval: ${CONFIG.retry.intervalMs}ms
   
🔗 Supported Tests: ALT, AST, ALB, ALP, AMY, BIL-T, BIL-D, BUN, CREA, CHOL, TRIG, HDL, LDL, TP, UA, GLU, LDH, CK-MB, Na, K, Cl, Li

🚀 Starting agent...
`);

startup().catch(err => {
  console.error('[STARTUP CRITICAL ERROR]', err);
  process.exit(1);
});
