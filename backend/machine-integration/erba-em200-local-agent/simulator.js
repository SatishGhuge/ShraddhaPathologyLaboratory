const net = require('net');

/**
 * Erba EM 200 ASTM Protocol Simulator
 * 
 * REAL EM200 FLOW (What Actually Happens):
 * 1. Machine scans barcode → QUERY frame with ONLY sample ID
 * 2. Agent fetches test orders from VPS for that sample
 * 3. Agent sends ORDER frame back with test codes from VPS
 * 4. Machine runs those tests → RESULT frames (for tests in ORDER frame)
 * 5. Agent receives results → stores in database → syncs to VPS
 * 
 * SIMULATOR DESIGN:
 * The simulator receives visitId+sampleId and asks the agent for test orders.
 * It then waits for the ORDER frame containing test codes FROM THE VPS.
 * The simulator generates results ONLY for the test codes it received in the ORDER.
 * 
 * This mirrors the real machine behavior perfectly:
 * - Machine doesn't know test codes upfront
 * - Test codes come from VPS via the ORDER frame
 * - Machine generates results for whatever was ordered
 * 
 * Usage:
 *   node simulator.js <visitId> <sampleTypeId>
 *   
 * Arguments:
 *   visitId     - Barcode scanned at machine (e.g., 202608060002)
 *   sampleTypeId - Sample type ID (e.g., 3 for serum, 5 for plasma)
 * 
 * Examples:
 *   node simulator.js 202608060002 3
 *   node simulator.js LAB-001 5
 * 
 * Run this in a separate terminal while the agent is running on port 5200
 */

const CONFIG = {
  agentHost: process.env.AGENT_HOST || 'localhost',
  agentPort: parseInt(process.env.AGENT_PORT || '5200'),
  machineName: 'Erba EM-200'
};

const ASTM = {
  ENQ: 0x05,
  ACK: 0x06,
  NAK: 0x15,
  STX: 0x02,
  ETX: 0x03
};

// Test data - maps test code to result values
const TEST_RESULTS = {
  'ALT': { value: '35', units: 'U/L', refRange: '7-56', flag: 'N' },
  'AST': { value: '28', units: 'U/L', refRange: '10-40', flag: 'N' },
  'ALB': { value: '4.2', units: 'g/dL', refRange: '3.5-5.2', flag: 'N' },
  'ALP': { value: '85', units: 'U/L', refRange: '44-147', flag: 'N' },
  'ACP': { value: '2.5', units: 'U/L', refRange: '0.0-5.0', flag: 'N' },
  'AMY': { value: '65', units: 'U/L', refRange: '28-100', flag: 'N' },
  'BIL-T': { value: '0.8', units: 'mg/dL', refRange: '0.1-1.2', flag: 'N' },
  'BIL-D': { value: '0.2', units: 'mg/dL', refRange: '0.0-0.3', flag: 'N' },
  'BUN': { value: '18', units: 'mg/dL', refRange: '7-20', flag: 'N' },
  'CREA': { value: '0.9', units: 'mg/dL', refRange: '0.6-1.3', flag: 'N' },
  'CHOL': { value: '185', units: 'mg/dL', refRange: '125-200', flag: 'N' },
  'TRIG': { value: '120', units: 'mg/dL', refRange: '30-150', flag: 'N' },
  'HDL': { value: '50', units: 'mg/dL', refRange: '40-60', flag: 'N' },
  'LDL': { value: '110', units: 'mg/dL', refRange: '0-100', flag: 'H' },
  'TP': { value: '7.2', units: 'g/dL', refRange: '6.4-8.3', flag: 'N' },
  'UA': { value: '5.5', units: 'mg/dL', refRange: '3.5-7.2', flag: 'N' },
  'GLU': { value: '95', units: 'mg/dL', refRange: '70-99', flag: 'N' },
  'LDH': { value: '210', units: 'U/L', refRange: '140-280', flag: 'N' },
  'CK-MB': { value: '5', units: 'U/L', refRange: '0-25', flag: 'N' },
  'Na': { value: '138', units: 'mmol/L', refRange: '135-145', flag: 'N' },
  'K': { value: '4.2', units: 'mmol/L', refRange: '3.5-5.1', flag: 'N' },
  'Cl': { value: '102', units: 'mmol/L', refRange: '96-106', flag: 'N' },
  'Li': { value: '0.9', units: 'mmol/L', refRange: '0.6-1.2', flag: 'N' }
};

