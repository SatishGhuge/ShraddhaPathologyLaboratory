const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding HSN codes...');

  const hsnCodes = [
    { hsnCode: '9027', category: 'Medical Instruments', gstRate: 18 },
    { hsnCode: '3002', category: 'Human Blood & Animal Blood', gstRate: 12 },
    { hsnCode: '3822', category: 'Diagnostic Reagents', gstRate: 12 },
    { hsnCode: '3926', category: 'Plastic Labware', gstRate: 18 },
    { hsnCode: '7017', category: 'Laboratory Glassware', gstRate: 18 },
  ];

  for (const hsn of hsnCodes) {
    try {
      await prisma.hSNCode.upsert({
        where: { hsnCode: hsn.hsnCode },
        update: hsn,
        create: hsn,
      });
      console.log(`Upserted HSN Code: ${hsn.hsnCode}`);
    } catch (e) {
      console.error(`Error with ${hsn.hsnCode}:`, e.message);
    }
  }

  console.log('HSN code seeding completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
