import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function migrateEntryIds() {
  try {
    console.log('🔄 Migrating entry IDs to new format...\n');
    
    const entries = await prisma.stockEntry.findMany({
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${entries.length} entries to migrate\n`);

    const updatePromises = entries.map((entry, index) => {
      const createdDate = new Date(entry.createdAt);
      const day = String(createdDate.getDate()).padStart(2, '0');
      const month = String(createdDate.getMonth() + 1).padStart(2, '0');
      const year = String(createdDate.getFullYear()).slice(-2);
      const dateFormat = `${day}${month}${year}`;
      
      // Get sequence number based on index (just to make them unique)
      const sequenceNumber = String(index + 1).padStart(3, '0');
      const newEntryId = `SE-${dateFormat}-${sequenceNumber}`;
      
      console.log(`  ${entry.entryId} → ${newEntryId}`);
      
      return prisma.stockEntry.update({
        where: { id: entry.id },
        data: { entryId: newEntryId }
      });
    });

    await Promise.all(updatePromises);
    
    console.log('\n✅ Migration completed!');
    
    console.log('\n📋 Updated entries:');
    const updatedEntries = await prisma.stockEntry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    updatedEntries.forEach(entry => {
      console.log(`  - ${entry.entryId} (Created: ${entry.createdAt.toISOString()})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrateEntryIds();
