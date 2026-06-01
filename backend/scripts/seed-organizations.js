import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOrganizations() {
  try {
    console.log('🏢 Seeding organizations...\n');

    // Create Main Lab
    const mainLab = await prisma.organization.upsert({
      where: { id: 'ORG-AAA' },
      update: {
        isActive: true
      },
      create: {
        id: 'ORG-AAA',
        name: 'Main Lab',
        code: 'ML001',
        location: 'Pune',
        address: 'Main Lab Address, Pune',
        mobile: '9876543210',
        email: 'mainlab@shraddha.com',
        isActive: true
      }
    });
    console.log('✅ Created/Updated Main Lab:');
    console.log(`   ID: ${mainLab.id}`);
    console.log(`   Name: ${mainLab.name}`);
    console.log(`   Location: ${mainLab.location}`);

    // Create Branch Lab
    const branchLab = await prisma.organization.upsert({
      where: { id: 'ORG-AAB' },
      update: {
        isActive: true
      },
      create: {
        id: 'ORG-AAB',
        name: 'Branch Lab',
        code: 'BL001',
        location: 'Mumbai',
        address: 'Branch Lab Address, Mumbai',
        mobile: '9876543211',
        email: 'branchlab@shraddha.com',
        isActive: true
      }
    });
    console.log('\n✅ Created/Updated Branch Lab:');
    console.log(`   ID: ${branchLab.id}`);
    console.log(`   Name: ${branchLab.name}`);
    console.log(`   Location: ${branchLab.location}`);

    console.log('\n🎉 Organization seeding completed successfully!');
    
    // Show summary
    const orgCount = await prisma.organization.count();
    console.log(`\n📊 Total organizations in database: ${orgCount}`);

  } catch (error) {
    console.error('❌ Error seeding organizations:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedOrganizations();
