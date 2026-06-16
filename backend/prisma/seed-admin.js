import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin user...');

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Delete existing admin if exists
    await prisma.admin.deleteMany({
      where: { username: 'admin' },
    });

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        adminName: 'System Administrator',
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📋 Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Email: admin@example.com');
    console.log('   Password: Admin@123');
    console.log('   Role: ADMIN');
    console.log('   Admin Name: System Administrator');
    console.log('');
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

