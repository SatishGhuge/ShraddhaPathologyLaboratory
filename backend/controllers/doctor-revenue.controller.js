import prisma from '../config/database.js';

// DEBUG: Test endpoint to check database content
export const debugDoctorRevenue = async (req, res) => {
  try {
    console.log('\n🔍 DEBUG ENDPOINT CALLED\n');

    // Get all patient tests
    const allTests = await prisma.patientTest.findMany({
      select: {
        id: true,
        visitId: true,
        visitDate: true,
        referralDoctor: true,
        testId: true,
        charge: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
            patientId: true
          }
        },
        test: {
          select: {
            name: true
          }
        }
      },
      orderBy: { visitDate: 'desc' },
      take: 20
    });

    console.log(`📊 Total patient tests in database: ${allTests.length}`);
    console.log('\n📋 All tests (last 20):');
    allTests.forEach((t, i) => {
      const dateStr = t.visitDate ? new Date(t.visitDate).toISOString() : 'null';
      console.log(`${i+1}. ID:${t.id} | Date:${dateStr} | RefDoctor:"${t.referralDoctor}" | Test:${t.test.name} | Patient:${t.patient.firstName} ${t.patient.lastName}`);
    });

    // Filter for referral doctors
    const withRefDoctors = allTests.filter(t => t.referralDoctor && t.referralDoctor !== 'SELF' && t.referralDoctor !== '');
    console.log(`\n👨‍⚕️ Tests WITH referral doctors: ${withRefDoctors.length}`);
    withRefDoctors.forEach((t, i) => {
      const dateStr = t.visitDate ? new Date(t.visitDate).toISOString().split('T')[0] : 'null';
      console.log(`${i+1}. Date:${dateStr} | Doctor:${t.referralDoctor} | Patient:${t.patient.firstName}`);
    });

    // Get yesterday's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    console.log(`\n📅 Today's date (00:00): ${today.toISOString()}`);
    console.log(`📅 Yesterday's date (00:00): ${yesterday.toISOString()}`);

    // Find yesterday's tests
    const yesterdayTests = await prisma.patientTest.findMany({
      where: {
        visitDate: {
          gte: yesterday,
          lt: today
        }
      },
      select: {
        id: true,
        visitDate: true,
        referralDoctor: true,
        patient: {
          select: {
            firstName: true
          }
        }
      }
    });

    console.log(`\n📅 Tests registered YESTERDAY: ${yesterdayTests.length}`);
    yesterdayTests.forEach((t, i) => {
      console.log(`${i+1}. visitDate:${t.visitDate} | refDoctor:"${t.referralDoctor}" | patient:${t.patient.firstName}`);
    });

    // Check doctor charges
    const doctorCharges = await prisma.doctorTestCharge.findMany({
      select: {
        id: true,
        testId: true,
        doctorId: true,
        discountR: true,
        discountS: true,
        doctor: {
          select: {
            name: true
          }
        },
        test: {
          select: {
            name: true
          }
        }
      },
      take: 10
    });

    console.log(`\n💰 Doctor test charges in database: ${doctorCharges.length}`);
    doctorCharges.slice(0, 5).forEach((dc, i) => {
      console.log(`${i+1}. Doctor:${dc.doctor.name} | Test:${dc.test.name} | DiscountR:${dc.discountR} | DiscountS:${dc.discountS}`);
    });

    res.json({
      success: true,
      debug: {
        totalTests: allTests.length,
        testsWithRefDoctors: withRefDoctors.length,
        yesterdayTests: yesterdayTests.length,
        doctorChargesCount: doctorCharges.length,
        allTests: allTests.slice(0, 10),
        yesterdayTestsDetail: yesterdayTests,
        doctorChargesDetail: doctorCharges.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get doctor referral revenue - Fetch patient tests with doctor charges
export const getDoctorReferralRevenue = async (req, res) => {
  try {
    const { fromDate, toDate, doctorName } = req.query;
    
    console.log('📥 getDoctorReferralRevenue called with:');
    console.log('   fromDate:', fromDate);
    console.log('   toDate:', toDate);
    console.log('   doctorName:', doctorName);

    // Build where condition
    const whereCondition = {
      referralDoctor: {
        not: null,
        notIn: ['SELF', '']
      }
    };

    // Add date range filter if provided
    if (fromDate && toDate) {
      // Parse date string (YYYY-MM-DD) correctly
      const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
      const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
      
      // Create dates in local timezone (not UTC)
      const startDate = new Date(fromYear, fromMonth - 1, fromDay, 0, 0, 0, 0);
      const endDate = new Date(toYear, toMonth - 1, toDay, 23, 59, 59, 999);

      whereCondition.visitDate = {
        gte: startDate,
        lte: endDate
      };
      
      console.log('📅 Date filter (local timezone):');
      console.log('   Requested fromDate:', fromDate, '→ Start:', startDate);
      console.log('   Requested toDate:', toDate, '→ End:', endDate);
      console.log('   Filter: visitDate between', startDate, 'and', endDate);
    }

    // Filter by specific doctor if provided
    if (doctorName) {
      whereCondition.referralDoctor = doctorName;
    }

    console.log('   Where condition:', JSON.stringify(whereCondition, null, 2));

    // Fetch patient tests with related data
    const patientTests = await prisma.patientTest.findMany({
      where: whereCondition,
      include: {
        patient: {
          select: {
            patientId: true,
            firstName: true,
            lastName: true
          }
        },
        test: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        visitDate: 'desc'
      }
    });

    console.log(`✅ Found ${patientTests.length} patient tests with referral doctors`);
    
    if (patientTests.length > 0) {
      console.log('   First 3 tests found:');
      patientTests.slice(0, 3).forEach((t, i) => {
        console.log(`   ${i+1}. visitDate: ${t.visitDate}, doctor: ${t.referralDoctor}, patient: ${t.patient.firstName} ${t.patient.lastName}`);
      });
    } else {
      console.log('⚠️  NO DATA FOUND for the selected date range!');
      console.log('📊 DEBUGGING: Checking ALL patient tests in database...');
      
      // Debug: Check ALL patient tests regardless of filters
      const allTests = await prisma.patientTest.findMany({
        select: {
          id: true,
          referralDoctor: true,
          visitDate: true,
          patientId: true,
          patient: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { visitDate: 'desc' },
        take: 10
      });
      
      console.log(`📋 Latest 10 patient tests in database (regardless of referral doctor):`);
      allTests.forEach((t, i) => {
        const dateStr = t.visitDate ? new Date(t.visitDate).toISOString().split('T')[0] : 'null';
        console.log(`   ${i+1}. Date: ${dateStr}, Doctor: "${t.referralDoctor}", Patient: ${t.patient.firstName} ${t.patient.lastName}, ID: ${t.id}`);
      });
      
      // Check specifically for tests with referral doctors
      const withDoctors = await prisma.patientTest.findMany({
        where: {
          referralDoctor: {
            not: null,
            notIn: ['SELF', '']
          }
        },
        select: {
          id: true,
          referralDoctor: true,
          visitDate: true
        },
        orderBy: { visitDate: 'desc' },
        take: 5
      });
      
      console.log(`\n👨‍⚕️ Tests WITH referral doctors in database:`);
      if (withDoctors.length === 0) {
        console.log('   ⚠️ ZERO tests have referral doctors set!');
        console.log('   → You need to register patients with referral doctors first');
      } else {
        withDoctors.forEach((t, i) => {
          const dateStr = t.visitDate ? new Date(t.visitDate).toISOString().split('T')[0] : 'null';
          console.log(`   ${i+1}. Date: ${dateStr}, Doctor: "${t.referralDoctor}"`);
        });
      }
    }

    // Fetch all doctors once and create a normalized lookup map
    const allDoctors = await prisma.doctor.findMany({
      select: { id: true, name: true }
    });
    
    console.log(`📋 Loaded ${allDoctors.length} doctors for matching`);
    
    // Create a map for fast normalized lookups
    const doctorsByNormalizedName = {};
    allDoctors.forEach(doctor => {
      const normalized = doctor.name
        .toLowerCase()
        .trim()
        .replace(/^dr\.\s+/, '')
        .replace(/\s+/g, ' ');
      
      if (!doctorsByNormalizedName[normalized]) {
        doctorsByNormalizedName[normalized] = doctor;
      }
    });

    // For each patient test, fetch doctor charges
    const revenue = await Promise.all(
      patientTests.map(async (pt) => {
        // Normalize the referral doctor name for matching
        const normalizedRefDoctor = pt.referralDoctor
          ?.toLowerCase()
          .trim()
          .replace(/^dr\.\s+/, '') // Remove "Dr. " prefix if present
          .replace(/\s+/g, ' ') || '';
        
        console.log(`   Looking for doctor: "${pt.referralDoctor}" -> normalized: "${normalizedRefDoctor}"`);
        
        // Find matching doctor from our map
        const matchedDoctor = doctorsByNormalizedName[normalizedRefDoctor];

        if (!matchedDoctor) {
          console.log(`      ⚠️  Doctor not found: ${pt.referralDoctor}`);
          return null;
        }

        console.log(`      ✅ Found doctor: ${matchedDoctor.name} (ID: ${matchedDoctor.id})`);

        // Fetch doctor charges for this test (customized charges)
        const doctorCharge = await prisma.doctorTestCharge.findFirst({
          where: {
            testId: pt.testId,
            doctorId: matchedDoctor.id
          },
          select: {
            discountR: true,
            discountS: true
          }
        });

        // If no customized charge, fetch default test charge as fallback
        let defaultCharge = null;
        if (!doctorCharge) {
          console.log(`      ℹ️  No customized charge found for doctor ${matchedDoctor.name}, test ${pt.testId}. Looking for default...`);
          defaultCharge = await prisma.testCharge.findFirst({
            where: {
              testId: pt.testId,
              organizationId: pt.organizationId  // Match the patient's organization
            },
            select: {
              b2cCharge: true,
              b2bCharge: true
            }
          });
          
          if (defaultCharge) {
            console.log(`      ✅ Found default charge: B2C=${defaultCharge.b2cCharge}, B2B=${defaultCharge.b2bCharge}`);
          } else {
            console.log(`      ⚠️  No default charge found for test ${pt.testId}, organization ${pt.organizationId}`);
          }
        } else {
          console.log(`      ✅ Found customized charge: discountR=${doctorCharge.discountR}, discountS=${doctorCharge.discountS}`);
        }

        // Determine the actual charges to use
        let discountR, discountS, netAmount;
        
        if (doctorCharge) {
          // Use customized charges if they exist
          discountR = doctorCharge.discountR || 0;
          discountS = doctorCharge.discountS || 0;
        } else if (defaultCharge) {
          // Fall back to default charges
          discountR = defaultCharge.b2cCharge || 0;  // Use B2C as default regular price
          discountS = defaultCharge.b2bCharge || 0;  // Use B2B as special price (if customized)
        } else {
          // No charges found at all
          discountR = 0;
          discountS = 0;
        }
        
        // Doctor gets the special price (discountS), or regular price if no special price
        netAmount = discountS > 0 ? discountS : discountR;

        return {
          id: pt.id,
          visitId: pt.visitId,
          patientId: pt.patient.patientId,
          patientName: `${pt.patient.firstName || ''} ${pt.patient.lastName || ''}`.trim(),
          testId: pt.testId,
          testName: pt.test.name,
          testShortName: pt.test.shortName || pt.test.name,
          doctorId: matchedDoctor.id,
          doctorName: pt.referralDoctor,
          organization: pt.organization?.name || pt.organizationId || '-',
          visitDate: pt.visitDate,
          billAmount: parseFloat(pt.charge) || 0,
          discountR: discountR,  // Regular price (customized or default)
          discountS: discountS,  // Special price (customized or default)
          netAmount: netAmount,  // What doctor gets
          paymentMode: pt.paymentMode || '-',
          paidAmount: parseFloat(pt.paidAmount) || 0,
          balanceAmount: parseFloat(pt.balanceAmount) || 0,
          paymentStatus: parseFloat(pt.balanceAmount) <= 0 ? 'Paid' : 'Unpaid'
        };
      })
    );

    // Filter out null values (doctors not found)
    const validRevenue = revenue.filter(r => r !== null);

    console.log(`📤 Returning ${validRevenue.length} valid revenue records`);

    res.json({
      success: true,
      data: validRevenue,
      count: validRevenue.length
    });
  } catch (error) {
    console.error('❌ Get doctor referral revenue error:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor referral revenue',
      error: error.message
    });
  }
};
