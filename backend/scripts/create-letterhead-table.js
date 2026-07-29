import prisma from '../config/database.js';

async function createLetterheadTable() {
  try {
    console.log('Creating letterhead table...');
    
    // Create the table using raw SQL
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS letterheads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        letterheadName VARCHAR(255) UNIQUE NOT NULL,
        headerImage LONGTEXT,
        footerImage LONGTEXT,
        isActive BOOLEAN DEFAULT true,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ Letterhead table created successfully!');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Letterhead table already exists');
      process.exit(0);
    }
    console.error('❌ Error creating letterhead table:', error);
    process.exit(1);
  }
}

createLetterheadTable();
