const net = require('net');

// ============================================================================
// ASTM PROTOCOL CONSTANTS
// ============================================================================

const ASTM = {
  ENQ: 0x05,
  ACK: 0x06,
  NAK: 0x15,
  STX: 0x02,
  ETX: 0x03
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  host: 'localhost',
  port: 5100,
  machineId: 'Roche',
  machineModel: 'Cobas',
  visitId: '202607310001',
  sampleId: '5',  // Just the number, not the full barcode
  timestamp: '20260731183000'
};

// ============================================================================
// ASTM FRAME BUILDER
// ============================================================================

class ASTMBuilder {
  static checksum(content) {
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum ^= content.charCodeAt(i);
    }
    return sum.toString(16).padStart(2, '0').toUpperCase();
  }

  static frame(content) {
    const cs = this.checksum(content);
    const frame = `${String.fromCharCode(ASTM.STX)}${content}${String.fromCharCode(ASTM.ETX)}${cs}`;
    return Buffer.from(frame, 'utf8');
  }

  static header() {
    const content = `H|\\^&|||${CONFIG.machineId}^${CONFIG.machineModel}|||||||P|1|${CONFIG.timestamp}`;
    return this.frame(content);
  }

  static query(visitId, sampleId) {
    const content = `Q|1|${visitId}|${sampleId}`;
    return this.frame(content);
  }

  static result(testCode, paramCode, value, unit = '') {
    const content = `R|1|${testCode}|${paramCode}|${value}|${unit}||||N`;
    return this.frame(content);
  }

  static terminator() {
    const content = `L|1|N`;
    return this.frame(content);
  }
}

// ============================================================================
// LOGGER
// ============================================================================

function logFrame(direction, data, desc = '') {
  const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  const ascii = data.toString('utf8');
  
  console.log(`\n${'='.repeat(100)}`);
  console.log(`[${new Date().toISOString()}] ${direction} - ${desc}`);
  console.log(`${'='.repeat(100)}`);
  console.log(`HEX:   ${hex}`);
  console.log(`ASCII: ${ascii}`);
  console.log(`${'='.repeat(100)}`);
}

function log(msg, type = 'INFO') {
  console.log(`[${new Date().toISOString()}] [${type}] ${msg}`);
}

// ============================================================================
// MACHINE SIMULATOR - GETS REAL TEST CODES FROM AGENT
// ============================================================================

class MachineSimulator {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.testCodes = [];
    this.orderReceived = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      log(`Connecting to ${CONFIG.host}:${CONFIG.port}...`, 'CONNECT');
      
      this.socket = net.createConnection({
        host: CONFIG.host,
        port: CONFIG.port
      });

