import prisma from '../config/database.js';

/**
 * Normalize analyzer name for comparison
 * Handles: "Sysmex^XN-350" vs "Sysmex XN-350"
 */
function normalizeAnalyzerName(name) {
  return name.replace(/\^/g, ' ').trim();
}

/**
 * Query endpoint for machines
 * GET /api/machine/v1/query?visitId=V-123&sampleId=sample-001&analyzer=Sysmex^XN-350
 * Returns test orders filtered by machine type and machine assignment
 */
export const queryWorklist = async (req, res) => {
  try {
    const { visitId, sampleId, analyzer } = req.query;

    console.log(`[MACHINE API QUERY] Received: visitId=${visitId}, sampleId=${sampleId}, analyzer=${analyzer}`);

    // Validate parameters
    if (!visitId || !sampleId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: visitId, sampleId'
      });
    }

    if (!analyzer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: analyzer'
      });
    }

    // sampleId from barcode is actually sampleTypeId (tube type)
    const sampleTypeId = parseInt(sampleId);
    console.log(`[MACHINE API] Step 1: Searching tests for visitId=${visitId}, sampleTypeId=${sampleTypeId}`);

    // Find the machine by analyzer name (normalize the name)
    const normalizedAnalyzer = normalizeAnalyzerName(analyzer);
    const machine = await prisma.machine.findFirst({
      where: {
        name: {
          contains: normalizedAnalyzer.toLowerCase()
        }
      }
    });

    if (!machine) {
      console.warn(`[MACHINE API] ⚠️ Machine not found for analyzer: ${analyzer}`);
      return res.status(200).json({
        success: true,
        data: {
          visitId: visitId,
          sampleId: sampleId,
          patientTests: [],
          message: `Machine '${analyzer}' not registered in system`
        }
      });
    }

    console.log(`[MACHINE API] Step 2: Found machine ID=${machine.id} for analyzer: ${analyzer}`);

    // Step 1: Get all patientTests for this visit
    const allPatientTestsForVisit = await prisma.patientTest.findMany({
      where: {
        visitId: visitId
      },
      include: {
        patient: true,
        test: {
          include: {
            sample_type: true,
            testMachines: {
              include: {
                machine: true
              }
            }
          }
        },
        department: true
      }
    });

    console.log(`[MACHINE API] Step 2: Found ${allPatientTestsForVisit.length} total tests for visitId=${visitId}`);

    if (allPatientTestsForVisit.length === 0) {
      console.warn(`[MACHINE API] ⚠️ No tests found for visitId=${visitId}`);
      return res.status(200).json({
        success: true,
        data: {
          visitId: visitId,
          sampleId: sampleId,
          patientTests: [],
          message: 'No tests found for this visit'
        }
      });
    }

    // Step 3: Filter tests that match BOTH:
    // 1. sampleTypeId (tube type from barcode)
    // 2. Explicitly assigned to this machine (MUST have machine assignment)
    const matchingTests = allPatientTestsForVisit.filter(pt => {
      const testSampleTypeId = pt.test.sampleTypeId;
      const isCorrectSampleType = testSampleTypeId === sampleTypeId;
      
      // Test must be explicitly assigned to this machine (no auto-query for unassigned tests)
      const assignedToThisMachine = pt.test.testMachines.length > 0 && 
        pt.test.testMachines.some(tm => tm.machineId === machine.id);
      
      console.log(`[MACHINE API] Checking test "${pt.test.name}": sampleTypeId=${testSampleTypeId} (match=${isCorrectSampleType}), assignedToThisMachine=${assignedToThisMachine}`);
      
      return isCorrectSampleType && assignedToThisMachine;
    });

    console.log(`[MACHINE API] Step 3: Filtered to ${matchingTests.length} tests explicitly assigned to machine`);

    if (matchingTests.length === 0) {
      console.warn(`[MACHINE API] ⚠️ No tests found for visitId=${visitId} with sampleTypeId=${sampleTypeId} assigned to machine ID=${machine.id}`);
      console.log(`[MACHINE API] Available tests for this visit:`);
      allPatientTestsForVisit.forEach(pt => {
        const machineIds = pt.test.testMachines.map(tm => tm.machineId).join(',') || 'NONE';
        console.log(`  - Test: ${pt.test.name}, sampleTypeId: ${pt.test.sampleTypeId}, assignedMachines: ${machineIds}`);
      });
      
      return res.status(200).json({
        success: true,
        data: {
          visitId: visitId,
          sampleId: sampleId,
          patientTests: [],
          message: `No tests with sampleTypeId=${sampleTypeId} assigned to machine for this visit`
        }
      });
    }

    // Get unique patient info from first record
    const patient = matchingTests[0].patient;

    // Build response with matching test details
    const response = {
      visitId: visitId,
      sampleId: sampleId,
      sampleTypeId: sampleTypeId,
      patientId: patient.patientId,
      patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
      patientTests: matchingTests.map(pt => ({
        patientTestId: pt.id,
        testCode: pt.test.shortName || pt.test.name,
        testName: pt.test.name,
        sampleTypeId: pt.test.sampleTypeId,
        departmentId: pt.departmentId,
        departmentName: pt.department?.name || 'Unknown'
      })),
      priority: 'N',
      timestamp: new Date().toISOString()
    };

    console.log(`[MACHINE API] ✓ Query successful: visitId=${visitId}, sampleTypeId=${sampleTypeId}, machine=${machine.name} - Found ${matchingTests.length} test(s)`);
    console.log(`[MACHINE API] ✓ Tests: ${matchingTests.map(t => t.test.testCode).join(', ')}`);

    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (err) {
    console.error('[MACHINE API ERROR] queryWorklist:', err.message);
    console.error('[MACHINE API ERROR] Stack:', err.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to query worklist',
      error: err.message
    });
  }
};

