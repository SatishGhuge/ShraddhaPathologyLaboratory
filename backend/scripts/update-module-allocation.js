/**
 * Script to update existing moduleAllocations with new fields
 * Run this once to update all existing organizations and users
 */

import prisma from '../config/database.js';

const newDefaultStructure = {
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
    outsourcing: false, // NEW
  },
  reports: {
    dashboard: false,
    collectionReport: false,
    organizationSettlement: false, // NEW
    patientList: false,
    referralDoctorRevenue: false,
    testReport: false,
    turnAroundTime: false,
  },
  configuration: {
    signature: false,
    machines: false, // NEW
    reportSettings: false, // NEW
  },
  help: {
    userManual: false,
    ultraviewer: false,
    anydesk: false,
  },
  inventory: { // NEW MODULE
    stockTransactions: false,
    item: false,
    supplier: false,
    stockEntry: false,
    orgTransfer: false,
  },
  result: false,
};

async function updateModuleAllocations() {
  try {
    console.log('🔄 Starting module allocation update...');

    // Get all module allocations
    const allocations = await prisma.moduleAllocation.findMany();
    
    console.log(`📊 Found ${allocations.length} module allocations to update`);

    let updated = 0;
    
    for (const allocation of allocations) {
      try {
        // Parse existing modules
        const existingModules = typeof allocation.modules === 'string' 
          ? JSON.parse(allocation.modules) 
          : allocation.modules;

        // Merge with new structure (keeps existing values, adds new fields as false)
        const updatedModules = {
          patient: {
            ...newDefaultStructure.patient,
            ...existingModules.patient,
          },
          masters: {
            ...newDefaultStructure.masters,
            ...existingModules.masters,
          },
          reports: {
            ...newDefaultStructure.reports,
            ...existingModules.reports,
          },
          configuration: {
            ...newDefaultStructure.configuration,
            ...existingModules.configuration,
          },
          help: {
            ...newDefaultStructure.help,
            ...existingModules.help,
          },
          inventory: {
            ...newDefaultStructure.inventory,
            ...(existingModules.inventory || {}),
          },
          result: existingModules.result ?? false,
        };

        // Update in database
        await prisma.moduleAllocation.update({
          where: { id: allocation.id },
          data: {
            modules: JSON.stringify(updatedModules),
          },
        });

        updated++;
        
        const entityType = allocation.userId ? 'User' : allocation.organizationId ? 'Organization' : 'Unknown';
        const entityId = allocation.userId || allocation.organizationId || 'N/A';
        console.log(`✅ Updated ${entityType} ${entityId}`);

      } catch (error) {
        console.error(`❌ Error updating allocation ${allocation.id}:`, error.message);
      }
    }

    console.log(`\n🎉 Update complete! ${updated}/${allocations.length} allocations updated.`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateModuleAllocations();
