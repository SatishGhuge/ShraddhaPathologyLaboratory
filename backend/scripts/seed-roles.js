import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRoles() {
  console.log('\n🔐 Seeding default roles...');
  
  const roles = [
    'Technician',
    'Manager',
    'Admin',
    'Doctor',
    'Receptionist',
    'Lab Manager',
    'Super Admin',
  ];

  for (const roleName of roles) {
    try {
      const existingRole = await prisma.role.findUnique({
        where: { name: roleName }
      });

      if (existingRole) {
        console.log(`  ℹ️  Role already exists: ${roleName}`);
        continue;
      }

      const role = await prisma.role.create({
        data: {
          name: roleName,
          isActive: true
        }
      });
      console.log(`  ✅ Created role: ${role.name}`);
    } catch (error) {
      console.error(`  ❌ Error creating role ${roleName}:`, error.message);
    }
  }

  console.log('\n✅ Role seeding complete!');
  console.log(`📊 Total roles in database: ${await prisma.role.count()}`);
  
  // List all roles
  const allRoles = await prisma.role.findMany({
    orderBy: { name: 'asc' }
  });
  console.log('\n📋 Available roles:');
  allRoles.forEach(r => console.log(`   • ${r.name}`));
  
  await prisma.$disconnect();
}

seedRoles().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
