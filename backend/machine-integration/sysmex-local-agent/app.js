import net from 'net';
import mysql from 'mysql2/promise';
import axios from 'axios';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  tcp: {
    port: parseInt(process.env.TCP_PORT || '5100'),
    host: '0.0.0.0'
  },
  vps: {
    baseUrl: process.env.VPS_TAILSCALE_URL || 'http://localhost:3000'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'LocalLabPass123!',
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
  checksum(content) {
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum ^= content.charCodeAt(i);
    }
    return sum.toString(16).padStart(2, '0').toUpperCase();
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
   * Parse ASTM transmission and identify frame type
   */
  parse(rawText) {
    const lines = rawText.split(/\r?\n|\r/);
    let frameType = null;
    let visitId = null;
    let sampleId = null;
    let testCode = null;
    let analyzer = null;
    let parameters = {};

    for (const line of lines) {
      // Header frame: H|\\^&\|^Machine^Model^SerialNo
      if (line.startsWith('H|')) {
        const parts = line.split('\\');
        if (parts.length > 1) {
          // Extract machine^model from header
          // Format: H|delimiter|machine^model^serial or similar
          const headerFields = parts[1].split('|');
          if (headerFields.length >= 2) {
            analyzer = headerFields[1]?.trim() || null;
          }
        }
      }

      // Query frame: Q|1|visitId|sampleId
      if (line.startsWith('Q|')) {
        frameType = 'QUERY';
        const parts = line.split('|');
        visitId = parts[2]?.trim() || null;
        sampleId = parts[3]?.trim() || null;
        break;
      }

      // Result frame: R|seq|testCode|paramCode|value|unit|status
      if (line.startsWith('R|')) {
        frameType = 'RESULT';
        const parts = line.split('|');
        if (parts.length >= 5) {
          testCode = parts[2]?.trim() || '';
          const paramCode = parts[3]?.trim() || '';
          const value = parts[4]?.trim() || '';

          // Store as testCode_paramCode for clarity
          const key = `${testCode}_${paramCode}`;
          parameters[key] = value;
        }
      }

      if (line.startsWith('L|')) {
        if (!frameType) frameType = 'TERMINATOR';
      }
    }

    return {
      frameType: frameType || 'UNKNOWN',
      visitId,
      sampleId,
      analyzer,
      testCode,
      timestamp: new Date().toISOString(),
      parameters
    };
  }
};

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

const Database = {
  async saveResult(visitId, sampleId, rawAstm, parsedData) {
    try {
      const query = `
        INSERT INTO pending_results (sample_id, raw_astm, data_json, status)
        VALUES (?, ?, ?, 'PENDING')
      `;
      const [result] = await dbPool.execute(query, [sampleId, rawAstm, JSON.stringify(parsedData)]);
      return result.insertId;
    } catch (err) {
      console.error(`[DB ERROR] ${err.message}`);
      throw err;
    }
  },

  async markSynced(recordId) {
    try {
      await dbPool.execute(
        `UPDATE pending_results SET status = 'SYNCED', synced_at = NOW() WHERE id = ?`,
        [recordId]
      );
    } catch (err) {
      console.error(`[DB ERROR] ${err.message}`);
    }
  },

  async markOfflineQueued(recordId) {
    try {
      await dbPool.execute(
        `UPDATE pending_results SET status = 'OFFLINE_QUEUED' WHERE id = ?`,
        [recordId]
      );
    } catch (err) {
      console.error(`[DB ERROR] ${err.message}`);
    }
  },

  async getPendingOffline() {
    try {
      const [rows] = await dbPool.execute(
        `SELECT id, data_json FROM pending_results WHERE status = 'OFFLINE_QUEUED' ORDER BY id ASC LIMIT ?`,
        [CONFIG.retry.batchSize]
      );
      return rows;
    } catch (err) {
      console.error(`[DB ERROR] ${err.message}`);
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
  }
};

// ============================================================================
// RESULT SYNC
// ============================================================================

const ResultSync = {
  async sync(recordId, payload) {
    try {
      await CloudAPI.sendResult(payload);
      await Database.markSynced(recordId);
    } catch (err) {
      await Database.markOfflineQueued(recordId);
    }
  },

  async retryOfflineRecords() {
    const records = await Database.getPendingOffline();
    if (records.length === 0) return;

    for (const record of records) {
      const payload = typeof record.data_json === 'string' 
        ? JSON.parse(record.data_json) 
        : record.data_json;
      await this.sync(record.id, payload);
    }
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
        socket.write(Buffer.from([ASTM.NAK]));
        return;
      }

      if (!analyzer) {
        console.error(`[QUERY ERROR] Missing analyzer name from ASTM header`);
        socket.write(Buffer.from([ASTM.NAK]));
        return;
      }

      const orderData = await CloudAPI.fetchOrder(visitId, sampleId, analyzer);

      if (!orderData.patientTests || !Array.isArray(orderData.patientTests)) {
        throw new Error('Backend response missing patientTests array');
      }

      if (orderData.patientTests.length === 0) {
        socket.write(Buffer.from([ASTM.NAK]));
        return;
      }

      const testCodes = orderData.patientTests
        .map(t => t.testCode)
        .filter(code => code)
        .join('^');

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

      socket.write(orderFrame);
      socket.write(Buffer.from([ASTM.ACK]));

      const terminator = ASTMFrame.terminator();
      socket.write(terminator);
      socket.write(Buffer.from([ASTM.ACK]));

    } catch (err) {
      console.error(`[QUERY ERROR] Failed to process query: ${err.message}`);
      socket.write(Buffer.from([ASTM.NAK]));
    }
  }
};

// ============================================================================
// RESULT HANDLER
// ============================================================================

const ResultHandler = {
  async handle(visitId, sampleId, rawAstm, parsedData) {
    try {
      if (!visitId || !sampleId) {
        console.error(`[RESULT ERROR] Missing visitId or sampleId`);
        return;
      }

      const recordId = await Database.saveResult(visitId, sampleId, rawAstm, parsedData);
      const payload = this.buildPayload(visitId, sampleId, parsedData);
      await ResultSync.sync(recordId, payload);
    } catch (err) {
      console.error(`[RESULT ERROR] ${err.message}`);
    }
  },

  buildPayload(visitId, sampleId, parsedData) {
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

    socket.on('data', async data => {
      if (data.length === 1 && data[0] === ASTM.ENQ) {
        socket.write(Buffer.from([ASTM.ACK]));
        return;
      }

      buffer += data.toString('utf8');
      socket.write(Buffer.from([ASTM.ACK]));

      if (data.includes('L|1|N') || data.includes('\x04')) {
        const parsed = ASTMParser.parse(buffer);

        if (parsed.frameType === 'QUERY') {
          await QueryHandler.handle(parsed.visitId, parsed.sampleId, parsed.analyzer, socket);
        } else if (parsed.frameType === 'RESULT' || parsed.frameType === 'UNKNOWN') {
          await ResultHandler.handle(parsed.visitId, parsed.sampleId, buffer, parsed);
        }

        buffer = '';
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

  // Health check function
  async function healthCheck() {
    try {
      const [rows] = await dbPool.execute('SELECT COUNT(*) as count FROM pending_results WHERE status = ?', ['OFFLINE_QUEUED']);
      const pendingCount = rows[0]?.count || 0;
      if (pendingCount > 0) {
        console.log(`[HEALTH] Warning: ${pendingCount} offline records pending sync`);
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