// ASTM Frame builder - stateless, frame number managed per-connection
const ASTMFrame = {
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

  // H frame - HEADER
  header(frameNumber) {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    const record = `H|\\^&|||${CONFIG.machineName}||||||N||E1394-97|${timestamp}`;
    return this.build(record, frameNumber);
  },

  // Q frame - QUERY (ONLY visitId + sampleTypeId, NO test codes!)
  // Per EM200 ASTM E1394-97 Manual:
  // Q|seq|startSpecimenId|endSpecimenId|^^^testcode|nature|status
  // We send: Q|seq|visitId|sampleTypeId|ALL (asking for ALL tests for this sample)
  query(visitId, sampleTypeId, frameNumber) {
    // Format: Q|seq|startSpecimenId|endSpecimenId|testcode|nature|status
    // startSpecimenId = visitId (barcode scanned)
    // endSpecimenId = sampleTypeId (sample type: 2=serum, 3=plasma, etc)
    // testcode = ALL (ask for all tests configured for this sample)
    const record = `Q|1|${visitId}|${sampleTypeId}|ALL||`;
    return this.build(record, frameNumber);
  },

  // R frame - RESULT
  result(testCode, value, units, refRange, flag = 'N', status = 'F', frameNumber = 0) {
    const record = `R|1|^^^${testCode}|${value}|${units}|${refRange}|${flag}|||${status}|||`;
    return this.build(record, frameNumber);
  },

  // L frame - TERMINATOR
  terminator(frameNumber) {
    return this.build('L|1|N', frameNumber);
  }
};

