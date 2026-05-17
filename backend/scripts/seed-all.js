import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, 'seed-data.json'), 'utf-8'));

async function seedAdmins() {
  console.log('\n👤 Seeding admins...');
  const admins = [
    { username: 'admin',        email: 'admin@silverleaf.com',        password: 'Admin@123',      role: 'SUPER_ADMIN' },
    { username: 'user',         email: 'user@silverleaf.com',         password: 'User@123',       role: 'ADMIN' },
    { username: 'labmanager',   email: 'labmanager@silverleaf.com',   password: 'Lab@123',        role: 'LAB_MANAGER' },
    { username: 'receptionist', email: 'receptionist@silverleaf.com', password: 'Reception@123', role: 'RECEPTIONIST' },
  ];

  for (const a of admins) {
    const hashed = await bcrypt.hash(a.password, 10);
    await prisma.admin.upsert({
      where: { username: a.username },
      update: { password: hashed, role: a.role, isActive: true },
      create: { username: a.username, email: a.email, password: hashed, role: a.role, isActive: true },
    });
    console.log(`  ✅ ${a.role}: ${a.username} / ${a.password}`);
  }
}

async function seedSampleTypes() {
  console.log('\n🧪 Seeding sample types...');
  for (const s of data.sampleTypes) {
    await prisma.sample_type.upsert({
      where: { Sample_Type: s.Sample_Type },
      update: { Sample_Color: s.Sample_Color },
      create: { Sample_Type: s.Sample_Type, Sample_Color: s.Sample_Color },
    });
  }
  console.log(`  ✅ ${data.sampleTypes.length} sample types`);
}

async function seedRoles() {
  console.log('\n🔐 Seeding roles...');
  for (const r of data.roles) {
    await prisma.role.upsert({
      where: { codeName: r.codeName },
      update: { name: r.name, roleLanding: r.roleLanding, viewFinancialDays: r.viewFinancialDays,
                discountPermissible: r.discountPermissible, showB2B: r.showB2B, isActive: r.isActive },
      create: { name: r.name, codeName: r.codeName, roleLanding: r.roleLanding,
                viewFinancialDays: r.viewFinancialDays, discountPermissible: r.discountPermissible,
                showB2B: r.showB2B, isActive: r.isActive },
    });
    console.log(`  ✅ Role: ${r.name} (${r.codeName})`);
  }
}

async function seedDepartments() {
  console.log('\n📁 Seeding departments...');
  // Returns a map of old id -> new id for use in tests/packages
  const idMap = {};
  for (const d of data.departments) {
    const dept = await prisma.department.upsert({
      where: { name: d.name },
      update: { code: d.code, sortOrder: d.sortOrder, isActive: d.isActive },
      create: { name: d.name, code: d.code, sortOrder: d.sortOrder, isActive: d.isActive },
    });
    idMap[d.id] = dept.id;
    console.log(`  ✅ Department: ${d.name}`);
  }
  return idMap;
}

async function seedTests(deptIdMap) {
  console.log('\n🔬 Seeding tests...');
  const testIdMap = {};
  // Only seed active, non-deleted tests
  const activeTests = data.tests.filter(t => t.isActive && !t.isDeleted);

  for (const t of activeTests) {
    const mappedDeptId = deptIdMap[t.departmentId];
    if (!mappedDeptId) {
      console.log(`  ⚠️  Skipping test "${t.name}" — department id ${t.departmentId} not found`);
      continue;
    }

    try {
      const test = await prisma.test.upsert({
        where: { name_departmentId: { name: t.name, departmentId: mappedDeptId } },
        update: {
          shortName: t.shortName, sampleType: t.sampleType, speciality: t.speciality,
          sortOrder: t.sortOrder, attachFile: t.attachFile, profileTest: t.profileTest,
          isHeader: t.isHeader, showTestName: t.showTestName, isNABL: t.isNABL,
          interpretation: t.interpretation, imageSize: t.imageSize, isActive: t.isActive,
        },
        create: {
          name: t.name, shortName: t.shortName, departmentId: mappedDeptId,
          sampleType: t.sampleType, speciality: t.speciality, sortOrder: t.sortOrder,
          attachFile: t.attachFile, profileTest: t.profileTest, isHeader: t.isHeader,
          showTestName: t.showTestName, isNABL: t.isNABL, interpretation: t.interpretation,
          imageSize: t.imageSize, isActive: t.isActive,
        },
      });
      testIdMap[t.id] = test.id;
      console.log(`  ✅ Test: ${t.name}`);
    } catch (err) {
      console.log(`  ⚠️  Skipped test "${t.name}": ${err.message}`);
    }
  }
  return testIdMap;
}

async function seedCharges(testIdMap) {
  console.log('\n💰 Seeding test charges...');
  if (!data.testCharges || data.testCharges.length === 0) {
    console.log('  ℹ️  No test charges in seed-data.json, skipping');
    return;
  }
  let count = 0;
  for (const c of data.testCharges) {
    const mappedTestId = testIdMap[c.testId];
    if (!mappedTestId) continue;
    try {
      await prisma.testCharge.upsert({
        where: {
          testId_franchiseId_corporateId_collectionCenterId: {
            testId: mappedTestId,
            franchiseId: c.franchiseId ?? null,
            corporateId: c.corporateId ?? null,
            collectionCenterId: c.collectionCenterId ?? null,
          },
        },
        update: { b2cCharge: c.b2cCharge, b2bCharge: c.b2bCharge, isActive: c.isActive ?? true },
        create: {
          testId: mappedTestId, b2cCharge: c.b2cCharge, b2bCharge: c.b2bCharge,
          franchiseId: c.franchiseId ?? null, corporateId: c.corporateId ?? null,
          collectionCenterId: c.collectionCenterId ?? null, isActive: c.isActive ?? true,
        },
      });
      count++;
    } catch (err) {
      console.log(`  ⚠️  Skipped charge for testId ${c.testId}: ${err.message}`);
    }
  }
  console.log(`  ✅ ${count} test charges`);
}

async function seedPackages(deptIdMap, testIdMap) {
  console.log('\n📦 Seeding packages...');
  const pkgIdMap = {};

  for (const p of data.packages) {
    const mappedDeptId = deptIdMap[p.departmentId];
    if (!mappedDeptId) {
      console.log(`  ⚠️  Skipping package "${p.name}" — department not found`);
      continue;
    }
    let pkg = await prisma.package.findFirst({ where: { name: p.name } });
    if (!pkg) {
      pkg = await prisma.package.create({
        data: {
          name: p.name, code: p.code, departmentId: mappedDeptId,
          center: p.center, b2cCharge: p.b2cCharge, b2bCharge: p.b2bCharge, isActive: p.isActive,
        },
      });
    }
    pkgIdMap[p.id] = pkg.id;
    console.log(`  ✅ Package: ${p.name}`);
  }

  // Link tests to packages
  if (data.packageTests && data.packageTests.length > 0) {
    console.log('  🔗 Linking tests to packages...');
    for (const pt of data.packageTests) {
      const mappedPkgId = pkgIdMap[pt.packageId];
      const mappedTestId = testIdMap[pt.testId];
      if (!mappedPkgId || !mappedTestId) continue;
      await prisma.packageTest.upsert({
        where: { packageId_testId: { packageId: mappedPkgId, testId: mappedTestId } },
        update: {},
        create: { packageId: mappedPkgId, testId: mappedTestId },
      }).catch(() => {});
    }
    console.log(`  ✅ ${data.packageTests.length} package-test links`);
  }
}

async function seedUsers() {
  console.log('\n👥 Seeding users...');
  if (!data.users || data.users.length === 0) {
    // Create a default user if none in seed file
    const defaultPassword = await bcrypt.hash('User@123', 10);
    await prisma.user.upsert({
      where: { username: 'staff' },
      update: {},
      create: {
        username: 'staff', name: 'Staff User', center: 'Main Center',
        role: 'Technician', password: defaultPassword, isActive: true,
      },
    });
    console.log('  ✅ Default user: staff / User@123');
    return;
  }
  for (const u of data.users) {
    const hashed = await bcrypt.hash(u.password ?? 'User@123', 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { name: u.name, center: u.center, role: u.role, isActive: u.isActive ?? true },
      create: {
        username: u.username, name: u.name, center: u.center, role: u.role,
        mobile: u.mobile, gender: u.gender, email: u.email, address: u.address,
        password: hashed, isActive: u.isActive ?? true,
      },
    });
    console.log(`  ✅ User: ${u.username}`);
  }
}

async function main() {
  console.log('🌱 Starting full database seed...');
  try {
    await seedAdmins();
    await seedSampleTypes();
    await seedRoles();
    const deptIdMap = await seedDepartments();
    const testIdMap = await seedTests(deptIdMap);
    await seedCharges(testIdMap);
    await seedPackages(deptIdMap, testIdMap);
    await seedUsers();

    console.log('\n🎉 Seeding completed!\n');
    console.log('📊 Summary:');
    console.log(`  Admins:       ${await prisma.admin.count()}`);
    console.log(`  Sample Types: ${await prisma.sample_type.count()}`);
    console.log(`  Roles:        ${await prisma.role.count()}`);
    console.log(`  Departments:  ${await prisma.department.count()}`);
    console.log(`  Tests:        ${await prisma.test.count()}`);
    console.log(`  Test Charges: ${await prisma.testCharge.count()}`);
    console.log(`  Packages:     ${await prisma.package.count()}`);
    console.log(`  Users:        ${await prisma.user.count()}`);
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
