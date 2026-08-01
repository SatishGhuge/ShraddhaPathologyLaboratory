const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPatient() {
  try {
    // Find RIA JADHAV (Patient ID: S260700003)
    let patient = await prisma.patient.findUnique({
      where: {
        patientId: 'S260700003'
      }
    });
    
    if (patient) {
      console.log('✅ PATIENT FOUND:');
      console.log('  Name:', patient.firstName, patient.lastName);
      console.log('  PatientID:', patient.patientId);
      console.log('  DOB:', patient.dob);
      console.log('  ageYears:', patient.ageYears);
      console.log('  ageMonths:', patient.ageMonths);
      console.log('  ageDays:', patient.ageDays);
      console.log('  gender:', patient.gender);
      console.log('');
      
      // Calculate what age should be
      if (patient.dob) {
        const today = new Date();
        const birthDate = new Date(patient.dob);
        
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();
        
        if (days < 0) {
          months--;
          const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          days += lastMonth.getDate();
        }
        
        if (months < 0) {
          years--;
          months += 12;
        }
        
        console.log('📊 CALCULATED AGE:');
        console.log('  Should be:', years + 'Y', months + 'M', days + 'D');
        console.log('  Database has:', patient.ageYears + 'Y', patient.ageMonths + 'M', patient.ageDays + 'D');
        console.log('  Match:', (years === patient.ageYears && months === patient.ageMonths && days === patient.ageDays) ? '✅ YES' : '❌ NO');
      }
    } else {
      console.log('❌ Patient not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPatient();