// Simulate analyzer sending results
function simulateAnalyzer(visitId, sampleTypeId) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(CONFIG.agentPort, CONFIG.agentHost, () => {
      console.log(`\n✓ Connected to Erba EM 200 Agent at ${CONFIG.agentHost}:${CONFIG.agentPort}\n`);

      let ackCount = 0;
      let receivedTestCodes = [];  // ✅ Will store test codes from ORDER frame
      let orderReceived = false;
      let frameSequenceNumber = 0;  // Per-connection frame number management

      // Step 1: Send HEADER frame
      console.log('[SIMULATOR] Sending HEADER frame...');
      const headerFrame = ASTMFrame.header(frameSequenceNumber);
      frameSequenceNumber = (frameSequenceNumber + 1) % 8;
      socket.write(headerFrame);

      // Step 2: Send QUERY frame (ONLY visitId + sampleTypeId, NO test codes!)
      // This mimics real machine: barcode scanned, machine asks "what tests?"
      setTimeout(() => {
        console.log(`[SIMULATOR] Barcode scanned: visitId=${visitId}, sampleTypeId=${sampleTypeId}`);
        console.log(`[SIMULATOR] Sending QUERY frame (ONLY sample IDs, no test codes)...`);
        const queryFrame = ASTMFrame.query(visitId, sampleTypeId, frameSequenceNumber);
        frameSequenceNumber = (frameSequenceNumber + 1) % 8;
        socket.write(queryFrame);
      }, 500);

      // Step 3: Wait for ORDER frame from agent
      // (Agent will fetch from VPS and send ORDER with test codes)
      console.log('[SIMULATOR] Waiting for ORDER frame from agent (tests from VPS)...');

      // Step 4: Once ORDER is received with test codes, send RESULT frames
      // This happens after we parse the ORDER frame below
      
      let dataBuffer = '';
      
      socket.on('data', (data) => {
        // Handle single-byte responses (ACK/NAK)
        if (data.length === 1) {
          if (data[0] === ASTM.ACK) {
            ackCount++;
            console.log(`[SIMULATOR] ✓ Received ACK (${ackCount})`);
            return;
          } else if (data[0] === ASTM.NAK) {
            console.error(`[SIMULATOR] ❌ Received NAK - frame rejected`);
            return;
          }
        }

        // Handle multi-byte frames (ORDER, etc)
        dataBuffer += data.toString('utf8');

        // Try to parse ORDER frame
        if (dataBuffer.includes('O|') && !orderReceived) {
          orderReceived = true;
          console.log('[SIMULATOR] ✓ Received ORDER frame from agent');
          
          // Parse the ORDER frame to extract test codes
          const stxIndex = dataBuffer.indexOf(String.fromCharCode(ASTM.STX));
          const etxIndex = dataBuffer.indexOf(String.fromCharCode(ASTM.ETX), stxIndex);
          
          if (stxIndex !== -1 && etxIndex !== -1) {
            let frameContent = dataBuffer.substring(stxIndex + 1, etxIndex);
            const parts = frameContent.split('|');
            
            // O frame: O|seq|sampleId||^^^testcodes|...
            // Test codes are at position 4
            const testCodesField = parts[4] || '';
            if (testCodesField) {
              // Extract from ^^^ALT^AST^CHOL format
              receivedTestCodes = testCodesField.split('^').filter(c => c.length > 0);
              
              if (receivedTestCodes.length > 0) {
                console.log(`[SIMULATOR] ✓ Extracted ${receivedTestCodes.length} test code(s) from ORDER:`);
                receivedTestCodes.forEach(tc => console.log(`             → ${tc}`));
                
                // Now send RESULT frames for each test code (with proper frame numbers)
                setTimeout(() => {
                  console.log(`\n[SIMULATOR] Running ${receivedTestCodes.length} test(s)...`);
                  
                  receivedTestCodes.forEach((testCode, index) => {
                    setTimeout(() => {
                      const testData = TEST_RESULTS[testCode];
                      if (testData) {
                        console.log(`[SIMULATOR] Sending RESULT for ${testCode}: ${testData.value} ${testData.units}`);
                        const resultFrame = ASTMFrame.result(
                          testCode,
                          testData.value,
                          testData.units,
                          testData.refRange,
                          testData.flag,
                          'F',
                          frameSequenceNumber
                        );
                        frameSequenceNumber = (frameSequenceNumber + 1) % 8;
                        socket.write(resultFrame);
                      } else {
                        console.warn(`[SIMULATOR] ⚠️ Unknown test code: ${testCode}`);
                      }
                    }, 500 + (index * 300));
                  });

                  // Send TERMINATOR after all results (with proper frame number)
                  setTimeout(() => {
                    console.log('[SIMULATOR] Sending TERMINATOR frame...');
                    const terminatorFrame = ASTMFrame.terminator(frameSequenceNumber);
                    frameSequenceNumber = (frameSequenceNumber + 1) % 8;
                    socket.write(terminatorFrame);
                  }, 500 + (receivedTestCodes.length * 300) + 300);
                }, 500);
              }
            }
          }
        }
      });

      socket.on('end', () => {
        console.log('[SIMULATOR] Connection closed\n');
      });

      socket.on('error', (err) => {
        console.error(`\n❌ Connection error: ${err.message}`);
        reject(err);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!orderReceived || receivedTestCodes.length === 0) {
          console.warn(`\n⚠️ Timeout: Did not receive ORDER frame with test codes from agent`);
          socket.destroy();
          reject(new Error('Timeout - agent did not send ORDER frame with test codes'));
        }
      }, 30000);
    });

    socket.on('error', (err) => {
      console.error(`\n❌ Connection failed: ${err.message}`);
      console.log(`\n💡 Make sure the Erba EM 200 agent is running on ${CONFIG.agentHost}:${CONFIG.agentPort}`);
      console.log('   Start it with: npm start\n');
      reject(err);
    });
  });
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
╔═════════════════════════════════════════════════════════════════╗
║          Erba EM 200 ASTM Protocol Simulator                     ║
║              Mirrors Real Machine Behavior Exactly              ║
╚═════════════════════════════════════════════════════════════════╝

