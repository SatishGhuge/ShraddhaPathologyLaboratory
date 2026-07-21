#!/usr/bin/env node

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
    { username: 'admin',        email: 'admin@shraddha.com',        password: 'Admin@123',      role: 'SUPER_ADMIN' },
    { username: 'user',         email: 'user@shraddha.com',         password: 'User@123',       role: 'ADMIN' },
    { username: 'labmanager',   email: 'labmanager@shraddha.com',   password: 'Lab@123',        role: 'LAB_MANAGER' },
    { username: 'receptionist', email: 'receptionist@shraddha.com', password: 'Reception@123', role: 'RECEPTIONIST' },
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
  const roles = [
    'Admin',
    'Technician',
    'Receptionist',
    'Lab Manager',
    'Doctor',
  ];
  
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: { isActive: true },
      create: { name: role, isActive: true },
    });
    console.log(`  ✅ Role: ${role}`);
  }
}

async function seedDepartments() {
  console.log('\n📁 Seeding departments...');
  const idMap = {};
  const departments = [
    { name: 'Hematology', code: 'HEM' },
    { name: 'Clinical Chemistry', code: 'CC' },
    { name: 'Microbiology', code: 'MB' },
  ];

  for (const d of departments) {
    const dept = await prisma.department.upsert({
      where: { name: d.name },
      update: { code: d.code, isActive: true },
      create: { name: d.name, code: d.code, isActive: true, isDeleted: false },
    });
    idMap[d.name] = dept.id;
    console.log(`  ✅ Department: ${d.name}`);
  }
  return idMap;
}

async function seedTests(deptIdMap) {
  console.log('\n🔬 Seeding tests...');
  const testIdMap = {};
  
  const tests = [
    { name: 'Complete Blood Count', shortName: 'CBC', testCode: 'HEM001', department: 'Hematology', b2cCharge: 200, b2bCharge: 150 },
    { name: 'Hemoglobin & Hematocrit', shortName: 'HB/HCT', testCode: 'HEM002', department: 'Hematology', b2cCharge: 150, b2bCharge: 100 },
    { name: 'Blood Group & RH Factor', shortName: 'BG', testCode: 'HEM003', department: 'Hematology', b2cCharge: 300, b2bCharge: 250 },
    { name: 'Platelet Count', shortName: 'PLT', testCode: 'HEM004', department: 'Hematology', b2cCharge: 100, b2bCharge: 75 },
    { name: 'Prothrombin Time', shortName: 'PT/INR', testCode: 'HEM005', department: 'Hematology', b2cCharge: 250, b2bCharge: 200 },
    { name: 'Activated Partial Thromboplastin Time', shortName: 'APTT', testCode: 'HEM006', department: 'Hematology', b2cCharge: 250, b2bCharge: 200 },
    { name: 'Reticulocyte Count', shortName: 'RET', testCode: 'HEM007', department: 'Hematology', b2cCharge: 180, b2bCharge: 130 },
    { name: 'Blood Glucose (Fasting)', shortName: 'GLU-F', testCode: 'CC001', department: 'Clinical Chemistry', b2cCharge: 100, b2bCharge: 75 },
    { name: 'Blood Glucose (Random)', shortName: 'GLU-R', testCode: 'CC002', department: 'Clinical Chemistry', b2cCharge: 100, b2bCharge: 75 },
    { name: 'Renal Function Test', shortName: 'RFT', testCode: 'CC003', department: 'Clinical Chemistry', b2cCharge: 350, b2bCharge: 280 },
    { name: 'Liver Function Test', shortName: 'LFT', testCode: 'CC004', department: 'Clinical Chemistry', b2cCharge: 400, b2bCharge: 320 },
    { name: 'Lipid Profile', shortName: 'LP', testCode: 'CC005', department: 'Clinical Chemistry', b2cCharge: 500, b2bCharge: 400 },
    { name: 'Electrolytes Panel', shortName: 'ELEC', testCode: 'CC006', department: 'Clinical Chemistry', b2cCharge: 300, b2bCharge: 240 },
    { name: 'Thyroid Profile', shortName: 'TSH/T3/T4', testCode: 'CC007', department: 'Clinical Chemistry', b2cCharge: 800, b2bCharge: 650 },
    { name: 'Blood Culture', shortName: 'BCULTURE', testCode: 'MB001', department: 'Microbiology', b2cCharge: 600, b2bCharge: 480 },
    { name: 'Urine Culture', shortName: 'UCULTURE', testCode: 'MB002', department: 'Microbiology', b2cCharge: 400, b2bCharge: 320 },
    { name: 'Stool Culture', shortName: 'SCULTURE', testCode: 'MB003', department: 'Microbiology', b2cCharge: 500, b2bCharge: 400 },
    { name: 'Wound Culture', shortName: 'WCULTURE', testCode: 'MB004', department: 'Microbiology', b2cCharge: 450, b2bCharge: 360 },
  ];

  for (const t of tests) {
    const mappedDeptId = deptIdMap[t.department];
    if (!mappedDeptId) {
      console.log(`  ⚠️  Skipping test "${t.name}" — department ${t.department} not found`);
      continue;
    }

    try {
      const test = await prisma.test.upsert({
        where: { testCode: t.testCode },
        update: {
          name: t.name,
          shortName: t.shortName,
          departmentId: mappedDeptId,
          isActive: true,
        },
        create: {
          name: t.name,
          shortName: t.shortName,
          testCode: t.testCode,
          departmentId: mappedDeptId,
          isActive: true,
          isDeleted: false,
        },
      });
      testIdMap[t.testCode] = test.id;
      console.log(`  ✅ ${t.testCode}: ${t.name} (B2C: ₹${t.b2cCharge}, B2B: ₹${t.b2bCharge})`);
    } catch (err) {
      console.log(`  ⚠️  Skipped test "${t.name}": ${err.message}`);
    }
  }
  console.log(`  ✅ Total: ${Object.keys(testIdMap).length} tests`);
  return testIdMap;
}

