/**
 * Normalize Parameter Codes Script (IMPROVED)
 * 
 * This script fixes existing duplicate parameters with the same name but different codes.
 * It consolidates them into a single parameter with one consistent code.
 * 
 * IMPORTANT: Parameters with the SAME NAME are only merged if they have the SAME PURPOSE
 * (determined by comparing textContent, type, and other key fields)
 * 
 * Usage: node normalize-parameter-codes.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Function to check if two parameters are functionally identical
function areParametersIdentical(param1, param2) {
  // Compare key fields that determine if parameters serve the same purpose
  const fieldsToCompare = [
    'parameterName',
    'type',
    'textContent',
    'maleDisplayText',
    'femaleDisplayText',
    'defaultDisplayText',
    'rangeType',
    'isDescriptive',
    'isMultipleOptions'
  ];

  for (const field of fieldsToCompare) {
    const val1 = param1[field];
    const val2 = param2[field];
    
    // If both are null/empty, consider them same
    if (!val1 && !val2) continue;
    
    // If one is null and other isn't, they're different
    if ((val1 && !val2) || (!val1 && val2)) {
      console.log(`      ⚠️  Different ${field}: "${val1}" vs "${val2}"`);
      return false;
    }
    
    // If both exist but differ, they're different
    if (val1 && val2 && val1.toLowerCase() !== val2.toLowerCase()) {
      console.log(`      ⚠️  Different ${field}: "${val1}" vs "${val2}"`);
      return false;
    }
  }
  
  return true;
}

async function normalizeParameterCodes() {
  try {
    console.log('🔍 Starting parameter code normalization (INTELLIGENT MODE)...\n');
    console.log('📋 This script will ONLY merge parameters that serve the SAME PURPOSE\n');

    // Step 1: Find all parameters and group by name
    const allParameters = await prisma.testParameter.findMany({
      select: {
        id: true,
        parameterName: true,
        parameterCode: true,
        type: true,
        textContent: true,
        maleDisplayText: true,
        femaleDisplayText: true,
        defaultDisplayText: true,
        rangeType: true,
        isDescriptive: true,
        isMultipleOptions: true,
        testId: true,
        createdAt: true
      },
      orderBy: { parameterName: 'asc' }
    });

    console.log(`📊 Found ${allParameters.length} total parameter records\n`);

    // Step 2: Group by parameter name (case-insensitive)
    const groupedByName = {};
    allParameters.forEach(param => {
      const normalizedName = param.parameterName.toLowerCase().trim();
      if (!groupedByName[normalizedName]) {
        groupedByName[normalizedName] = [];
      }
      groupedByName[normalizedName].push(param);
    });

    // Step 3: Find duplicates and check if they're ACTUALLY the same
    let totalDuplicates = 0;
    let mergedCount = 0;
    let skippedDifferent = 0;

    for (const [normalizedName, params] of Object.entries(groupedByName)) {
      if (params.length > 1) {
        console.log(`\n🔍 Found ${params.length} instances of parameter: "${normalizedName}"`);
        
        // Group by actual functionality (identical parameters)
        const functionalGroups = [];
        const processed = new Set();
        
        for (let i = 0; i < params.length; i++) {
          if (processed.has(params[i].id)) continue;
          
          const group = [params[i]];
          processed.add(params[i].id);
          
          for (let j = i + 1; j < params.length; j++) {
            if (processed.has(params[j].id)) continue;
            
            if (areParametersIdentical(params[i], params[j])) {
              group.push(params[j]);
              processed.add(params[j].id);
            }
          }
          
          functionalGroups.push(group);
        }
        
        // If all params are identical, merge them
        if (functionalGroups.length === 1) {
          console.log(`   ✅ All ${params.length} instances serve the SAME PURPOSE → MERGING`);
          
          const group = functionalGroups[0];
          let masterParam = group.find(p => p.parameterCode);
          if (!masterParam) {
            const sorted = [...group].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            masterParam = sorted[0];
            console.log(`   ⚠️  No parameter code found, using earliest record (ID: ${masterParam.id})`);
          } else {
            console.log(`   ✅ Master parameter: ID ${masterParam.id}, Code: "${masterParam.parameterCode}"`);
          }

          const duplicates = group.filter(p => p.id !== masterParam.id);
          
          for (const dupParam of duplicates) {
            console.log(`   🔗 Merging ID ${dupParam.id} → ID ${masterParam.id}`);
            totalDuplicates++;

            // Migrate test results
            const resultsWithDuplicate = await prisma.testResult.findMany({
              where: { testParameterId: dupParam.id },
              select: { id: true, patientTestId: true }
            });

            if (resultsWithDuplicate.length > 0) {
              const migrated = await prisma.testResult.updateMany({
                where: { testParameterId: dupParam.id },
                data: { testParameterId: masterParam.id }
              });
              console.log(`      ✅ Migrated ${migrated.count} test result(s)`);
            }

            // Delete test categories
            const deletedCategories = await prisma.testCategory.deleteMany({
              where: { testParameterId: dupParam.id }
            });
            console.log(`      ✅ Deleted ${deletedCategories.count} category link(s)`);

            // Delete duplicate parameter
            await prisma.testParameter.delete({
              where: { id: dupParam.id }
            });
            console.log(`      ✅ Deleted duplicate parameter ID ${dupParam.id}`);
            mergedCount++;
          }
        } else {
          // Different purposes - keep separate
          console.log(`   ⚠️  Found ${functionalGroups.length} DIFFERENT purposes for "${normalizedName}"`);
          console.log(`   📝 These are DIFFERENT parameters - KEEPING SEPARATE:`);
          
          functionalGroups.forEach((group, idx) => {
            const textDescriptions = group.map(p => `textContent: "${p.textContent || 'empty'}"` || 'type: ' + p.type).join(', ');
            console.log(`      Purpose ${idx + 1}: ${textDescriptions} [IDs: ${group.map(p => p.id).join(', ')}]`);
          });
          
          skippedDifferent += params.length - 1;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 NORMALIZATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Total duplicate instances MERGED: ${mergedCount}`);
    console.log(`⚠️  Total instances SKIPPED (different purposes): ${skippedDifferent}`);
    console.log(`📈 Preserved unique parameter purposes: ${skippedDifferent > 0 ? 'Yes (correctly kept separate)' : 'N/A'}`);

    // Step 4: Final verification
    const uniqueParams = await prisma.testParameter.groupBy({
      by: ['parameterName'],
      _count: {
        id: true
      }
    });

    console.log(`\n📈 Final status: ${uniqueParams.length} unique parameter names in database`);
    const stillHaveDupes = uniqueParams.filter(p => p._count.id > 1);
    if (stillHaveDupes.length > 0) {
      console.log(`\n⚠️  Parameters with multiple instances (different purposes - INTENTIONALLY KEPT):`);
      stillHaveDupes.forEach(p => {
        console.log(`   "${p.parameterName}": ${p._count.id} instances (different purposes)`);
      });
    } else {
      console.log(`✅ All parameters are unique or consolidated!`);
    }

    console.log('\n✅ Parameter code normalization completed successfully!');
    console.log('📌 Parameters with different purposes were INTENTIONALLY kept separate\n');

  } catch (error) {
    console.error('❌ Error during normalization:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
normalizeParameterCodes().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
