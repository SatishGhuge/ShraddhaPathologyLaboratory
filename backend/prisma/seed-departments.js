import prisma from '../config/database.js';

const seedDepartments = async () => {
  try {
    console.log('🌱 Seeding departments...\n');

    const departments = [
      { name: 'BIOCHEMISTRY', code: 'BIO' },
      { name: 'Clinical Chemistry', code: 'CC' },
      { name: 'CLINICAL PATHOLOGY / MICROBIOLOGY', code: 'CP/MICRO' },
      { name: 'GLUCOSE', code: 'GLU' },
      { name: 'HEAMATOLOGY', code: 'HAE' },
      { name: 'Hematology', code: 'HEM' },
      { name: 'IMMUNOLOGY', code: 'IMM' },
      { name: 'Microbiology', code: 'MB' },
      { name: 'OUTSOURCE', code: 'OUT' },
      { name: 'SEROLOGY', code: 'SERO' },
      { name: 'URI', code: 'CLINICAL PATHOLOGY' }
    ];

    for (const dept of departments) {
      const existing = await prisma.department.findUnique({
        where: { name: dept.name }
      });

      if (!existing) {
        await prisma.department.create({
          data: {
            name: dept.name,
            code: dept.code,
            isActive: true,
            isDeleted: false
          }
        });
        console.log(`✅ Created department: ${dept.name}`);
      } else {
        console.log(`⏭️  Already exists: ${dept.name}`);
      }
    }

    console.log('\n🎉 Departments seeded successfully!\n');

    // Show all departments
    const allDepts = await prisma.department.findMany({
      orderBy: { name: 'asc' }
    });

    console.log('📋 All Departments:');
    allDepts.forEach((dept, idx) => {
      console.log(`   ${idx + 1}. ${dept.name} (${dept.code})`);
    });

  } catch (error) {
    console.error('❌ Error seeding departments:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

seedDepartments();
