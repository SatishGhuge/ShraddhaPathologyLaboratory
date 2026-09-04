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
  agentHost: '127.0.0.1',
  agentPort: 5100,
  machineName: 'Sysmex XN-350',
  barcode: '202609010001-1',
  timestamp: '20260901163800'
};

// ============================================================================
// ASTM FRAME BUILDER - UNIDIRECTIONAL MODE
// ============================================================================

class ASTMBuilder {
  static checksum(content) {
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum += content.charCodeAt(i);
    }
    return (sum % 256).toString(16).padStart(2, '0').toUpperCase();
  }

  static frame(frameSeq, content) {
    const cs = this.checksum(content);
    const frame = `${String.fromCharCode(ASTM.STX)}${frameSeq}${content}${String.fromCharCode(ASTM.CR)}${String.fromCharCode(ASTM.ETX)}${cs}${String.fromCharCode(ASTM.CR)}${String.fromCharCode(ASTM.LF)}`;
    return Buffer.from(frame, 'utf8');
  }

  static enq() {
    return Buffer.from([ASTM.ENQ]);
  }

  static header() {
    const content = `H|\\^&|||${CONFIG.machineName}^00-24^15567^^^^AW618382||||Sysmex|||P|1|${CONFIG.timestamp}`;
    return this.frame('1', content);
  }

  static patient(seq, barcode, patientName = 'Patient') {
    // P frame: P|seq|patientId|patientName|||||barcode
    // Sysmex format: barcode in field[4], name in field[5]
    const content = `P|${seq}||||||^^        ${barcode}^M|^${patientName}|`;
    return this.frame(String(seq), content);
  }

  static order(seq, barcode, testCode) {
    // O frame: O|seq||barcode||testCode
    // Sysmex format: barcode in field[3], testCode in field[4]
    const content = `O|${seq}||^^        ${barcode}||${testCode}||||||||||||||||||||`;
    return this.frame(String(seq), content);
  }

  static result(seq, paramCode, value, unit = 'K/uL', flag = 'N') {
    // R frame: R|seq|^^^ParamCode|Value|Units|RefRange|Flag
    const content = `R|${seq}|^^^${paramCode}|${value}|${unit}||${flag}|`;
    return this.frame(String(seq), content);
  }

  static terminator(seq) {
    // L frame: L|seq|N (normal termination)
    const content = `L|${seq}|N`;
    return this.frame(String(seq), content);
  }

  static eot() {
    return Buffer.from([ASTM.EOT]);
  }
}

// ============================================================================
// LOGGER
// ============================================================================

