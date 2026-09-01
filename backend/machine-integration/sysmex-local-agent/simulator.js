const net = require('net');
const http = require('http');

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
  agentHost: '127.0.0.1',
  agentPort: 5100,
  machineName: 'Sysmex XN-350',  // ✅ ONE field - complete machine name
  barcode: '202608200002-1',         // ✅ Combined barcode: visitId-sampleTypeId
  timestamp: '20260820190000'
};

// ============================================================================
// ASTM FRAME BUILDER
// ============================================================================

class ASTMBuilder {
  // ✅ FIX: Use Modulo-256 additive checksum per ASTM E1381 standard (not XOR)
  static checksum(content) {
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum += content.charCodeAt(i);  // ✅ CHANGED: Additive sum (was XOR)
    }
    return (sum % 256).toString(16).padStart(2, '0').toUpperCase();  // ✅ CHANGED: Modulo-256
  }

  static frame(content) {
    const cs = this.checksum(content);
    const frame = `${String.fromCharCode(ASTM.STX)}${content}${String.fromCharCode(ASTM.ETX)}${cs}`;
    return Buffer.from(frame, 'utf8');
  }

  static header() {
    const content = `H|\\^&|||${CONFIG.machineName}|||||||P|1|${CONFIG.timestamp}`;
    return this.frame(content);
  }

  static query(barcode) {
    const content = `Q|1|${barcode}`;
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
// MACHINE SIMULATOR - ONLY TALKS TO LOCAL AGENT VIA ASTM
// ============================================================================

class MachineSimulator {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.testCodes = [];  // ✅ Store test codes received from ORDER frame
  }

  connect() {
    return new Promise((resolve, reject) => {
      log(`Connecting to Local Agent ${CONFIG.agentHost}:${CONFIG.agentPort}...`, 'CONNECT');
      
      this.socket = net.createConnection({
        host: CONFIG.agentHost,
        port: CONFIG.agentPort
      });

      this.socket.on('connect', () => {
        log(`✓ Connected to Local Agent`, 'SUCCESS');
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
        log(`Connection closed by agent`, 'DISCONNECT');
      });

      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout - Local Agent not responding on port 5100'));
        }
      }, 5000);
    });
  }

  handleData(data) {
    if (data.length === 1) {
      const byte = data[0];
      if (byte === ASTM.ACK) {
        log('Received ACK from agent', 'RESPONSE');
      } else if (byte === ASTM.NAK) {
        log('Received NAK from agent (error)', 'ERROR');
      }
    } else {
      logFrame('RECEIVED FROM LOCAL AGENT', data);
      
      // ✅ Parse ORDER frame to extract test codes
      let ascii = data.toString('utf8');
      
      // Strip ASTM frame markers
      if (ascii.charCodeAt(0) === ASTM.STX) {
        ascii = ascii.substring(1);
      }
      
      const etxIndex = ascii.indexOf(String.fromCharCode(ASTM.ETX));
      if (etxIndex !== -1) {
        ascii = ascii.substring(0, etxIndex);
      }
      
      // ✅ FIXED: Parse ORDER frame - Original Sysmex format
      // Format: O|seq|visitId|patientId|patientName||priority|||||testCodes
      // Test codes are at Field 11 (index 11), separated by ^
      if (ascii.includes('O|')) {
        const parts = ascii.split('|');
        
        // Test codes are at position 11, separated by ^
        const testCodesStr = (parts[11] || '').trim();
        this.testCodes = testCodesStr
          .split('^')
          .map(code => code.trim())
          .filter(code => code.length > 0);
        
        if (this.testCodes.length > 0) {
          log('✓ Extracted test codes from ORDER frame:', 'RESPONSE');
          this.testCodes.forEach(tc => {
            log(`  → ${tc}`, 'TESTCODE');
          });
        }
      }
    }
  }

  async sendFrame(frameData, description) {
    logFrame('SENDING TO LOCAL AGENT', frameData, description);
    return new Promise((resolve) => {
      this.socket.write(frameData);
      setTimeout(resolve, 500);
    });
  }

  async run() {
    try {
      log('═'.repeat(100), 'START');
      log(`🏥 MACHINE SIMULATOR - PURE ASTM PROTOCOL ONLY`, 'START');
      log('═'.repeat(100), 'START');
      log(`Machine Name: ${CONFIG.machineName}`, 'CONFIG');
      log(`Barcode (visitId-sampleTypeId): ${CONFIG.barcode}`, 'CONFIG');
      log(`Connecting to Local Agent: ${CONFIG.agentHost}:${CONFIG.agentPort}`, 'CONFIG');
      log('', 'CONFIG');
      log('NOTE: Machine will ONLY talk to Local Agent via ASTM protocol', 'INFO');
      log('      Local Agent handles ALL backend communication', 'INFO');
      log('', 'INFO');

      // ===== MACHINE BEHAVIOR =====

      // STEP 1: Machine powers on, sends HEADER to identify itself
      log('STEP 1: Machine powers on and identifies itself', 'STEP');
      log(`Action: Send HEADER frame with machine name "${CONFIG.machineName}"`, 'ACTION');
      const headerFrame = ASTMBuilder.header();
      await this.sendFrame(headerFrame, 'HEADER - Machine identification');
      
      // STEP 2: Barcode is scanned at machine (tube with patient sample)
      //         Machine asks local agent: "What tests should I run for this barcode?"
      log('STEP 2: Barcode scanned at machine', 'STEP');
      log(`Action: Send QUERY frame asking agent for tests`, 'ACTION');
      log(`        barcode=${CONFIG.barcode}`, 'ACTION');
      const queryFrame = ASTMBuilder.query(CONFIG.barcode);
      await this.sendFrame(queryFrame, 'QUERY - Machine asks "What tests to run?"');

      // STEP 3: Wait for agent to respond with ORDER
      //         Local agent fetches from backend and sends back ORDER
      log('STEP 3: Waiting for Local Agent to respond with test orders', 'STEP');
      log('        (Agent queries backend, gets test codes, sends ORDER frame)', 'ACTION');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // ✅ Check if we got test codes from ORDER frame
      if (this.testCodes.length === 0) {
        log('❌ ERROR: No test codes received from ORDER frame!', 'ERROR');
        log('Possible reasons:', 'ERROR');
        log('  1. Backend not responding', 'ERROR');
        log('  2. No tests assigned to this machine', 'ERROR');
        log('  3. Barcode not found in database', 'ERROR');
        throw new Error('No test codes received from agent');
      }

      // STEP 4: Machine processes samples (runs tests)
      //         Generates RESULT frames with fake data (would be real from analyzer)
      log('STEP 4: Machine processes samples (simulating test execution)', 'STEP');
      log(`        Running ${this.testCodes.length} test(s): ${this.testCodes.join(', ')}`, 'ACTION');
      
      // ✅ Generate results for EACH test code received from ORDER frame
      const allResults = [];
      
      // Define parameters for each test code - maps test shortName to parameter list
      // ⚠️ IMPORTANT: Only include parameters that are configured in the database!
      const testParametersMap = {
        'HMG': [      // ✅ Hemogram (short name from backend)
          // All parameters configured in database for HMG test
          { paramCode: 'RBC', value: '4.8', unit: 'M/uL' },
          { paramCode: 'HGB', value: '14.2', unit: 'g/dL' },
          { paramCode: 'WBC', value: '7.5', unit: 'K/uL' },
          { paramCode: 'PLT', value: '250', unit: 'K/uL' },
          { paramCode: 'MCV', value: '87.5', unit: 'fL' },
          { paramCode: 'MCH', value: '29.5', unit: 'pg' },
          { paramCode: 'MCHC', value: '33.7', unit: 'g/dL' },
        ],
        'HEM001': [   // Keep for backward compatibility
          { paramCode: 'WBC', value: '7.5', unit: 'K/uL' },
          { paramCode: 'RBC', value: '4.8', unit: 'M/uL' },
          { paramCode: 'HGB', value: '14.2', unit: 'g/dL' },
          { paramCode: 'HCT', value: '42.0', unit: '%' },
          { paramCode: 'MCV', value: '87.5', unit: 'fL' },
          { paramCode: 'MCH', value: '29.5', unit: 'pg' },
          { paramCode: 'MCHC', value: '33.7', unit: 'g/dL' },
          { paramCode: 'PLT', value: '250', unit: 'K/uL' },
        ]
      };
      
      for (const testCode of this.testCodes) {
        log(`🧪 Generating results for test: ${testCode}`, 'RESULT_GEN');
        
        const params = testParametersMap[testCode] || [];
        
        if (params.length === 0) {
          log(`  ⚠️  No parameters defined for test code: ${testCode}`, 'WARNING');
          log(`     Available test codes: ${Object.keys(testParametersMap).join(', ')}`, 'WARNING');
          continue;
        }

        for (const param of params) {
          allResults.push({
            testCode: testCode,
            paramCode: param.paramCode,
            value: param.value,
            unit: param.unit
          });
        }
      }

      log(`Sending ${allResults.length} result parameters...`, 'ACTION');
      log(`     (Using test code(s) from backend: ${this.testCodes.join(', ')})`, 'ACTION');
      
      for (const result of allResults) {
        const resultFrame = ASTMBuilder.result(result.testCode, result.paramCode, result.value, result.unit);
        log(`  → ${result.testCode}/${result.paramCode} = ${result.value} ${result.unit}`, 'RESULT');
        await this.sendFrame(resultFrame, `RESULT - ${result.paramCode}`);
      }

      // STEP 5: Machine signals end of transmission
      log('STEP 5: Transmission complete', 'STEP');
      log('        Machine sends TERMINATOR frame', 'ACTION');
      const terminatorFrame = ASTMBuilder.terminator();
      await this.sendFrame(terminatorFrame, 'TERMINATOR - End of transmission');

      log('', 'INFO');
      log('✅ SIMULATION COMPLETE', 'SUCCESS');
      log('Local Agent now:', 'INFO');
      log('  1. Processes results received from machine', 'INFO');
      log('  2. Saves to local database', 'INFO');
      log('  3. Syncs to backend (http://localhost:3351)', 'INFO');
      log('', 'INFO');

    } catch (err) {
      log(`❌ Simulation failed: ${err.message}`, 'ERROR');
      log('Make sure Local Agent is running: node app.js', 'ERROR');
    } finally {
      setTimeout(() => {
        if (this.socket) this.socket.end();
      }, 1000);
    }
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
