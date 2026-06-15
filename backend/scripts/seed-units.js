import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, 'seed-data.json'), 'utf-8'));

async function seedUnits() {
  console.log('🔬 Seeding test units...\n');
  
  if (!data.units || data.units.length === 0) {
    console.log('⚠️  No units in seed-data.json, skipping');
    return 0;
  }

  let count = 0;
  for (const unit of data.units) {
    try {
      await prisma.unit.upsert({
        where: { symbol: unit.symbol },
        update: { isActive: unit.isActive ?? true },
        create: { symbol: unit.symbol, isActive: unit.isActive ?? true },
      });
      console.log(`  ✅ ${unit.symbol}`);
      count++;
    } catch (err) {
      console.error(`  ❌ Error seeding unit "${unit.symbol}":`, err.message);
    }
  }
  
  return count;
}

async function main() {
  console.log('🌱 Starting units seed...\n');
  
  try {
    const count = await seedUnits();
    console.log(`\n✅ Seeding completed! Added ${count} units`);
    
    // Show summary
    const total = await prisma.unit.count();
    console.log(`\n📊 Total units in database: ${total}`);
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