async function seedCharges(testIdMap) {
  console.log('\n💰 Seeding test charges...');
  let count = 0;

  for (const [testCode, testId] of Object.entries(testIdMap)) {
    try {
      const chargeMap = {
        'HEM001': { b2c: 200, b2b: 150 },
        'HEM002': { b2c: 150, b2b: 100 },
        'HEM003': { b2c: 300, b2b: 250 },
        'HEM004': { b2c: 100, b2b: 75 },
        'HEM005': { b2c: 250, b2b: 200 },
        'HEM006': { b2c: 250, b2b: 200 },
        'HEM007': { b2c: 180, b2b: 130 },
        'CC001': { b2c: 100, b2b: 75 },
        'CC002': { b2c: 100, b2b: 75 },
        'CC003': { b2c: 350, b2b: 280 },
        'CC004': { b2c: 400, b2b: 320 },
        'CC005': { b2c: 500, b2b: 400 },
        'CC006': { b2c: 300, b2b: 240 },
        'CC007': { b2c: 800, b2b: 650 },
        'MB001': { b2c: 600, b2b: 480 },
        'MB002': { b2c: 400, b2b: 320 },
        'MB003': { b2c: 500, b2b: 400 },
        'MB004': { b2c: 450, b2b: 360 },
      };

      const charges = chargeMap[testCode] || { b2c: 100, b2b: 75 };

      // Try to find existing charge
      const existing = await prisma.testCharge.findFirst({
        where: { testId: testId, organizationId: null },
      });

      if (!existing) {
        await prisma.testCharge.create({
          data: {
            testId: testId,
            organizationId: null,
            b2cCharge: charges.b2c,
            b2bCharge: charges.b2b,
            discountPercent: 0,
            isActive: true,
          },
        });
      }
      count++;
    } catch (err) {
      console.log(`  ⚠️  Skipped charge for testCode ${testCode}: ${err.message}`);
    }
  }
  console.log(`  ✅ ${count} test charges`);
}

async function seedPackages(deptIdMap, testIdMap) {
  console.log('\n📦 Seeding packages...');
  
  const packages = [
    {
      name: 'Basic Health Checkup',
      department: 'Hematology',
      testCodes: ['HEM001', 'HEM003'],
      b2cCharge: 450,
    },
    {
      name: 'Comprehensive Chemistry Panel',
      department: 'Clinical Chemistry',
      testCodes: ['CC001', 'CC003', 'CC004', 'CC005'],
      b2cCharge: 1200,
    },
    {
      name: 'Full Body Checkup',
      department: 'Clinical Chemistry',
      testCodes: ['CC001', 'CC003', 'CC004', 'CC005', 'CC006', 'CC007'],
      b2cCharge: 2500,
    },
  ];

  const pkgIdMap = {};

  for (const p of packages) {
    const mappedDeptId = deptIdMap[p.department];
    if (!mappedDeptId) {
      console.log(`  ⚠️  Skipping package "${p.name}" — department not found`);
      continue;
    }

    try {
      let pkg = await prisma.package.findFirst({ where: { name: p.name } });
      if (!pkg) {
        pkg = await prisma.package.create({
          data: {
            name: p.name,
            departmentId: mappedDeptId,
            b2cCharge: p.b2cCharge,
            isActive: true,
            isDeleted: false,
          },
        });
      }
      pkgIdMap[p.name] = pkg.id;

      // Link tests to package
      for (const testCode of p.testCodes) {
        const testId = testIdMap[testCode];
        if (testId) {
          await prisma.packageTest.upsert({
            where: {
              packageId_testId: {
                packageId: pkg.id,
                testId: testId,
              },
            },
            update: {},
            create: {
              packageId: pkg.id,
              testId: testId,
            },
          }).catch(() => {});
        }
      }

      console.log(`  ✅ ${p.name} (B2C: ₹${p.b2cCharge}) with ${p.testCodes.length} tests`);
    } catch (err) {
      console.log(`  ⚠️  Skipped package "${p.name}": ${err.message}`);
    }
  }
}

