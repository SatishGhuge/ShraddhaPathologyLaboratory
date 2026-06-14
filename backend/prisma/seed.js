import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Sample types with their colors
  const sampleTypes = [
    { Sample_Type: 'Body fluid', Sample_Color: '' },
    { Sample_Type: 'Campylobacter jejuni', Sample_Color: 'gray' },
    { Sample_Type: 'Drain fluid', Sample_Color: '' },
    { Sample_Type: 'EDTA Plasma', Sample_Color: 'purple' },
    { Sample_Type: 'EDTA WB', Sample_Color: 'purple' },
    { Sample_Type: 'Fluoride Plasma-F', Sample_Color: 'gray' },
    { Sample_Type: 'Fluoride Plasma-PP', Sample_Color: 'gray' },
    { Sample_Type: 'Fluoride Plasma-RBS', Sample_Color: 'gray' },
    { Sample_Type: 'Heparinised Blood', Sample_Color: '' },
    { Sample_Type: 'Lithium Heparin', Sample_Color: 'green' },
    { Sample_Type: 'Nasopharyngeal swab', Sample_Color: '' },
    { Sample_Type: 'PUS', Sample_Color: '' },
    { Sample_Type: 'Serum', Sample_Color: 'red' },
    { Sample_Type: 'Skin biopsy sample', Sample_Color: '' },
    { Sample_Type: 'Sodium Citrate 3.2 % plasma specimen', Sample_Color: 'blue' },
    { Sample_Type: 'Stool', Sample_Color: 'Yellow' },
    { Sample_Type: 'Swab', Sample_Color: '' },
    { Sample_Type: 'Throat swab', Sample_Color: '' },
    { Sample_Type: 'Tissue specimen (Formalin)', Sample_Color: '' },
    { Sample_Type: 'Tissue specimen (Saline)', Sample_Color: '' },
    { Sample_Type: 'Urine', Sample_Color: '' },
    { Sample_Type: 'Vaginal swab', Sample_Color: '' },
    { Sample_Type: 'WB in Culture Bottle', Sample_Color: '' },
    { Sample_Type: 'Wound Swab', Sample_Color: '' },
  ];

  try {
    for (const sampleType of sampleTypes) {
      const existing = await prisma.sample_type.findUnique({
        where: { Sample_Type: sampleType.Sample_Type },
      });

      if (!existing) {
        await prisma.sample_type.create({
          data: sampleType,
        });
        console.log(`✅ Created: ${sampleType.Sample_Type}`);
      } else {
        console.log(`⏭️  Already exists: ${sampleType.Sample_Type}`);
      }
    }

    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
