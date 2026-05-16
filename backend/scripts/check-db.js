import prisma from '../config/database.js';

async function main() {
  const tables = await prisma.$queryRaw`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`;
  console.log('TABLES:', tables.map(t => t.TABLE_NAME).join(', '));

  const cols = await prisma.$queryRaw`
    SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('users','signatures','patient_tests','tests','franchise','collection_centers')
    ORDER BY TABLE_NAME, ORDINAL_POSITION`;
  
  const grouped = {};
  for (const r of cols) {
    if (!grouped[r.TABLE_NAME]) grouped[r.TABLE_NAME] = [];
    grouped[r.TABLE_NAME].push(r.COLUMN_NAME);
  }
  for (const [t, c] of Object.entries(grouped)) {
    console.log(`\n${t}: ${c.join(', ')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