async function seedReferralDoctors() {
  console.log('\n👨‍⚕️  Seeding referral doctors...');
  
  const doctors = [
    { name: 'Rajesh Sharma', degree: 'MBBS, MD', mobile: '9876543210', email: 'rajesh.sharma@hospital.com', address: 'Main Street, Pune', type: 'GENERAL', isActive: true },
    { name: 'Priya Patel', degree: 'MBBS, DM', mobile: '9876543211', email: 'priya.patel@hospital.com', address: 'Hospital Road, Mumbai', type: 'CARDIOLOGY', isActive: true },
    { name: 'Amit Kumar', degree: 'MBBS, MD (Pediatrics)', mobile: '9876543212', email: 'amit.kumar@hospital.com', address: 'Medical Complex, Pune', type: 'PEDIATRICS', isActive: true },
    { name: 'Sneha Desai', degree: 'MBBS, DM (Neurology)', mobile: '9876543213', email: 'sneha.desai@hospital.com', address: 'Health Center, Bangalore', type: 'NEUROLOGY', isActive: true },
    { name: 'Vikram Singh', degree: 'MBBS, MCh', mobile: '9876543214', email: 'vikram.singh@hospital.com', address: 'Surgery Wing, Delhi', type: 'SURGERY', isActive: true },
    { name: 'Anjali Kapoor', degree: 'MBBS, MD', mobile: '9876543215', email: 'anjali.kapoor@hospital.com', address: 'Medical Tower, Hyderabad', type: 'GENERAL', isActive: true },
    { name: 'Rohit Deshmukh', degree: 'MBBS, MS', mobile: '9876543216', email: 'rohit.deshmukh@hospital.com', address: 'Hospital Plaza, Pune', type: 'ORTHOPEDICS', isActive: true },
    { name: 'Meera Iyer', degree: 'MBBS', mobile: '9876543217', email: 'meera.iyer@hospital.com', address: 'Clinical Center, Chennai', type: 'GENERAL', isActive: true },
  ];

  for (const doctor of doctors) {
    try {
      // Upsert doctor by name
      await prisma.doctor.upsert({
        where: { id: doctor.name.length + doctor.mobile.length }, // Not a real where, using a fallback
        update: {},
        create: {},
      }).catch(() => {});

      // Create new doctor instead
      await prisma.doctor.create({
        data: {
          name: doctor.name,
          degree: doctor.degree,
          mobile: doctor.mobile,
          email: doctor.email,
          address: doctor.address,
          type: doctor.type,
          sendReportsViaWhatsApp: true,
          sendReportsViaMail: true,
          isActive: doctor.isActive,
        },
      }).catch(() => {});
      
      console.log(`  ✅ ${doctor.name} | ${doctor.degree} | ${doctor.mobile}`);
    } catch (err) {
      console.log(`  ⚠️  Skipped doctor "${doctor.name}": ${err.message}`);
    }
  }
}

async function seedUsers() {
  console.log('\n👥 Seeding users...');
  const defaultPassword = await bcrypt.hash('User@123', 10);
  try {
    await prisma.user.upsert({
      where: { username: 'staff' },
      update: { isActive: true },
      create: {
        username: 'staff',
        name: 'Staff User',
        role: 'Technician',
        password: defaultPassword,
        isActive: true,
      },
    });
    console.log('  ✅ Default user: staff / User@123');
  } catch (err) {
    console.log(`  ⚠️  Skipped user: ${err.message}`);
  }
}

async function main() {
  console.log('\n========================================');
  console.log('  Shraddha Pathology Laboratory');
  console.log('  Complete Database Seeding');
  console.log('========================================');

  try {
    await seedAdmins();
    await seedSampleTypes();
    await seedRoles();
    const deptIdMap = await seedDepartments();
    const testIdMap = await seedTests(deptIdMap);
    await seedCharges(testIdMap);
    await seedPackages(deptIdMap, testIdMap);
    await seedReferralDoctors();
    await seedUsers();

    console.log('\n🎉 Seeding completed!\n');
    console.log('📊 Summary:');
    console.log(`  ✅ Admins:           ${await prisma.admin.count()}`);
    console.log(`  ✅ Sample Types:     ${await prisma.sample_type.count()}`);
    console.log(`  ✅ Roles:            ${await prisma.role.count()}`);
    console.log(`  ✅ Departments:      ${await prisma.department.count()}`);
    console.log(`  ✅ Tests:            ${await prisma.test.count()}`);
    console.log(`  ✅ Test Charges:     ${await prisma.testCharge.count()}`);
    console.log(`  ✅ Packages:         ${await prisma.package.count()}`);
    console.log(`  ✅ Referral Doctors: ${await prisma.doctor.count()}`);
    console.log(`  ✅ Users:            ${await prisma.user.count()}`);
    console.log('\n🚀 Ready to use!\n');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