      this.socket.on('connect', () => {
        log(`✓ Connected to agent`, 'SUCCESS');
        this.connected = true;
        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('error', (err) => {
        log(`Connection error: ${err.message}`, 'ERROR');
        reject(err);
      });

      this.socket.on('end', () => {
        log(`Connection closed`, 'DISCONNECT');
      });

      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout - agent not responding'));
        }
      }, 5000);
    });
  }

  handleData(data) {
    if (data.length === 1) {
      const byte = data[0];
      if (byte === ASTM.ACK) {
        log('Received ACK', 'RESPONSE');
      } else if (byte === ASTM.NAK) {
        log('Received NAK (error)', 'ERROR');
      }
    } else {
      logFrame('RECEIVED FROM AGENT', data, 'Order Frame with Real Tests');
      let ascii = data.toString('utf8');
      
      // Strip ASTM frame markers (STX, ETX, checksum)
      if (ascii.charCodeAt(0) === ASTM.STX) {
        ascii = ascii.substring(1);
      }
      
      const etxIndex = ascii.indexOf(String.fromCharCode(ASTM.ETX));
      if (etxIndex !== -1) {
        ascii = ascii.substring(0, etxIndex);
      }
      
      log(`Cleaned frame: ${ascii}`, 'RESPONSE');
      
      // Parse ORDER frame to extract REAL test codes
      if (ascii.includes('O|')) {
        log('🎯 PARSING ORDER FRAME - Extracting REAL test codes from backend database', 'PARSE');
        
        const parts = ascii.split('|');
        if (parts.length > 11) {
          const testCodesStr = (parts[11] || '').trim();
          this.testCodes = testCodesStr.split('^').filter(t => t.trim());
          
          if (this.testCodes.length > 0) {
            log(`✓ REAL test codes from backend database:`, 'SUCCESS');
            this.testCodes.forEach(tc => {
              log(`  → ${tc}`, 'TESTCODE');
            });
            this.orderReceived = true;
          } else {
            log('⚠️  No test codes found in order frame', 'WARNING');
          }
        }
      }
    }
  }

  async sendFrame(frameData, description) {
    logFrame('SENDING TO AGENT', frameData, description);
    return new Promise((resolve) => {
      this.socket.write(frameData);
      setTimeout(resolve, 500);
    });
  }

  async run() {
    try {
      log('═'.repeat(100), 'START');
      log(`REAL MACHINE SIMULATOR - GETS TEST CODES FROM BACKEND`, 'START');
      log('═'.repeat(100), 'START');
      log(`Machine: ${CONFIG.machineId} ${CONFIG.machineModel}`, 'CONFIG');
      log(`Sample Barcode: ${CONFIG.visitId}-${CONFIG.sampleId}`, 'CONFIG');
      log('', 'CONFIG');

      // Step 1: Send Header
      log('STEP 1: Machine identifies itself to agent', 'STEP');
      const headerFrame = ASTMBuilder.header();
      await this.sendFrame(headerFrame, 'Header - Machine identification');
      
      // Step 2: Send Query (barcode scanned - ask for real test orders from backend)
      log('STEP 2: 🔍 Technician scans tube barcode → Machine queries agent', 'STEP');
      log(`Asking: "What tests should I run for sample ${CONFIG.visitId}-${CONFIG.sampleId}?"`, 'ACTION');
      const queryFrame = ASTMBuilder.query(CONFIG.visitId, CONFIG.sampleId);
      await this.sendFrame(queryFrame, 'Query - Machine asks for test orders');

      // Step 3: Wait for ORDER response with REAL test codes
      log('STEP 3: ⏳ Waiting for agent to fetch test codes from backend database...', 'STEP');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify we got real test codes
      if (!this.orderReceived || this.testCodes.length === 0) {
        log('⚠️  ERROR: No real test codes received!', 'ERROR');
        log('Possible reasons:', 'ERROR');
        log('  1. Backend API not responding (http://localhost:3351)', 'ERROR');
        log('  2. Sample barcode not found in database', 'ERROR');
        log('  3. No tests configured for this sample', 'ERROR');
        log('  4. Check agent console for [CLOUD ERROR] messages', 'ERROR');
        throw new Error('No test codes from agent');
      }

      // Step 4: Send REAL Results based on actual test codes from backend
      log(`STEP 4: ✓ Running tests for ${this.testCodes.length} actual test(s)`, 'STEP');
      log('Generating results based on real backend test codes...', 'ACTION');
      
      const allResults = this.generateResultsForTests(this.testCodes);
      
      for (const r of allResults) {
        const resultFrame = ASTMBuilder.result(r.test, r.param, r.value, r.unit);
        log(`  → ${r.test}/${r.param} = ${r.value} ${r.unit}`, 'RESULT');
        await this.sendFrame(resultFrame, `Real Result - ${r.test}/${r.param}`);
      }

      // Step 5: Send Terminator
      log('STEP 5: 🏁 Transmission complete', 'STEP');
      const terminatorFrame = ASTMBuilder.terminator();
      await this.sendFrame(terminatorFrame, 'Terminator - End of transmission');

      log('✓ SUCCESS! Real data from backend processed completely.', 'SUCCESS');

    } catch (err) {
      log(`❌ Simulation failed: ${err.message}`, 'ERROR');
    } finally {
      setTimeout(() => {
        if (this.socket) this.socket.end();
      }, 1000);
    }
  }

  // Generate realistic results for ACTUAL test codes from backend (shortNames like CBC, PLT, etc.)
  generateResultsForTests(testCodes) {
    const resultMap = {
      'CBC': [
        { param: 'WBC', value: '7.5', unit: '10^3/uL' },
        { param: 'RBC', value: '5.2', unit: '10^6/uL' },
        { param: 'HGB', value: '15.5', unit: 'g/dL' }
      ],
      'HGB': [
        { param: 'HCT', value: '46.5', unit: '%' },
        { param: 'MCV', value: '89.2', unit: 'fL' },
        { param: 'MCH', value: '29.8', unit: 'pg' }
      ],
      'BG': [
        { param: 'MCHC', value: '33.5', unit: 'g/dL' },
        { param: 'PLT', value: '250', unit: '10^3/uL' }
      ],
      'PLT': [
        { param: 'RET', value: '1.2', unit: '%' }
      ],
      'PT': [
        { param: 'PT_INR', value: '1.1', unit: 'INR' }
      ],
      'APTT': [
        { param: 'APTT_SEC', value: '28.5', unit: 'sec' }
      ],
      'RET': [
        { param: 'RET_PERCENT', value: '1.5', unit: '%' }
      ],
      'GLU': [
        { param: 'GLUCOSE', value: '95', unit: 'mg/dL' }
      ],
      'GLU_RDM': [
        { param: 'GLUCOSE', value: '105', unit: 'mg/dL' }
      ],
      'RFT': [
        { param: 'BUN', value: '18', unit: 'mg/dL' },
        { param: 'CREATININE', value: '0.95', unit: 'mg/dL' },
        { param: 'NA', value: '140', unit: 'mmol/L' }
      ],
      'LFT': [
        { param: 'ALT', value: '35', unit: 'U/L' },
        { param: 'AST', value: '32', unit: 'U/L' },
        { param: 'ALP', value: '68', unit: 'U/L' }
      ],
      'LIPID': [
        { param: 'TOTAL_CHOL', value: '180', unit: 'mg/dL' },
        { param: 'LDL', value: '110', unit: 'mg/dL' },
        { param: 'HDL', value: '45', unit: 'mg/dL' }
      ],
      'ELEC': [
        { param: 'K', value: '4.2', unit: 'mmol/L' },
        { param: 'CL', value: '105', unit: 'mmol/L' }
      ],
      'TSH': [
        { param: 'TSH', value: '2.1', unit: 'mIU/L' }
      ],
      'BCULTURE': [
        { param: 'GROWTH', value: 'No Growth', unit: '' }
      ],
      'UCULTURE': [
        { param: 'GROWTH', value: 'No Growth', unit: '' }
      ],
      'SCULTURE': [
        { param: 'GROWTH', value: 'No Growth', unit: '' }
      ],
      'WCULTURE': [
        { param: 'GROWTH', value: 'No Growth', unit: '' }
      ]
    };

    const results = [];
    for (const testCode of testCodes) {
      const testResults = resultMap[testCode];
      if (testResults) {
        for (const res of testResults) {
          results.push({
            test: testCode,
            param: res.param,
            value: res.value,
            unit: res.unit
          });
        }
      } else {
        log(`  ⚠️  No result template for shortName: ${testCode}`, 'WARNING');
      }
    }
    return results;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n' + '█'.repeat(100));
  console.log('SYSMEX MACHINE SIMULATOR v2 - REAL BACKEND DATA');
  console.log('█'.repeat(100) + '\n');

  const simulator = new MachineSimulator();

  try {
    await simulator.connect();
    await simulator.run();
  } catch (err) {
    log(`Fatal: ${err.message}`, 'FATAL');
    process.exit(1);
  }
}

main();
