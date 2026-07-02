/**
 * DATA MIGRATION: Convert uppercase statuses to title-case
 * 
 * This script converts old uppercase status values to the new title-case format:
 * REGISTERED → Registered
 * RECEIVED → Received
 * PROVISIONAL → Entered
 * AUTHENTICATED → Authorized
 * VALIDATED → Validation
 * VALIDATION → Validation
 * DELIVERED → Delivered
 * RETEST → Rectified
 * RECTIFIED → Rectified
 * REVERT → Rectified
 * HOLD → Validation
 * REJECTED → Validation
 * 
 * Usage: node migrate-status-format.js
 */

import prisma from './config/database.js';

const statusMapping = {
  'REGISTERED': 'Registered',
  'RECEIVED': 'Received',
  'PROVISIONAL': 'Entered',
  'AUTHENTICATED': 'Authorized',
  'VALIDATED': 'Validation',
  'VALIDATION': 'Validation',
  'DELIVERED': 'Delivered',
  'RETEST': 'Rectified',
  'RECTIFIED': 'Rectified',
  'REVERT': 'Rectified',
  'HOLD': 'Validation',
  'REJECTED': 'Validation'
};

async function migrateStatuses() {
  console.log('🔄 STATUS FORMAT MIGRATION\n');
  console.log('═'.repeat(60));

  try {
    // Check current status distribution
    console.log('\n📊 Current Status Distribution:');
    const beforeCount = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM patient_tests 
      GROUP BY status
    `;
    
    let totalBefore = 0;
    beforeCount.forEach(row => {
      console.log(`  "${row.status}": ${row.count} records`);
      totalBefore += row.count;
    });
    console.log(`  Total: ${totalBefore} records\n`);

    // Migrate each status
    let totalMigrated = 0;
    for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
      const result = await prisma.$executeRaw`
        UPDATE patient_tests 
        SET status = ${newStatus} 
        WHERE UPPER(status) = ${oldStatus}
      `;
      
      if (result > 0) {
        console.log(`✅ Migrated ${result} records: "${oldStatus}" → "${newStatus}"`);
        totalMigrated += result;
      }
    }

    // Verify migration
    console.log('\n✅ Verification - New Status Distribution:');
    const afterCount = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM patient_tests 
      GROUP BY status
    `;
    
    let totalAfter = 0;
    afterCount.forEach(row => {
      console.log(`  "${row.status}": ${row.count} records`);
      totalAfter += row.count;
    });
    console.log(`  Total: ${totalAfter} records\n`);

    if (totalBefore === totalAfter) {
      console.log(`✅ Migration successful: ${totalMigrated} records updated`);
    } else {
      console.log(`⚠️  Warning: Record count mismatch. Before: ${totalBefore}, After: ${totalAfter}`);
    }

  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
    console.log('\n' + '═'.repeat(60));
    console.log('Migration Complete\n');
  }
}

migrateStatuses();
