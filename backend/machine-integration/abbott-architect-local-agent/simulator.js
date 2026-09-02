const net = require('net');

// ============================================================================
// ASTM PROTOCOL CONSTANTS
// ============================================================================

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
// CONFIGURATION
// ============================================================================

const CONFIG = {
  agentHost: 'localhost',
  agentPort: 5300,
  machineName: 'Abbott Architect i1000SR',
  barcode: '202608260001-2',         // Combined barcode: visitId-sampleTypeId
  timestamp: '20260826120000'
};

// ============================================================================
// ASTM FRAME BUILDER - MATCHES app.js EXACTLY
// ============================================================================

class AbbottASTMBuilder {
  // Calculate checksum per ASTM E1381
  // FIX #1: Include ETX (0x03) in the modulo-256 checksum calculation
  static checksum(content) {
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum += content.charCodeAt(i);
    }
    // Standard ASTM E1381 includes ETX (0x03) in the modulo-256 checksum
    sum += ASTM.ETX;
    return (sum % 256).toString(16).padStart(2, '0').toUpperCase();
  }

  // Build frame: <STX>[FrameNum][Data]<ETX>[Checksum]\r\n
  static build(content, frameNum = 1) {
    const validFrameNum = (frameNum % 8).toString();
    const frameContent = `${validFrameNum}${content}`;
    const cs = this.checksum(frameContent);
    const frame = `${String.fromCharCode(ASTM.STX)}${frameContent}${String.fromCharCode(ASTM.ETX)}${cs}\r\n`;
    return Buffer.from(frame, 'utf8');
  }

  // H: Header
  static header(frameNum = 1) {
    const content = `H|\\^&|||${CONFIG.machineName}|||||||P|1|${CONFIG.timestamp}`;
    return this.build(content, frameNum);
  }

  // Q: Query/Workstation Order (machine asks for tests)
  static query(barcode, frameNum = 1) {
    const content = `Q|1|^${barcode}^^^||ALL|||||1|0`;
    return this.build(content, frameNum);
  }

  // O: Order from simulator to agent (FIX #2: Proper format with test codes in Field 4)
  static order(testCodes, barcode, frameNum = 1) {
    // FIX #2: Field 4 is Universal Test ID with backslash delimiters
    // Format: O|seq|specimenId||^^^TestCode1\^^^TestCode2\...|||timestamp||||actionCode|...
    const formattedTests = testCodes 
      ? testCodes.split('^').map(code => `^^^${code.trim()}`).join('\\')
      : '';
    const orderTimestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 12);
    const content = `O|1|${barcode}||${formattedTests}|||${orderTimestamp}||||R||||||N||||||||||||||O`;
    return this.build(content, frameNum);
  }

  // R: Result (machine sends test results)
  // testCode = test shortName (e.g., "TFT")
  // paramCode = parameter code (e.g., "TSH", "FT4", "FT3")
  static result(testCode, paramCode, value, unit, refRange, resultFlag, timestamp, frameNum = 1) {
    // Format: R|seq|^^^paramCode^paramCode|value|unit|refRange|flag|...
    // This sends parameter-level results (agent will group by testCode from backend mapping)
    const content = `R|1|^^^${paramCode}^${paramCode}|${value}|${unit}|${refRange}|${resultFlag}|F||||${timestamp}|ARCH1234`;
    return this.build(content, frameNum);
  }

  // L: Terminator (end of transmission)
  static terminator(frameNum = 1) {
    const content = `L|1|N`;
    return this.build(content, frameNum);
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
  console.log(`ASCII: ${ascii.replace(/\u0002/g, '☻').replace(/\u0003/g, '♥').replace(/\r/g, '↵')}`);
  console.log(`${'='.repeat(100)}`);
}

function log(msg, type = 'INFO') {
  console.log(`[${new Date().toISOString()}] [${type}] ${msg}`);
}

// ============================================================================
// ABBOTT MACHINE SIMULATOR - ASTM/ASI PROTOCOL
// ============================================================================

class AbbottSimulator {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.frameNum = 1;
    this.testCodes = [];  // Extracted from ORDER frame (e.g., ["TFT"])
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

      this.socket.on('data', (data) => this.onData(data));
      this.socket.on('error', (err) => reject(err));
      this.socket.on('end', () => log(`Connection closed`, 'DISCONNECT'));