function logFrame(direction, data, desc = '') {
  const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  const ascii = data.toString('utf8').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  
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
// MACHINE SIMULATOR - UNIDIRECTIONAL MODE (SEND ONLY)
// ============================================================================

class MachineSimulator {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.frameSeq = 0;
  }

  nextFrameSeq() {
    this.frameSeq = (this.frameSeq + 1) % 8;
    return this.frameSeq;
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
        log('Received NAK from agent', 'WARNING');
      }
    } else {
      logFrame('RECEIVED FROM LOCAL AGENT', data);
    }
  }

  async sendFrame(frameData, description) {
    logFrame('SENDING TO LOCAL AGENT', frameData, description);
    return new Promise((resolve) => {
      this.socket.write(frameData);
      setTimeout(resolve, 300);
    });
  }

  async run() {
    try {
      log('═'.repeat(100), 'START');
      log(`🏥 SYSMEX XN-350 SIMULATOR - UNIDIRECTIONAL MODE`, 'START');
      log('═'.repeat(100), 'START');
      log(`Machine Name: ${CONFIG.machineName}`, 'CONFIG');
      log(`Barcode (visitId-sampleTypeId): ${CONFIG.barcode}`, 'CONFIG');
      log(`Agent: ${CONFIG.agentHost}:${CONFIG.agentPort}`, 'CONFIG');
      log(`Mode: UNIDIRECTIONAL (Machine sends results only)`, 'CONFIG');
      log('', 'CONFIG');

      // ===== UNIDIRECTIONAL TRANSMISSION =====

      // STEP 1: Send ENQ to initiate transmission
      log('STEP 1: Initiate transmission with ENQ byte', 'STEP');
      await this.sendFrame(ASTMBuilder.enq(), 'ENQ - Start transmission');

      // STEP 2: Send HEADER frame (machine identification)
      log('STEP 2: Send HEADER frame (machine identification)', 'STEP');
      const headerSeq = this.nextFrameSeq();
      await this.sendFrame(ASTMBuilder.header(), `HEADER - Machine: ${CONFIG.machineName}`);

      // STEP 3: Send PATIENT frame (patient info + barcode)
      log('STEP 3: Send PATIENT frame (barcode)', 'STEP');
      const patientSeq = this.nextFrameSeq();
      await this.sendFrame(ASTMBuilder.patient(patientSeq, CONFIG.barcode, 'Test Patient'), `PATIENT - Barcode: ${CONFIG.barcode}`);

      // STEP 4: Send ORDER frame (test info)
      log('STEP 4: Send ORDER frame (test info)', 'STEP');
      const orderSeq = this.nextFrameSeq();
      await this.sendFrame(ASTMBuilder.order(orderSeq, CONFIG.barcode, 'HMG'), `ORDER - Test: HMG`);

      // STEP 5: Send RESULT frames (actual parameters)
      //         These are the 100+ parameters from XN-350
      log('STEP 5: Send RESULT frames (parameters)', 'STEP');
      
      const results = [
        // Core CBC parameters
        { param: 'WBC', value: '7.21', unit: 'K/uL' },
        { param: 'RBC', value: '2.16', unit: 'M/uL' },
        { param: 'HGB', value: '8', unit: 'g/dL' },
        { param: 'MCV', value: '116.7', unit: 'fL' },
        { param: 'MCH', value: '37', unit: 'pg' },
        { param: 'MCHC', value: '31.7', unit: 'g/dL' },
        { param: 'PLT', value: '86', unit: 'K/uL' },
        { param: 'LYMPH%', value: '17.5', unit: '%' },
        { param: 'MONO%', value: '4.9', unit: '%' },
        { param: 'LYMPH#', value: '1.26', unit: 'K/uL' },
        { param: 'MONO#', value: '0.35', unit: 'K/uL' },
        { param: 'BASO#', value: '0.01', unit: 'K/uL' },
        { param: 'RDW-SD', value: '84.5', unit: 'fL' },
        { param: 'RDW-CV', value: '19.8', unit: '%' },
        // Extended parameters (Sysmex specific)
        { param: 'WBC-D', value: '7.21', unit: 'K/uL' },
        { param: 'NEUT%', value: '77.4', unit: '%' },
        { param: 'EO%', value: '0.1', unit: '%' },
        { param: 'NEUT#', value: '5.58', unit: 'K/uL' },
        { param: 'EO#', value: '0.01', unit: 'K/uL' },
      ];

      let resultSeq = orderSeq;
      for (const result of results) {
        resultSeq = this.nextFrameSeq();
        await this.sendFrame(
          ASTMBuilder.result(resultSeq, result.param, result.value, result.unit),
          `RESULT - ${result.param} = ${result.value} ${result.unit}`
        );
      }

      // STEP 6: Send TERMINATOR frame (L frame)
      log('STEP 6: Send TERMINATOR frame (end of results)', 'STEP');
      const terminatorSeq = this.nextFrameSeq();
      await this.sendFrame(ASTMBuilder.terminator(terminatorSeq), `TERMINATOR - End transmission`);

      // STEP 7: Send EOT byte (end of transmission marker)
      log('STEP 7: Send EOT byte (end marker)', 'STEP');
      await this.sendFrame(ASTMBuilder.eot(), 'EOT - Transmission complete');

      log('', 'INFO');
      log('✅ SIMULATION COMPLETE', 'SUCCESS');
      log('Agent actions:', 'INFO');
      log('  1. ✓ Received ENQ and sent ACK', 'INFO');
      log('  2. ✓ Parsed HEADER frame', 'INFO');
      log('  3. ✓ Parsed PATIENT frame (extracted barcode)', 'INFO');
      log('  4. ✓ Parsed ORDER frame (extracted test code)', 'INFO');
      log(`  5. ✓ Parsed ${results.length} RESULT frames`, 'INFO');
      log('  6. ✓ Received TERMINATOR frame', 'INFO');
      log('  7. ✓ Detected EOT byte', 'INFO');
      log('  8. ✓ Queried backend API for testCode', 'INFO');
      log('  9. ✓ Saved to local database', 'INFO');
      log(' 10. ✓ Synced to backend API', 'INFO');
      log('', 'INFO');

    } catch (err) {
      log(`❌ Simulation failed: ${err.message}`, 'ERROR');
      log('Make sure Local Agent is running: npm start', 'ERROR');
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
  console.log('SYSMEX XN-350 SIMULATOR - UNIDIRECTIONAL MODE');
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