/**
 * Result submission endpoint for machines
 * POST /api/machine/v1/results
 * Stores test results from machines
 */
export const submitResults = async (req, res) => {
  try {
    const { visitId, sampleId, results } = req.body;

    // Validate payload
    if (!visitId || !sampleId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: visitId, sampleId'
      });
    }

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Results must be a non-empty array'
      });
    }

    // Validate each result
    for (const result of results) {
      if (!result.testCode) {
        return res.status(400).json({
          success: false,
          message: 'Each result must have testCode'
        });
      }
      if (!result.parameters || typeof result.parameters !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Each result must have parameters object'
        });
      }
    }

    let resultsProcessed = 0;
    const failedResults = [];

    // Process each result
    for (const result of results) {
      try {
        const { testCode, parameters } = result;

        console.log(`[MACHINE API RESULTS] Processing testCode: ${testCode}, parameters: ${JSON.stringify(parameters)}`);

        // Find patient tests by visitId and shortName (machine-readable code like CBC)
        const sampleTypeId = parseInt(sampleId);
        const patientTests = await prisma.patientTest.findMany({
          where: {
            visitId: visitId,
            test: {
              shortName: testCode,
              sampleTypeId: sampleTypeId
            }
          },
          include: {
            test: {
              include: {
                ownedParameters: true,
                testparameters: true
              }
            }
          }
        });

        console.log(`[MACHINE API RESULTS] Found ${patientTests.length} patient test(s) for shortName=${testCode}`);

        if (patientTests.length === 0) {
          console.warn(`[MACHINE API] No matching patient test found for visitId=${visitId}, shortName=${testCode}, sampleTypeId=${sampleTypeId}`);
          failedResults.push({
            testCode: testCode,
            reason: 'No matching patient test found'
          });
          continue;
        }

        // Process each patient test (usually just one)
        for (const patientTest of patientTests) {
          console.log(`[MACHINE API RESULTS] Processing patientTestId=${patientTest.id}`);
          
          // Store each parameter as a TestResult
          for (const [paramCode, value] of Object.entries(parameters)) {
            console.log(`[MACHINE API RESULTS] Looking for parameter: ${paramCode}`);
            
            // Find the test parameter by parameterCode or machineCode
            let testParam = await prisma.testParameter.findFirst({
              where: {
                testId: patientTest.testId,
                OR: [
                  { parameterCode: paramCode },
                  { machineCode: paramCode }
                ]
              }
            });

            // If not found by testId, try global search
            if (!testParam) {
              testParam = await prisma.testParameter.findFirst({
                where: {
                  OR: [
                    { parameterCode: paramCode },
                    { machineCode: paramCode }
                  ]
                }
              });
            }

            if (!testParam) {
              console.warn(`[MACHINE API] Parameter not found: ${paramCode} for test ${testCode}`);
              failedResults.push({
                testCode: testCode,
                paramCode: paramCode,
                reason: `Parameter '${paramCode}' not configured in system`
              });
              continue;
            }

            console.log(`[MACHINE API RESULTS] Found testParameterId=${testParam.id}, storing value: ${value}`);

            // Create or update TestResult
            await prisma.testResult.upsert({
              where: {
                patientTestId_testParameterId: {
                  patientTestId: patientTest.id,
                  testParameterId: testParam.id
                }
              },
              create: {
                patientTestId: patientTest.id,
                testParameterId: testParam.id,
                numericValue: isNaN(value) ? null : parseFloat(value),
                textValue: value,
                enteredBy: 'MACHINE',
                enteredAt: new Date()
              },
              update: {
                numericValue: isNaN(value) ? null : parseFloat(value),
                textValue: value,
                enteredAt: new Date()
              }
            });
          }

          // Update PatientTest status to "Entered"
          await prisma.patientTest.update({
            where: { id: patientTest.id },
            data: {
              status: 'Entered',
              lastStatusUpdateAt: new Date()
            }
          });

          resultsProcessed++;
        }
      } catch (err) {
        console.error(`[MACHINE API] Error processing result for ${result.testCode}:`, err.message);
        console.error(`[MACHINE API] Stack:`, err.stack);
        failedResults.push({
          testCode: result.testCode,
          reason: err.message
        });
      }
    }

    console.log(`[MACHINE API] Results: ${visitId}/${sampleId} - Processed ${resultsProcessed} test(s)`);

    return res.status(200).json({
      success: true,
      message: 'Results processed successfully',
      visitId: visitId,
      sampleId: sampleId,
      resultsProcessed: resultsProcessed,
      failedResults: failedResults.length > 0 ? failedResults : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[MACHINE API ERROR] submitResults:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process results',
      error: err.message
    });
  }
};

/**
 * Health check endpoint for machines
 * GET /api/machine/v1/health
 */
export const healthCheck = async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      message: 'Machine API is healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (err) {
    console.error('[MACHINE API ERROR] healthCheck:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Machine API health check failed',
      error: err.message
    });
  }
};
