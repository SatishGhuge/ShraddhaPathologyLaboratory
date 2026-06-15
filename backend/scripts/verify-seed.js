import dotenv from 'dotenv';
import prisma from '../config/database.js';

dotenv.config();

async function verify() {
  console.log('🔍 Verifying seeded data...\n');

  try {
    // Count departments
    const deptCount = await prisma.department.count();
    console.log(`📁 Departments: ${deptCount}`);
    const depts = await prisma.department.findMany({ select: { name: true } });
    depts.forEach(d => console.log(`   - ${d.name}`));

    // Count tests
    const testCount = await prisma.test.count({ where: { isDeleted: false } });
    console.log(`\n🧪 Tests: ${testCount}`);
    const tests = await prisma.test.findMany({ 
      where: { isDeleted: false },
      select: { name: true, shortName: true },
      take: 10
    });
    tests.forEach(t => console.log(`   - ${t.name} (${t.shortName})`));

    // Count test charges
    const chargeCount = await prisma.testCharge.count();
    console.log(`\n💰 Test Charges: ${chargeCount}`);

    // Count packages
    const pkgCount = await prisma.package.count();
    console.log(`\n📦 Packages: ${pkgCount}`);
    const pkgs = await prisma.package.findMany({ 
      include: { 
        packageTests: true 
      }
    });
    pkgs.forEach(p => console.log(`   - ${p.name} (₹${p.b2cCharge}/₹${p.b2bCharge}) - ${p.packageTests.length} tests`));

    // Count doctors
    const doctorCount = await prisma.doctor.count();
    console.log(`\n👨‍⚕️ Doctors: ${doctorCount}`);
    const doctors = await prisma.doctor.findMany({ select: { name: true, specialty: true } });
    doctors.forEach(d => console.log(`   - ${d.name} (${d.specialty})`));

    // Count corporates
    const corpCount = await prisma.corporate.count();
    console.log(`\n🏢 Corporates: ${corpCount}`);
    const corps = await prisma.corporate.findMany({ select: { name: true } });
    corps.forEach(c => console.log(`   - ${c.name}`));

    // Count units
    const unitCount = await prisma.unit.count();
    console.log(`\n📏 Units: ${unitCount}`);

    // Count sample types
    const sampleCount = await prisma.sample_type.count();
    console.log(`\n🧪 Sample Types: ${sampleCount}`);

    // Count franchises and centers
    const franchiseCount = await prisma.franchise.count();
    const centerCount = await prisma.collectionCenter.count();
    console.log(`\n🏪 Franchises: ${franchiseCount}`);
    console.log(`🏥 Collection Centers: ${centerCount}`);

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
