#!/usr/bin/env node

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load seeded data to know what to delete
let seededData = { sampleTypes: [], tests: [] };
try {
  seededData = JSON.parse(readFileSync(join(__dirname, 'seed-data.json'), 'utf-8'));
} catch (err) {
  console.log('⚠️  seed-data.json not found, will delete based on known seeded items\n');
}

async function revertAndKeepAdmins() {
  console.log('\n========================================');
  console.log('  Revert Seed - Keep Admins Only');
  console.log('  (Only deletes seeded data by ID)');
  console.log('========================================\n');

  try {
    // Step 1: Find IDs of seeded data
    console.log('� Identifying seeded data by ID...\n');
    
    // Get IDs of tests that were seeded (by testCode)
    const seededTestCodes = [
      'HEM001', 'HEM002', 'HEM003', 'HEM004', 'HEM005', 'HEM006', 'HEM007',
      'CC001', 'CC002', 'CC003', 'CC004', 'CC005', 'CC006', 'CC007',
      'MB001', 'MB002', 'MB003', 'MB004'
    ];

    const seededTests = await prisma.test.findMany({
      where: { testCode: { in: seededTestCodes } }
    });
    const seededTestIds = seededTests.map(t => t.id);
    console.log(`  ℹ️  Found ${seededTestIds.length} seeded tests by testCode`);

    // Get IDs of seeded departments
    const seededDepartmentNames = ['Hematology', 'Clinical Chemistry', 'Microbiology'];
    const seededDepts = await prisma.department.findMany({
      where: { name: { in: seededDepartmentNames } }
    });
    const seededDeptIds = seededDepts.map(d => d.id);
    console.log(`  ℹ️  Found ${seededDeptIds.length} seeded departments by name`);

    // Get IDs of seeded packages
    const seededPackageNames = ['Basic Health Checkup', 'Comprehensive Chemistry Panel', 'Full Body Checkup'];
    const seededPkgs = await prisma.package.findMany({
      where: { name: { in: seededPackageNames } }
    });
    const seededPkgIds = seededPkgs.map(p => p.id);
    console.log(`  ℹ️  Found ${seededPkgIds.length} seeded packages by name`);

    // Get IDs of seeded sample types
    const seededSampleTypeNames = seededData.sampleTypes.map(s => s.Sample_Type);
    const seededSampleTypes = await prisma.sample_type.findMany({
      where: { Sample_Type: { in: seededSampleTypeNames } }
    });
    const seededSampleTypeIds = seededSampleTypes.map(s => s.id);
    console.log(`  ℹ️  Found ${seededSampleTypeIds.length} seeded sample types by name`);

    // Get IDs of seeded doctors (by name pattern from seed)
    const seededDoctorNames = [
      'Rajesh Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Desai',
      'Vikram Singh', 'Anjali Kapoor', 'Rohit Deshmukh', 'Meera Iyer'
    ];
    const seededDoctors = await prisma.doctor.findMany({
      where: { name: { in: seededDoctorNames } }
    });
    const seededDoctorIds = seededDoctors.map(d => d.id);
    console.log(`  ℹ️  Found ${seededDoctorIds.length} seeded doctors by name`);

    // Get ID of seeded staff user
    const staffUser = await prisma.user.findUnique({
      where: { username: 'staff' }
    });
    const seededUserIds = staffUser ? [staffUser.id] : [];
    console.log(`  ℹ️  Found ${seededUserIds.length} seeded staff user\n`);

    console.log('🗑️  Clearing seeded data by ID...');
    
    // Delete test results linked to seeded tests
    if (seededTestIds.length > 0) {
      await prisma.testResult.deleteMany({
        where: {
          patientTest: {
            testId: { in: seededTestIds }
          }
        }
      });
      console.log('  ✅ Deleted test results for seeded tests');
    }

    // Delete outsourcing lab tests for seeded tests
    if (seededTestIds.length > 0) {
      await prisma.outsourcingLabTest.deleteMany({
        where: { testId: { in: seededTestIds } }
      });
      console.log('  ✅ Deleted outsourcing lab tests for seeded tests');
    }

    // Delete doctor test charges for seeded tests
    if (seededTestIds.length > 0) {
      await prisma.doctorTestCharge.deleteMany({
        where: { testId: { in: seededTestIds } }
      });
      console.log('  ✅ Deleted doctor test charges for seeded tests');
    }

    // Delete package tests for seeded packages
    if (seededPkgIds.length > 0) {
      await prisma.packageTest.deleteMany({
        where: { packageId: { in: seededPkgIds } }
      });
      console.log('  ✅ Deleted package tests for seeded packages');
    }

    // Delete test charges for seeded tests
    if (seededTestIds.length > 0) {
      await prisma.testCharge.deleteMany({
        where: { testId: { in: seededTestIds } }
      });
      console.log('  ✅ Deleted test charges for seeded tests');
    }

    // Delete test templates for seeded tests
    if (seededTestIds.length > 0) {
      await prisma.testTemplate.deleteMany({
        where: { testId: { in: seededTestIds } }
      });
      console.log('  ✅ Deleted test templates for seeded tests');
    }

    // Delete test categories for seeded tests
    if (seededTestIds.length > 0) {
      await prisma.testCategory.deleteMany({
        where: { testId: { in: seededTestIds } }
      });
      console.log('  ✅ Deleted test categories for seeded tests');
    }

    // Delete seeded tests themselves (using IDs)
    if (seededTestIds.length > 0) {
      await prisma.test.deleteMany({
        where: { id: { in: seededTestIds } }
      });
      console.log('  ✅ Deleted seeded tests');
    }

    // Delete seeded packages (using IDs)
    if (seededPkgIds.length > 0) {
      await prisma.package.deleteMany({
        where: { id: { in: seededPkgIds } }
      });
      console.log('  ✅ Deleted seeded packages');
    }

    // Delete seeded departments (using IDs, only if they have no tests left)
    if (seededDeptIds.length > 0) {
      let deletedDeptCount = 0;
      for (const deptId of seededDeptIds) {
        const testCount = await prisma.test.count({ where: { departmentId: deptId } });
        if (testCount === 0) {
          await prisma.department.delete({ where: { id: deptId } });
          deletedDeptCount++;
        }
      }
      console.log(`  ✅ Deleted ${deletedDeptCount} empty seeded departments`);
    }

    // Delete seeded doctors (using IDs)
    if (seededDoctorIds.length > 0) {
      await prisma.doctor.deleteMany({
        where: { id: { in: seededDoctorIds } }
      });
      console.log(`  ✅ Deleted ${seededDoctorIds.length} seeded doctors`);
    }

    // Delete seeded sample types (using IDs)
    if (seededSampleTypeIds.length > 0) {
      await prisma.sample_type.deleteMany({
        where: { id: { in: seededSampleTypeIds } }
      });
      console.log(`  ✅ Deleted ${seededSampleTypeIds.length} seeded sample types`);
    }

    // Delete the 'staff' user only (seeded user, using IDs)
    if (seededUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: seededUserIds } }
      });
      console.log(`  ✅ Deleted ${seededUserIds.length} seeded staff user`);
    }


    // Step 2: Reinsert only admins
    console.log('\n👤 Reseeding admins...');
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

    console.log('\n📊 Remaining Data Summary:');
    console.log(`  ✅ Admins:           ${await prisma.admin.count()}`);
    console.log(`  ℹ️  Sample Types:     ${await prisma.sample_type.count()} (manually created preserved)`);
    console.log(`  ℹ️  Roles:            ${await prisma.role.count()} (manually created preserved)`);
    console.log(`  ℹ️  Departments:      ${await prisma.department.count()} (manually created preserved)`);
    console.log(`  ℹ️  Tests:            ${await prisma.test.count()} (manually created preserved)`);
    console.log(`  ℹ️  Test Charges:     ${await prisma.testCharge.count()} (manually created preserved)`);
    console.log(`  ℹ️  Packages:         ${await prisma.package.count()} (manually created preserved)`);
    console.log(`  ℹ️  Referral Doctors: ${await prisma.doctor.count()} (manually created preserved)`);
    console.log(`  ℹ️  Users:            ${await prisma.user.count()} (manually created preserved)`);

    console.log('\n✨ Revert completed successfully!');
    console.log('📝 Note: Only seeded data was removed, manually created data is preserved.\n');
  } catch (err) {
    console.error('\n❌ Revert failed:', err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

revertAndKeepAdmins().catch((e) => { console.error(e); process.exit(1); });