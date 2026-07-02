/**
 * DIAGNOSTIC SCRIPT: Sample Status Debug
 * Run this to identify why sample status transitions fail on VPS
 * 
 * Usage: node debug-sample-status.js
 */

import prisma from './config/database.js';

async function runDiagnostics() {
  console.log('🔍 SAMPLE STATUS WORKFLOW DIAGNOSTICS\n');
  console.log('═'.repeat(60));

  try {
    // 1. Check database connection
    console.log('\n✓ Step 1: Database Connection');
    const dbTest = await prisma.$queryRaw`SELECT 1`;
    console.log('  ✅ Database connection: OK');

    // 2. Check PatientTest table structure
    console.log('\n✓ Step 2: Database Table Structure');
    const tableInfo = await prisma.$queryRaw`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'patient_tests' 
      AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `;
    
    const requiredFields = ['status', 'barcode_status', 'sampleReceived', 'lastStatusUpdateAt', 'lastUpdatedBy'];
    const existingFields = tableInfo.map(col => col.COLUMN_NAME);
    
    requiredFields.forEach(field => {
      if (existingFields.includes(field)) {
        const colInfo = tableInfo.find(col => col.COLUMN_NAME === field);
        console.log(`  ✅ ${field}: ${colInfo.COLUMN_TYPE}`);
      } else {
        console.log(`  ❌ ${field}: MISSING - Database migration may not be applied`);
      }
    });

    // 3. Check TestStatusHistory table
    console.log('\n✓ Step 3: TestStatusHistory Table');
    try {
      const historyCount = await prisma.testStatusHistory.count();
      console.log(`  ✅ TestStatusHistory table exists: ${historyCount} records`);
    } catch (err) {
      console.log('  ❌ TestStatusHistory table: MISSING - Run: npx prisma migrate deploy');
    }

    // 4. Check status values in database
    console.log('\n✓ Step 4: Sample Status Values in Database');
    const statusDistribution = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM patient_tests 
      GROUP BY status 
      LIMIT 10
    `;
    
    console.log('  Status distribution:');
    statusDistribution.forEach(row => {
      console.log(`    - "${row.status}": ${row.count} records`);
    });

    // 5. Check for mismatched statuses
    console.log('\n✓ Step 5: Status Format Check');
    const uppercaseStatuses = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM patient_tests 
      WHERE status IN ('REGISTERED', 'RECEIVED', 'PROVISIONAL')
    `;
    
    const titlecaseStatuses = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM patient_tests 
      WHERE status IN ('Registered', 'Received', 'Entered')
    `;

    console.log(`  Uppercase statuses (REGISTERED, RECEIVED, etc): ${uppercaseStatuses[0].count}`);
    console.log(`  Title-case statuses (Registered, Received, etc): ${titlecaseStatuses[0].count}`);
    
    if (uppercaseStatuses[0].count > 0) {
      console.log('  ⚠️  WARNING: Found uppercase statuses. Needs data migration.');
      console.log('  To fix: Run data migration script below');
    }

    // 6. Check recent test records
    console.log('\n✓ Step 6: Recent Test Records');
    const recentTests = await prisma.patientTest.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        barcode_status: true,
        sampleReceived: true,
        createdAt: true
      }
    });
    
    if (recentTests.length === 0) {
      console.log('  ℹ️  No test records found in database');
    } else {
      recentTests.forEach((test, idx) => {
        console.log(`  Record ${idx + 1}:`);
        console.log(`    - ID: ${test.id}`);
        console.log(`    - Status: "${test.status}"`);
        console.log(`    - Barcode Status: "${test.barcode_status}"`);
        console.log(`    - Sample Received: ${test.sampleReceived}`);
      });
    }

    // 7. Test the status transition function
    console.log('\n✓ Step 7: Testing Status Transition Logic');
    if (recentTests.length > 0) {
      const testRecord = recentTests[0];
      const expectedStatus = 'Registered';
      const actualStatus = testRecord.status;
      
      if (actualStatus === expectedStatus) {
        console.log(`  ✅ Status format matches workflow (${expectedStatus})`);
      } else if (actualStatus === expectedStatus.toUpperCase()) {
        console.log(`  ⚠️  Status is uppercase (${actualStatus}) - needs data migration`);
      } else {
        console.log(`  ⚠️  Unexpected status format: "${actualStatus}"`);
      }
    }

  } catch (error) {
    console.error('❌ Error during diagnostics:', error.message);
    if (error.code === 'ER_BAD_TABLE_ERROR' || error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n⚠️  Database tables not found. Run migrations:');
      console.log('  cd backend && npx prisma migrate deploy');
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n' + '═'.repeat(60));
    console.log('📋 Diagnostics Complete\n');
  }
}

runDiagnostics();
