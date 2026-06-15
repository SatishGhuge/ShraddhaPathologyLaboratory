import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAdmins() {
  try {
    console.log('👤 Seeding admin users...\n');

    // Create Super Admin
    const superAdminPassword = await bcrypt.hash('Admin@123', 10);
    const superAdmin = await prisma.admin.upsert({
      where: { username: 'admin' },
      update: {
        password: superAdminPassword,
        role: 'SUPER_ADMIN',
        isActive: true
      },
      create: {
        username: 'admin',
        email: 'admin@shraddha.com',
        password: superAdminPassword,
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });
    console.log('✅ Created/Updated Super Admin:');
    console.log(`   Username: ${superAdmin.username}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Role: ${superAdmin.role}`);
    console.log(`   Password: Admin@123`);

    // Create Regular Admin
    const adminPassword = await bcrypt.hash('User@123', 10);
    const regularAdmin = await prisma.admin.upsert({
      where: { username: 'user' },
      update: {
        password: adminPassword,
        role: 'ADMIN',
        isActive: true
      },
      create: {
        username: 'user',
        email: 'user@shraddha.com',
        password: adminPassword,
        role: 'ADMIN',
        isActive: true
      }
    });
    console.log('\n✅ Created/Updated Regular Admin:');
    console.log(`   Username: ${regularAdmin.username}`);
    console.log(`   Email: ${regularAdmin.email}`);
    console.log(`   Role: ${regularAdmin.role}`);
    console.log(`   Password: User@123`);

    // Create Lab Manager
    const labManagerPassword = await bcrypt.hash('Lab@123', 10);
    const labManager = await prisma.admin.upsert({
      where: { username: 'labmanager' },
      update: {
        password: labManagerPassword,
        role: 'LAB_MANAGER',
        isActive: true
      },
      create: {
        username: 'labmanager',
        email: 'labmanager@shraddha.com',
        password: labManagerPassword,
        role: 'LAB_MANAGER',
        isActive: true
      }
    });
    console.log('\n✅ Created/Updated Lab Manager:');
    console.log(`   Username: ${labManager.username}`);
    console.log(`   Email: ${labManager.email}`);
    console.log(`   Role: ${labManager.role}`);
    console.log(`   Password: Lab@123`);

    // Create Receptionist
    const receptionistPassword = await bcrypt.hash('Reception@123', 10);
    const receptionist = await prisma.admin.upsert({
      where: { username: 'receptionist' },
      update: {
        password: receptionistPassword,
        role: 'RECEPTIONIST',
        isActive: true
      },
      create: {
        username: 'receptionist',
        email: 'receptionist@shraddha.com',
        password: receptionistPassword,
        role: 'RECEPTIONIST',
        isActive: true
      }
    });
    console.log('\n✅ Created/Updated Receptionist:');
    console.log(`   Username: ${receptionist.username}`);
    console.log(`   Email: ${receptionist.email}`);
    console.log(`   Role: ${receptionist.role}`);
    console.log(`   Password: Reception@123`);

    console.log('\n🎉 Admin seeding completed successfully!');
    
    // Show summary
    const adminCount = await prisma.admin.count();
    console.log(`\n📊 Total admins in database: ${adminCount}`);

  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmins();