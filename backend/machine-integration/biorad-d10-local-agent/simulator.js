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
  ETB: 0x17,  // End of Text Block (multi-frame)
  EOT: 0x04,  // End of Transmission
  CR: 0x0D,
  LF: 0x0A
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  agentHost: 'localhost',
  agentPort: 5200,  // ✅ Bio-Rad D-10 uses port 5200
  machineName: 'Bio-Rad D-10',  // ✅ Complete machine name (like Sysmex)
  visitId: '202608110003',  // ✅ Correct visit ID
  sampleId: '2',  // ✅ Sample type ID (2 = Serum, NOT 1)
  timestamp: '20260810113000',  // YYYYMMDDHHMMSS
  a1cValue: '6.8',  // HbA1c result value
  a1cUnit: '%',
  a1cRefRange: '4.0-6.0',
  a1cFlag: 'N'  // N=Normal, H=High, L=Low
};

// ============================================================================
// ASTM FRAME BUILDER
// ============================================================================

class ASTMBuilder {
  static checksum(content) {
    // ✅ Modulo-256 additive checksum (ASTM E1381 standard)
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum += content.charCodeAt(i);
    }
    return (sum % 256).toString(16).padStart(2, '0').toUpperCase();
  }

  static frame(content, useETB = false) {
    const checksum = this.checksum(content);
    const terminator = useETB ? String.fromCharCode(ASTM.ETB) : String.fromCharCode(ASTM.ETX);
    const frame = `${String.fromCharCode(ASTM.STX)}${content}${terminator}${checksum}\r\n`;
    return Buffer.from(frame, 'utf8');
  }

  static header() {
    // H|\^&|||Bio-Rad D-10|||||||P|1|20260810113000
    // Field 4 = machineName (analyzer identifier)
    const content = `H|\\^&|||${CONFIG.machineName}|||||||P|1|${CONFIG.timestamp}`;
    return this.frame(content);
  }

  static patient() {
    // P|1|||||||
    const content = `P|1|||||||`;
    return this.frame(content);
  }

  static order() {
    // O|1|visitId|sampleId||^^^A1C|R||||||N||||||||||||||F
    // Field 2 = visitId (barcode scanned)
    // Field 3 = sampleId (sample type ID)
    const content = `O|1|${CONFIG.visitId}|${CONFIG.sampleId}||^^^A1C|R||||||N||||||||||||||F`;
    return this.frame(content);
  }

  static result() {
    // R|1|^^^A1C|6.8|%|4.0-6.0|N||F|||20260810113000
    const content = `R|1|^^^A1C|${CONFIG.a1cValue}|${CONFIG.a1cUnit}|${CONFIG.a1cRefRange}|${CONFIG.a1cFlag}||F|||${CONFIG.timestamp}`;
    return this.frame(content);
  }

  static terminator() {
    // L|1|N
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
// BIO-RAD D-10 SIMULATOR
// ============================================================================

class BioRadD10Simulator {
  constructor() {
    this.socket = null;
    this.connected = false;
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
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  handleData(data) {
    const byte = data[0];
    if (byte === ASTM.ACK) {
      log('Received ACK from agent', 'RESPONSE');
    } else if (byte === ASTM.NAK) {
      log('Received NAK from agent (error)', 'ERROR');
    } else {
      logFrame('RECEIVED', data, 'Data from agent');
    }
  }

  async sendFrame(frameData, description) {
    logFrame('SENDING', frameData, description);
    return new Promise((resolve) => {
      this.socket.write(frameData);
      setTimeout(resolve, 500);
    });
  }

  async run() {
    try {
      log('═'.repeat(100), 'START');
      log(`🏥 BIO-RAD D-10 SIMULATOR - ASTM E1381/E1394 Protocol`, 'START');
      log('═'.repeat(100), 'START');
      log(`Analyzer: Bio-Rad D-10`, 'CONFIG');
      log(`Visit ID (Barcode): ${CONFIG.visitId}`, 'CONFIG');
      log(`Sample Type ID: ${CONFIG.sampleId}`, 'CONFIG');
      log(`Test: HbA1c (A1C)`, 'CONFIG');
      log(`Result: ${CONFIG.a1cValue} ${CONFIG.a1cUnit}`, 'CONFIG');
      log(`Reference: ${CONFIG.a1cRefRange}`, 'CONFIG');
      log(`Flag: ${CONFIG.a1cFlag} (Normal)`, 'CONFIG');
      log('', 'CONFIG');

      // ===== ASTM SESSION HANDSHAKE =====

      // STEP 1: Send HEADER
      log('STEP 1: Send HEADER frame', 'STEP');
      log(`Action: Identify analyzer as Bio-Rad D-10`, 'ACTION');
      const headerFrame = ASTMBuilder.header();
      await this.sendFrame(headerFrame, 'HEADER - Analyzer identification');
      
      // STEP 2: Send PATIENT
      log('STEP 2: Send PATIENT record', 'STEP');
      const patientFrame = ASTMBuilder.patient();
      await this.sendFrame(patientFrame, 'PATIENT - Patient demographic');
      
      // STEP 3: Send ORDER
      log('STEP 3: Send ORDER record', 'STEP');
      log(`Action: Request A1C test for visitId ${CONFIG.visitId}`, 'ACTION');
      const orderFrame = ASTMBuilder.order();
      await this.sendFrame(orderFrame, 'ORDER - Request test');
      
      // STEP 4: Send RESULT
      log('STEP 4: Send RESULT record', 'STEP');
      log(`Action: Report A1C result: ${CONFIG.a1cValue}${CONFIG.a1cUnit}`, 'ACTION');
      const resultFrame = ASTMBuilder.result();
      await this.sendFrame(resultFrame, `RESULT - A1C=${CONFIG.a1cValue}${CONFIG.a1cUnit}`);

      // ✅ STEP 5: Multi-frame capability demo (ETB frame)
      log('STEP 5: Send optional chromatographic data frame (ETB)', 'STEP');
      log(`Action: Demonstrate ETB multi-frame support`, 'ACTION');
      const etbContent = `R|2|^^^CHR_DATA|Peak_Area|AU|N/A|N||F|||${CONFIG.timestamp}`;
      const etbFrame = ASTMBuilder.frame(etbContent, true);  // ✅ useETB=true
      await this.sendFrame(etbFrame, 'ETB FRAME - Chromatographic peak data (example)');
      
      // STEP 6: Send TERMINATOR
      log('STEP 6: Send TERMINATOR frame', 'STEP');
      log(`Action: Signal end of transmission`, 'ACTION');
      const terminatorFrame = ASTMBuilder.terminator();
      await this.sendFrame(terminatorFrame, 'TERMINATOR - End of session');

      log('', 'INFO');
      log('✅ SIMULATION COMPLETE', 'SUCCESS');
      log('Local Agent now:', 'INFO');
      log('  1. Processes A1C result received from simulator', 'INFO');
      log('  2. Saves to local database (pending_results table)', 'INFO');
      log('  3. Syncs to VPS backend (/api/machine/v1/results)', 'INFO');
      log('  4. Marks as SYNCED when successful', 'INFO');
      log('  5. Queues for retry if VPS is unreachable', 'INFO');
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
  console.log('BIO-RAD D-10 SIMULATOR - ASTM E1381/E1394');
  console.log('█'.repeat(100) + '\n');

  const simulator = new BioRadD10Simulator();

  try {
    await simulator.connect();
    await simulator.run();
  } catch (err) {
    log(`Fatal: ${err.message}`, 'FATAL');
    process.exit(1);
  }
}

main();