      setTimeout(() => {
        if (!this.connected) reject(new Error('Connection timeout'));
      }, 5000);
    });
  }

  /**
   * Handle all data from agent
   */
  onData(data) {
    // Control bytes
    if (data.length === 1) {
      const byte = data[0];
      if (byte === ASTM.ENQ) {
        log(`Received ENQ from agent (agent sending response)`, 'ENQ');
        this.socket.write(Buffer.from([ASTM.ACK]));
        log(`Sent ACK`, 'ACK');
        return;
      } else if (byte === ASTM.ACK) {
        log(`Received ACK from agent`, 'ACK');
        return;
      } else if (byte === ASTM.EOT) {
        log(`Received EOT from agent (end of transmission)`, 'EOT');
        return;
      } else if (byte === ASTM.NAK) {
        log(`Received NAK from agent (error)`, 'ERROR');
        return;
      }
    }

    // Data frames - parse and extract ORDER frame test codes
    if (data[0] === ASTM.STX) {
      this.parseFrame(data);
    }
  }

  /**
   * Parse ASTM frame to extract test codes from ORDER record
   */
  parseFrame(data) {
    logFrame('RECEIVED FROM AGENT', data);

    let ascii = data.toString('utf8');

    // Remove STX
    if (ascii.charCodeAt(0) === ASTM.STX) {
      ascii = ascii.substring(1);
    }

    // Remove ETX + checksum + CRLF
    const etxIndex = ascii.indexOf(String.fromCharCode(ASTM.ETX));
    if (etxIndex !== -1) {
      ascii = ascii.substring(0, etxIndex);
    }

    // Parse the record (frame number is first character)
    let content = ascii;
    if (content.length > 0 && /^\d/.test(content[0])) {
      content = content.substring(1);  // Strip frame number
    }

    const parts = content.split('|');
    const recordType = parts[0];

    log(`Parsed record type: ${recordType}`, 'FRAME');

    // ORDER frame: FIX #2: O|seq|visitId||^^^TestCode1\^^^TestCode2\...|||timestamp||||actionCode|...
    // After frame number stripped: O|1|visitId||^^^TestCode1\^^^TestCode2\...|||...
    // Field 4 (index 4) contains the Universal Test ID with backslash delimiters
    if (recordType === 'O') {
      log(`Received ORDER frame from agent`, 'ORDER');
      
      // FIX #2: Extract test codes from Field 4 (index 4)
      const field4 = parts[4]?.trim() || '';
      
      if (field4) {
        // Field 4 format: ^^^TestCode1\^^^TestCode2\...
        // Split by backslash, then extract codes between ^^^
        const testCodes = field4.split('\\').map(part => {
          // Remove leading ^^^ and extract the code
          const match = part.match(/\^\^\^([A-Z0-9]+)/);
          return match ? match[1] : part.trim();
        }).filter(code => code && code.length > 0);
        
        if (testCodes.length > 0) {
          this.testCodes = testCodes;
          log(`✓ Extracted test codes from Field 4: ${this.testCodes.join(', ')}`, 'TESTCODE');
        }
      }
      
      // Fallback: search other fields if Field 4 is empty
      if (this.testCodes.length === 0) {
        for (let i = 5; i < parts.length; i++) {
          const field = parts[i]?.trim() || '';
          if (field && field.includes('^')) {
            this.testCodes = field.split('^').filter(t => t.trim());
            break;
          }
          if (field && field.length > 0 && /^[A-Z]{2,}$/.test(field)) {
            this.testCodes = [field];
            break;
          }
        }
      }
      
      if (this.testCodes.length > 0) {
        log(`✓ Ready to send results for test: ${this.testCodes.join(', ')}`, 'TESTCODE');
      }
    }

    // Send ACK for data frame
    this.socket.write(Buffer.from([ASTM.ACK]));
    log(`Sent ACK for data frame`, 'ACK_DATA');
  }

  /**
   * Send frame with proper line bidding (ENQ/ACK/frame/ACK/EOT)
   */
  async sendFrameSequence(frameBuffer, description) {
    return new Promise((resolve, reject) => {
      let acksReceived = 0;
      const timeout = setTimeout(() => {
        reject(new Error('Line bidding timeout'));
      }, 5000);

      const originalHandler = this.socket.listeners('data')[0];
      this.socket.removeAllListeners('data');

      const ackHandler = (data) => {
        if (data.length === 1 && data[0] === ASTM.ACK) {
          acksReceived++;
          log(`Received ACK #${acksReceived}`, 'ACK');

          if (acksReceived === 1) {
            // ACK for ENQ, now send frame
            log(`Sending data frame...`, 'SEND');
            this.socket.write(frameBuffer);
          } else if (acksReceived === 2) {
            // ACK for frame, send EOT
            log(`Sending EOT...`, 'EOT');
            clearTimeout(timeout);
            this.socket.removeListener('data', ackHandler);
            this.socket.on('data', originalHandler);
            this.socket.write(Buffer.from([ASTM.EOT]));
            setTimeout(resolve, 300);
          }
        }
      };

      this.socket.on('data', ackHandler);

      logFrame('SENDING TO AGENT', frameBuffer, description);
      log(`Sending ENQ (line bid)...`, 'ENQ');
      this.socket.write(Buffer.from([ASTM.ENQ]));
    });
  }

  /**
   * Main simulation flow
   */
  async run() {
    try {
      log(`${'█'.repeat(100)}`, 'START');
      log(`ABBOTT ARCHITECT i1000SR SIMULATOR - ASTM/ASI PROTOCOL`, 'START');
      log(`${'█'.repeat(100)}`, 'START');
      log(`Machine: ${CONFIG.machineName}`, 'CONFIG');
      log(`Barcode: ${CONFIG.barcode}`, 'CONFIG');
      log('', 'INFO');

      // STEP 1: Send HEADER
      log(`STEP 1: Sending HEADER (machine identification)`, 'STEP');
      const headerFrame = AbbottASTMBuilder.header(this.frameNum++);
      await this.sendFrameSequence(headerFrame, 'HEADER');
      
      // Reset frame number after transaction
      this.frameNum = 1;

      // STEP 2: Send QUERY with barcode
      log(`STEP 2: Sending QUERY (asking for test orders)`, 'STEP');
      const queryFrame = AbbottASTMBuilder.query(CONFIG.barcode, this.frameNum++);
      await this.sendFrameSequence(queryFrame, 'QUERY');
      
      // Reset frame number after transaction
      this.frameNum = 1;

      // STEP 3: Wait for ORDER frame from agent
      log(`STEP 3: Waiting for agent's ORDER response...`, 'STEP');
      const orderReceived = await this.waitForTestCodes(10000);

      if (!orderReceived || this.testCodes.length === 0) {
        throw new Error('No test codes received from agent ORDER frame');
      }

      log(`✓ Ready to send results for test: ${this.testCodes.join(', ')}`, 'SUCCESS');

      // STEP 4: Send results
      log(`STEP 4: Sending results...`, 'STEP');

      // Map test codes to their parameters
      const testParameterMap = {
        'TFT': [  // Thyroid Function Tests
          { paramCode: 'TSH', value: '2.5', unit: 'uIU/mL', refRange: '0.35^4.94' },
          { paramCode: 'FT4', value: '1.5', unit: 'ng/dL', refRange: '0.8^1.8' },
          { paramCode: 'FT3', value: '3.5', unit: 'pg/mL', refRange: '2.3^4.2' }
        ],
        'HMG': [  // Hemogram (for reference)
          { paramCode: 'RBC', value: '4.8', unit: 'M/uL', refRange: '4.0^6.0' },
          { paramCode: 'HGB', value: '14.2', unit: 'g/dL', refRange: '12.0^16.0' },
          { paramCode: 'WBC', value: '7.5', unit: 'K/uL', refRange: '4.5^11.0' }
        ]
      };

      // Send results for each test code
      for (const testCode of this.testCodes) {
        const params = testParameterMap[testCode] || [];

        if (params.length === 0) {
          log(`⚠️  No parameters defined for test: ${testCode}`, 'WARNING');
          continue;
        }

        // Send each parameter as a separate result record with TEST CODE as identifier
        for (const param of params) {
          // IMPORTANT: Send result with TEST CODE (not parameter code) so backend groups correctly
          // Format: R|seq|^^^testCode^paramCode|value|...
          // This way backend knows: "testCode=TFT, paramCode=TSH, value=2.5"
          const resultContent = `R|1|^^^${testCode}^${param.paramCode}|${param.value}|${param.unit}|${param.refRange}|N|F||||${CONFIG.timestamp}|ARCH1234`;
          
          const validFrameNum = (this.frameNum % 8).toString();
          const frameContent = `${validFrameNum}${resultContent}`;
          const cs = AbbottASTMBuilder.checksum(frameContent);
          const frame = `${String.fromCharCode(ASTM.STX)}${frameContent}${String.fromCharCode(ASTM.ETX)}${cs}\r\n`;
          const resultFrame = Buffer.from(frame, 'utf8');

          log(`Sending result: ${testCode}/${param.paramCode} = ${param.value} ${param.unit}`, 'RESULT');
          await this.sendFrameSequence(resultFrame, `RESULT - ${testCode}/${param.paramCode}`);
          
          // Reset frame number after transaction
          this.frameNum = 1;
        }
      }

      // STEP 5: Send TERMINATOR
      log(`STEP 5: Sending TERMINATOR (end of results)`, 'STEP');
      const terminatorFrame = AbbottASTMBuilder.terminator(this.frameNum++);
      await this.sendFrameSequence(terminatorFrame, 'TERMINATOR');

      log(`✅ SIMULATION COMPLETE`, 'SUCCESS');
      log(`Results have been sent to agent for processing`, 'INFO');

    } catch (err) {
      log(`❌ Simulation failed: ${err.message}`, 'ERROR');
      throw err;
    }
  }

  /**
   * Wait for test codes to be extracted from ORDER frame
   */
  waitForTestCodes(timeoutMs = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.testCodes.length > 0) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n' + '█'.repeat(100));
  console.log('ABBOTT ARCHITECT i1000SR SIMULATOR - ASTM/ASI PROTOCOL');
  console.log('█'.repeat(100) + '\n');

  const simulator = new AbbottSimulator();

  try {
    await simulator.connect();
    await simulator.run();
  } catch (err) {
    log(`Fatal: ${err.message}`, 'FATAL');
    process.exit(1);
  }
}

main();