REAL EM200 FLOW (What Actually Happens):
  1. Machine scans barcode (visitId + sampleTypeId)
  2. Machine sends: Q|1|visitId|sampleTypeId  ← NO test codes!
  3. Agent fetches test orders from VPS for this sample
  4. Agent sends back: O|1|sampleId||^^^ALT^AST^CHOL|...
                     ↑ Test codes FROM VPS, not pre-programmed
  5. Machine gets the ORDER and generates results
  6. Machine sends: R|1|^^^ALT|35|U/L|7-56|...
                   R|1|^^^AST|28|U/L|10-40|...
                   R|1|^^^CHOL|185|mg/dL|125-200|...
  7. Agent receives results and syncs to VPS

HOW THIS SIMULATOR WORKS:
  • Takes ONLY visitId and sampleTypeId (like real machine)
  • Sends QUERY to agent with just these IDs
  • WAITS for ORDER frame from agent (agent fetches from VPS)
  • Extracts test codes FROM the ORDER frame
  • Generates RESULT frames for those test codes
  • This perfectly mirrors real EM200 behavior

KEY POINT: Test codes are NOT provided upfront - they come from VPS!

Usage: node simulator.js <visitId> <sampleTypeId>

Arguments:
  visitId      - Barcode ID scanned at machine
                 Examples: 202608060002, LAB-001, PATIENT123
                 
  sampleTypeId - Sample type (serum=3, plasma=5, etc.)
                 This combines with visitId to form the sample ID
                 Examples: 3, 5, 1

Examples:
  # Single sample
  node simulator.js 202608060002 3
  
  # Different sample type
  node simulator.js LAB-001 5
  
  # Another example
  node simulator.js PATIENT123 3

Environment Variables:
  AGENT_HOST  - Agent hostname (default: localhost)
  AGENT_PORT  - Agent port (default: 5200)

What Happens When You Run:
  $ node simulator.js 202608060002 3
  
  ✓ Connected to Erba EM 200 Agent at localhost:5200
  
  [SIMULATOR] Sending HEADER frame...
  [SIMULATOR] Barcode scanned: visitId=202608060002, sampleId=3
  [SIMULATOR] Sending QUERY frame (ONLY sample IDs, no test codes)...
  [SIMULATOR] Waiting for ORDER frame from agent (tests from VPS)...
  
  (Agent now queries VPS and gets test codes)
  
  ✓ Received ORDER frame from agent
  ✓ Extracted 3 test code(s) from ORDER:
             → ALT
             → AST
             → CHOL
  
  [SIMULATOR] Running 3 test(s)...
  [SIMULATOR] Sending RESULT for ALT: 35 U/L
  [SIMULATOR] Sending RESULT for AST: 28 U/L
  [SIMULATOR] Sending RESULT for CHOL: 185 mg/dL
  [SIMULATOR] Sending TERMINATOR frame...
  
  (Agent processes and syncs to VPS)
  
  ✅ Done!

IMPORTANT NOTES:
  • Machine doesn't know test codes upfront
  • Test codes are determined by VPS (during agent query)
  • This simulator waits for ORDER frame from agent
  • Results are generated ONLY for tests in the ORDER
  • This matches real EM200 + LIMS behavior perfectly
`);
    process.exit(1);
  }

  const visitId = args[0];
  const sampleTypeId = args[1];

  console.log(`
╔═════════════════════════════════════════════════════════════════╗
║          Erba EM 200 ASTM Protocol Simulator                     ║
╚═════════════════════════════════════════════════════════════════╝

📋 Machine State:
   Machine Name: ${CONFIG.machineName}
   Visit ID (Barcode): ${visitId}
   Sample Type ID:     ${sampleTypeId}
   Agent:              ${CONFIG.agentHost}:${CONFIG.agentPort}

📌 Flow:
   1. Send HEADER (machine identification)
   2. Send QUERY (ask agent for test orders)
   3. Wait for ORDER (agent fetches from VPS)
   4. Extract test codes from ORDER
   5. Send RESULT frames (for received tests)
   6. Send TERMINATOR

ℹ️  Test codes will come from the VPS (via agent ORDER frame).
    NOT pre-programmed on the machine.
`);

  try {
    await simulateAnalyzer(visitId, sampleTypeId);
    process.exit(0);
  } catch (err) {
    console.error('Simulation failed:', err.message);
    process.exit(1);
  }
}

main();
