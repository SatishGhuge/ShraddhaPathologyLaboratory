import prisma from '../config/database.js';

async function addModuleAllocationColumn() {
  try {
    console.log('🔍 Checking if moduleAllocation column exists...');
    
    // Try to query the column
    const result = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'moduleAllocation'
    `;
    
    if (result && result.length > 0) {
      console.log('✅ moduleAllocation column already exists');
      return;
    }
    
    console.log('➕ Adding moduleAllocation column...');
    await prisma.$executeRaw`
      ALTER TABLE users ADD COLUMN moduleAllocation LONGTEXT DEFAULT NULL
    `;
    
    console.log('✅ moduleAllocation column added successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('Duplicate column')) {
      console.log('✅ Column already exists');
    }
  } finally {
    await prisma.$disconnect();
  }
}

addModuleAllocationColumn();
