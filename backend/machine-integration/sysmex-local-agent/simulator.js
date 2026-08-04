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
  host: 'localhost',
  port: 5100,
  machineId: 'Sysmex',
  machineModel: 'XN-350',
  visitId: '202608040001',           // RAJ BHUTE patient barcode visitId
  sampleId: '1',                     // Whole Blood-EDTA sample type
  timestamp: '20260803180000',
  backendUrl: 'http://localhost:3351'  // Backend API URL
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
    this.testDetails = [];
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
      log(`🏥 REAL MACHINE SIMULATOR - DYNAMIC TEST FETCHING FROM BACKEND`, 'START');
      log('═'.repeat(100), 'START');
      log(`Machine: ${CONFIG.machineId} ${CONFIG.machineModel}`, 'CONFIG');
      log(`Sample Barcode: ${CONFIG.visitId}-${CONFIG.sampleId}`, 'CONFIG');
      log(`Backend: ${CONFIG.backendUrl}`, 'CONFIG');
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

      // Step 4: Fetch full test details (parameters, categories) from backend
      log(`STEP 4: 📥 Fetching detailed test parameters for ${this.testCodes.length} test(s)...`, 'STEP');
      const testDetails = await this.fetchTestDataFromBackend();
      
      if (testDetails.length === 0) {
        log('⚠️  ERROR: Could not fetch test details from backend', 'ERROR');
        throw new Error('Test details fetch failed');
      }

      // Step 5: Generate REAL results based on database parameters
      log(`STEP 5: 🧪 Generating results based on actual database parameters...`, 'STEP');
      const allResults = this.generateResultsForTests(testDetails);
      
      if (allResults.length === 0) {
        log('⚠️  ERROR: No results generated', 'ERROR');
        throw new Error('Result generation failed');
      }

      // Step 6: Send Results
      log(`STEP 6: 📤 Sending ${allResults.length} result(s) to agent...`, 'STEP');
      
      for (const r of allResults) {
        const resultFrame = ASTMBuilder.result(r.test, r.param, r.value, r.unit);
        log(`  → ${r.test}/${r.param} = ${r.value} ${r.unit}`, 'RESULT');
        await this.sendFrame(resultFrame, `Real Result - ${r.test}/${r.param}`);
      }

      // Step 7: Send Terminator
      log('STEP 7: 🏁 Transmission complete', 'STEP');
      const terminatorFrame = ASTMBuilder.terminator();
      await this.sendFrame(terminatorFrame, 'Terminator - End of transmission');

      log('✅ SUCCESS! Real data from backend processed completely.', 'SUCCESS');

    } catch (err) {
      log(`❌ Simulation failed: ${err.message}`, 'ERROR');
    } finally {
      setTimeout(() => {
        if (this.socket) this.socket.end();
      }, 1000);
    }
  }

  // Fetch test data from backend API - gets real parameters and categories
  async fetchTestDataFromBackend() {
    return new Promise((resolve, reject) => {
      log('📡 Fetching test parameters from backend API...', 'API');
      
      const query = new URLSearchParams({
        visitId: CONFIG.visitId,
        sampleId: CONFIG.sampleId,
        analyzer: `${CONFIG.machineId}^${CONFIG.machineModel}`
      });

      const url = `${CONFIG.backendUrl}/api/machine/v1/query?${query.toString()}`;
      log(`Request: GET ${url}`, 'API');

      http.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', async () => {
          try {
            const response = JSON.parse(data);
            
            if (response.success && response.data.patientTests && response.data.patientTests.length > 0) {
              log(`✓ Retrieved ${response.data.patientTests.length} test(s) from backend`, 'API_SUCCESS');
              
              // Extract test codes using actual API response structure
              const patientTests = response.data.patientTests;
              this.testCodes = patientTests.map(pt => pt.testCode); // testCode, not shortName
              log(`✓ Test codes: ${this.testCodes.join(', ')}`, 'TESTCODE');

              // Need to fetch test ID from master API first
              // Use testCode to find the test ID
              const testIdPromises = patientTests.map(pt => 
                this.findTestIdByCode(pt.testCode)
              );

              try {
                const testIds = await Promise.all(testIdPromises);
                
                // Now fetch full details for each test
                const testDetailPromises = testIds.map((testId, idx) => 
                  this.fetchTestDetails(testId, patientTests[idx].testCode)
                );

                const testDetailsArray = await Promise.all(testDetailPromises);
                
                const testDetails = patientTests.map((pt, idx) => ({
                  shortName: pt.testCode,      // testCode is the machine code
                  name: pt.testName,           // testName from API
                  id: testIds[idx],            // testId fetched separately
                  ...testDetailsArray[idx]
                }));

                log(`✓ Fetched details for ${testDetails.length} test(s)`, 'API_SUCCESS');
                resolve(testDetails);
              } catch (e) {
                log(`Error fetching test details: ${e.message}`, 'ERROR');
                reject(e);
              }
            } else {
              log('⚠️ No tests found in response or empty patientTests', 'WARNING');
              resolve([]);
            }
          } catch (e) {
            log(`Error parsing response: ${e.message}`, 'ERROR');
            reject(e);
          }
        });
      }).on('error', (err) => {
        log(`API request failed: ${err.message}`, 'ERROR');
        reject(err);
      });
    });
  }

  // Find test ID by testCode (HMG, CBC, etc.)
  async findTestIdByCode(testCode) {
    return new Promise((resolve, reject) => {
      const url = `${CONFIG.backendUrl}/api/master/tests`;
      log(`  📥 Finding test ID for code "${testCode}": GET ${url}`, 'API_FIND');

      http.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (response.success && response.data) {
              // Find test with matching shortName or testCode
              const tests = Array.isArray(response.data) ? response.data : response.data.data || [];
              const matchingTest = tests.find(t => 
                t.shortName === testCode || t.testCode === testCode
              );

              if (matchingTest) {
                log(`    ✓ Found test ID ${matchingTest.id} for code "${testCode}"`, 'API_FIND');
                resolve(matchingTest.id);
              } else {
                log(`    ❌ Test with code "${testCode}" not found`, 'ERROR');
                reject(new Error(`Test not found for code: ${testCode}`));
              }
            } else {
              reject(new Error('Invalid response from tests API'));
            }
          } catch (e) {
            log(`Error parsing test list: ${e.message}`, 'ERROR');
            reject(e);
          }
        });
      }).on('error', (err) => {
        log(`Test list request failed: ${err.message}`, 'ERROR');
        reject(err);
      });
    });
  }

  // Fetch individual test details with all parameters and categories
  async fetchTestDetails(testId, testCode) {
    return new Promise((resolve, reject) => {
      const url = `${CONFIG.backendUrl}/api/master/tests/${testId}`;
      log(`  📥 Fetching test details for "${testCode}" (ID ${testId}): GET ${url}`, 'API_DETAIL');

      http.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (response.success && response.data) {
              const test = response.data;
              const categories = test.categories || [];
              const parameters = [];

              // Extract all parameters from categories
              for (const category of categories) {
                if (category.parameters && Array.isArray(category.parameters)) {
                  for (const param of category.parameters) {
                    parameters.push({
                      parameterName: param.parameterName,
                      machineCode: param.machineCode || param.parameterName,
                      type: param.type,
                      unitId: param.unitId,
                      unit: param.unit?.symbol || 'N/A',
                      maleLowValue: param.normalRanges?.find(r => r.gender === 'Male')?.lowValue,
                      maleHighValue: param.normalRanges?.find(r => r.gender === 'Male')?.highValue,
                      femaleLowValue: param.normalRanges?.find(r => r.gender === 'Female')?.lowValue,
                      femaleHighValue: param.normalRanges?.find(r => r.gender === 'Female')?.highValue,
                      childLowValue: param.normalRanges?.find(r => r.gender === 'Child')?.lowValue,
                      childHighValue: param.normalRanges?.find(r => r.gender === 'Child')?.highValue,
                      categoryName: category.name
                    });
                    
                    log(`    ✓ Parameter: ${param.parameterName} (${param.unit?.symbol || 'N/A'})`, 'PARAM');
                  }
                }
              }

              log(`  ✓ Total ${parameters.length} parameter(s) for "${testCode}"`, 'API_DETAIL');
              resolve({
                categories: categories,
                parameters: parameters
              });
            } else {
              resolve({ categories: [], parameters: [] });
            }
          } catch (e) {
            log(`Error parsing test details: ${e.message}`, 'ERROR');
            resolve({ categories: [], parameters: [] });
          }
        });
      }).on('error', (err) => {
        log(`Test detail request failed: ${err.message}`, 'ERROR');
        resolve({ categories: [], parameters: [] });
      });
    });
  }

  // Generate realistic results based on actual test parameters from database
  generateResultsForTests(testDetails) {
    const results = [];
    
    if (!testDetails || testDetails.length === 0) {
      log('⚠️  No test details available for result generation', 'WARNING');
      return results;
    }

    // Realistic value generator based on parameter ranges
    const generateValue = (param) => {
      if (param.type === 'Numeric') {
        // Try male range first, then female, then default
        let low = param.maleLowValue;
        let high = param.maleHighValue;
        
        if (low === null || low === undefined) {
          low = param.femaleLowValue;
          high = param.femaleHighValue;
        }
        
        if (low === null || low === undefined) {
          low = param.childLowValue;
          high = param.childHighValue;
        }

        // If still no range, use default range
        if (low === null || low === undefined) {
          low = 0;
          high = 100;
        }

        // Generate random value within range
        const value = (Math.random() * (high - low) + low).toFixed(2);
        return { value: value, unit: param.unit || '' };
      } else {
        // For descriptive/text parameters
        return { value: 'Normal', unit: '' };
      }
    };

    // Generate results for each test
    for (const testDetail of testDetails) {
      if (testDetail.parameters && testDetail.parameters.length > 0) {
        log(`🧪 Generating results for ${testDetail.name} (${testDetail.shortName}):`, 'RESULT_GEN');
        
        for (const param of testDetail.parameters) {
          const { value, unit } = generateValue(param);
          
          results.push({
            test: testDetail.shortName,
            param: param.parameterName,
            value: value,
            unit: unit,
            machineCode: param.machineCode
          });

          log(`   → ${testDetail.shortName}/${param.parameterName} = ${value} ${unit}`, 'RESULT');
        }
      } else {
        log(`   ⚠️  No parameters for ${testDetail.shortName}`, 'WARNING');
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
