#!/usr/bin/env node

import prisma from '../config/database.js';

const defaultModuleAllocation = {
  patient: {
    registration: false,
    tests: false,
  },
  masters: {
    testlist: false,
    testTemplates: false,
    departmentlist: false,
    packagelist: false,
    charges: false,
    rolelist: false,
    userlist: false,
    referralDoctorList: false,
    organization: false,
    specimenType: false,
    units: false,
  },
  reports: {
    dashboard: false,
    collectionReport: false,
    patientList: false,
    referralDoctorRevenue: false,
    centerWiseCostReport: false,
    b2bTestwiseCostReport: false,
    discountReport: false,
    testReport: false,
  },
  configuration: {
    signature: false,
  },
  help: {
    userManual: false,
    ultraviewer: false,
    anydesk: false,
  },
  result: false,
};

async function populateModuleAllocations() {
  try {
    console.log('🔄 Populating module allocations for existing users and organizations...\n');

    // Get all users without module allocations
    const usersWithoutAllocation = await prisma.user.findMany({
      where: {
        moduleAllocation: null,
      },
    });

    console.log(`📋 Found ${usersWithoutAllocation.length} users without module allocations`);

    // Create module allocations for users
    for (const user of usersWithoutAllocation) {
      try {
        await prisma.moduleAllocation.create({
          data: {
            userId: user.id,
            modules: defaultModuleAllocation,
          },
        });
        console.log(`  ✅ Created module allocation for user: ${user.name} (${user.username})`);
      } catch (err) {
        console.log(`  ⚠️  User ${user.username} already has allocation or error: ${err.message}`);
      }
    }

    // Get all organizations without module allocations
    const orgsWithoutAllocation = await prisma.organization.findMany({
      where: {
        moduleAllocation: null,
      },
    });

    console.log(`\n📋 Found ${orgsWithoutAllocation.length} organizations without module allocations`);

    // Create module allocations for organizations
    for (const org of orgsWithoutAllocation) {
      try {
        await prisma.moduleAllocation.create({
          data: {
            organizationId: org.id,
            modules: defaultModuleAllocation,
          },
        });
        console.log(`  ✅ Created module allocation for organization: ${org.name}`);
      } catch (err) {
        console.log(`  ⚠️  Organization ${org.name} already has allocation or error: ${err.message}`);
      }
    }

    console.log('\n✅ Module allocation population complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

populateModuleAllocations();
