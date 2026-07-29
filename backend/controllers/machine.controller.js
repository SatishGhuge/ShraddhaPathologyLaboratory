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
 * Returns test orders filtered by machine type
 */
export const queryWorklist = async (req, res) => {
  try {
    const { visitId, sampleId, analyzer } = req.query;

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

    // Normalize analyzer name from machine (e.g., "Sysmex^XN-350" -> "Sysmex XN-350")
    const normalizedAnalyzer = normalizeAnalyzerName(analyzer);

    // Find machine in database
    const machine = await prisma.machine.findFirst({
      where: {
        name: normalizedAnalyzer,
        isActive: true
      }
    });

    // If machine not found, return empty tests (no error)
    if (!machine) {
      console.warn(`[MACHINE API] Machine not found: ${analyzer} (normalized: ${normalizedAnalyzer})`);
      return res.status(200).json({
        success: true,
        data: {
          visitId: visitId,
          sampleId: sampleId,
          patientTests: [],
          message: 'Machine not configured or inactive'
        }
      });
    }

    // Find all patient tests for this visit, sample, AND machine
    const patientTests = await prisma.patientTest.findMany({
      where: {
        visitId: visitId,
        sample: sampleId,
        test: {
          machineId: machine.id
        }
      },
      include: {
        patient: true,
        test: true,
        department: true
      }
    });

    // If no tests found for this machine, return empty array
    if (patientTests.length === 0) {
      console.log(`[MACHINE API] No tests found for ${analyzer}/${visitId}/${sampleId}`);
      return res.status(200).json({
        success: true,
        data: {
          visitId: visitId,
          sampleId: sampleId,
          patientTests: [],
          message: 'No tests assigned to this machine for this sample'
        }
      });
    }

    // Get unique patient info from first record
    const patient = patientTests[0].patient;

    // Build response with test details
    const response = {
      visitId: visitId,
      sampleId: sampleId,
      patientId: patient.patientId,
      patientName: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
      machineId: machine.id,
      machineName: machine.name,
      patientTests: patientTests.map(pt => ({
        patientTestId: pt.id,
        testCode: pt.test.testCode || pt.test.name,
        testName: pt.test.name,
        departmentId: pt.departmentId,
        departmentName: pt.department?.name || 'Unknown'
      })),
      priority: 'N',
      timestamp: new Date().toISOString()
    };

    console.log(`[MACHINE API] Query: ${analyzer}/${visitId}/${sampleId} - Found ${patientTests.length} test(s)`);

    return res.status(200).json({
      success: true,
      data: response
    });
  } catch (err) {
    console.error('[MACHINE API ERROR] queryWorklist:', err.message);
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

        // Find patient tests by visitId, sampleId, and testCode
        const patientTests = await prisma.patientTest.findMany({
          where: {
            visitId: visitId,
            sample: sampleId,
            test: {
              testCode: testCode
            }
          },
          include: {
            test: {
              include: {
                ownedParameters: true
              }
            }
          }
        });

        if (patientTests.length === 0) {
          failedResults.push({
            testCode: testCode,
            reason: 'No matching patient test found'
          });
          continue;
        }

        // Process each patient test (usually just one)
        for (const patientTest of patientTests) {
          // Store each parameter as a TestResult
          for (const [paramCode, value] of Object.entries(parameters)) {
            // Find the test parameter
            const testParam = await prisma.testParameter.findFirst({
              where: {
                OR: [
                  { parameterCode: paramCode },
                  { machineCode: paramCode }
                ]
              }
            });

            if (!testParam) {
              console.warn(`[MACHINE API] Parameter not found: ${paramCode}`);
              continue;
            }

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
