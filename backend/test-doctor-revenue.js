/**
 * TEST SCRIPT: Doctor Referral Revenue Debug
 * Run this file to test the data flow
 * 
 * Usage: node test-doctor-revenue.js
 */

import prisma from './config/database.js';

async function runTests() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 DOCTOR REFERRAL REVENUE - TEST SUITE');
    console.log('='.repeat(80) + '\n');

    // ===== TEST 1: Check database connection =====
    console.log('TEST 1: Database Connection');
    console.log('-'.repeat(40));
    const testConnection = await prisma.patient.findFirst();
    console.log('✅ Database connected\n');

    // ===== TEST 2: Count all tests =====
    console.log('TEST 2: Total Tests in Database');
    console.log('-'.repeat(40));
    const totalTests = await prisma.patientTest.count();
    console.log(`Total patient tests: ${totalTests}`);
    console.log('');

    // ===== TEST 3: Tests with referral doctors =====
    console.log('TEST 3: Tests WITH Referral Doctors');
    console.log('-'.repeat(40));
    const testsWithDoctors = await prisma.patientTest.findMany({
      where: {
        referralDoctor: {
          not: null,
          notIn: ['SELF', '']
        }
      },
      select: {
        id: true,
        visitId: true,
        visitDate: true,
        referralDoctor: true,
        testId: true,
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        test: {
          select: {
            name: true
          }
        }
      },
      orderBy: { visitDate: 'desc' }
    });

    console.log(`Total tests with referral doctors: ${testsWithDoctors.length}\n`);
    
    if (testsWithDoctors.length > 0) {
      console.log('Latest 5 tests with referral doctors:');
      testsWithDoctors.slice(0, 5).forEach((t, i) => {
        const dateStr = t.visitDate ? new Date(t.visitDate).toISOString().split('T')[0] : 'null';
        console.log(`  ${i+1}. ${dateStr} | Dr. ${t.referralDoctor} | ${t.patient.firstName} ${t.patient.lastName} | Test: ${t.test.name}`);
      });
    } else {
      console.log('⚠️  NO TESTS WITH REFERRAL DOCTORS FOUND!');
      console.log('You need to register patients with referral doctors.\n');
    }
    console.log('');

    // ===== TEST 4: Yesterday's tests =====
    console.log('TEST 4: Tests Registered YESTERDAY');
    console.log('-'.repeat(40));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    console.log(`Today (00:00): ${today.toISOString()}`);
    console.log(`Yesterday (00:00): ${yesterday.toISOString()}`);
    console.log(`Tomorrow (00:00): ${tomorrowStart.toISOString()}\n`);

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
        },
        test: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`Tests registered yesterday: ${yesterdayTests.length}\n`);
    
    if (yesterdayTests.length > 0) {
      console.log('Yesterday\'s tests:');
      yesterdayTests.forEach((t, i) => {
        console.log(`  ${i+1}. ${t.visitDate} | RefDoctor: "${t.referralDoctor}" | Patient: ${t.patient.firstName} | Test: ${t.test.name}`);
      });
    } else {
      console.log('❌ No tests found for yesterday');
    }
    console.log('');

    // ===== TEST 5: Yesterday's tests WITH referral doctors =====
    console.log('TEST 5: Yesterday\'s Tests WITH Referral Doctors');
    console.log('-'.repeat(40));
    
    const yesterdayWithDoctors = await prisma.patientTest.findMany({
      where: {
        visitDate: {
          gte: yesterday,
          lt: today
        },
        referralDoctor: {
          not: null,
          notIn: ['SELF', '']
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

    console.log(`Yesterday's tests with referral doctors: ${yesterdayWithDoctors.length}\n`);
    
    if (yesterdayWithDoctors.length > 0) {
      console.log('✅ FOUND! Yesterday\'s referral tests:');
      yesterdayWithDoctors.forEach((t, i) => {
        console.log(`  ${i+1}. Date: ${t.visitDate} | Doctor: ${t.referralDoctor} | Patient: ${t.patient.firstName}`);
      });
    } else {
      console.log('❌ NO yesterday tests with referral doctors');
    }
    console.log('');

    // ===== TEST 6: Doctor charges table =====
    console.log('TEST 6: Doctor Test Charges');
    console.log('-'.repeat(40));
    
    const doctorCharges = await prisma.doctorTestCharge.count();
    console.log(`Total doctor test charges: ${doctorCharges}`);

    if (doctorCharges > 0) {
      const charges = await prisma.doctorTestCharge.findMany({
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
        take: 5
      });

      console.log('\nLatest 5 doctor charges:');
      charges.forEach((dc, i) => {
        console.log(`  ${i+1}. Dr. ${dc.doctor.name} | Test: ${dc.test.name} | DiscountR: ${dc.discountR} | DiscountS: ${dc.discountS}`);
      });
    } else {
      console.log('⚠️  No doctor charges configured');
    }
    console.log('');

    // ===== TEST 7: Simulate date filter from getDoctorReferralRevenue =====
    console.log('TEST 7: Simulate /doctor-revenue Endpoint (Yesterday)');
    console.log('-'.repeat(40));
    
    const fromDate = '2026-07-03'; // Yesterday
    const toDate = '2026-07-03';

    const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
    const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
    
    const startDate = new Date(fromYear, fromMonth - 1, fromDay, 0, 0, 0, 0);
    const endDate = new Date(toYear, toMonth - 1, toDay, 23, 59, 59, 999);

    console.log(`Query date: ${fromDate}`);
    console.log(`Start filter: ${startDate.toISOString()}`);
    console.log(`End filter: ${endDate.toISOString()}\n`);

    const simulatedQuery = await prisma.patientTest.findMany({
      where: {
        referralDoctor: {
          not: null,
          notIn: ['SELF', '']
        },
        visitDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        visitDate: true,
        referralDoctor: true,
        testId: true,
        patient: {
          select: {
            firstName: true
          }
        }
      }
    });

    console.log(`Results from simulated query: ${simulatedQuery.length}`);
    if (simulatedQuery.length > 0) {
      console.log('✅ QUERY RETURNED DATA!');
      simulatedQuery.forEach((t, i) => {
        console.log(`  ${i+1}. ${t.visitDate} | Dr. ${t.referralDoctor} | ${t.patient.firstName}`);
      });
    } else {
      console.log('❌ QUERY RETURNED NO DATA');
    }
    console.log('');

    // ===== SUMMARY =====
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total tests: ${totalTests}`);
    console.log(`Tests with referral doctors: ${testsWithDoctors.length}`);
    console.log(`Yesterday's tests: ${yesterdayTests.length}`);
    console.log(`Yesterday's tests with referral doctors: ${yesterdayWithDoctors.length}`);
    console.log(`Doctor charges configured: ${doctorCharges}`);
    console.log('');

    if (yesterdayWithDoctors.length === 0) {
      console.log('⚠️  RECOMMENDATION:');
      console.log('Register a patient YESTERDAY with a referral doctor to test the feature.');
      console.log('');
    }

    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
runTests();
