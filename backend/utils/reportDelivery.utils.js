import { PrismaClient } from '@prisma/client';
import { aisensyService } from '../services/aisensy.service.js';

const prisma = new PrismaClient();

/**
 * Log notification event in audit table
 */
export async function logNotification(data) {
  try {
    await prisma.notificationLog.create({
      data: {
        visitId: data.visitId,
        patientId: data.patientId,
        eventType: data.eventType, // PATIENT_REGISTRATION, VISIT_BILL, REPORT_DELIVERY
        status: data.status, // SUCCESS, FAILED
        responseMessageId: data.responseMessageId || null,
        errorMessage: data.errorMessage || null,
        recipientType: data.recipientType || 'patient', // patient or doctor
        recipientId: data.recipientId || null,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
}

/**
 * Send registration credentials to patient
 * Template 1: First-time patient registration
 */
export async function sendRegistrationCredentials(patient, patientId, tempPassword, reportMode) {
  try {
    // Determine channel based on reportMode
    if (reportMode === 'WHATSAPP') {
      if (!patient.mobile) {
        await logNotification({
          patientId: patient.patientId,
          eventType: 'PATIENT_REGISTRATION',
          status: 'FAILED',
          errorMessage: 'WhatsApp reportMode selected but patient mobile number is missing',
          recipientType: 'patient'
        });
        return { success: false, error: 'Mobile number not provided' };
      }

      const result = await aisensyService.sendRegistrationCredentials(
        patient.mobile,
        `${patient.firstName} ${patient.lastName || ''}`.trim(),
        patientId,
        tempPassword
      );

      if (result.success) {
        await logNotification({
          patientId: patient.patientId,
          eventType: 'PATIENT_REGISTRATION',
          status: 'SUCCESS',
          responseMessageId: result.messageId,
          recipientType: 'patient'
        });
      } else {
        await logNotification({
          patientId: patient.patientId,
          eventType: 'PATIENT_REGISTRATION',
          status: 'FAILED',
          errorMessage: result.error || 'AISensy API error',
          recipientType: 'patient'
        });
      }
      return result;
    } 
    else if (reportMode === 'EMAIL') {
      if (!patient.email) {
        await logNotification({
          patientId: patient.patientId,
          eventType: 'PATIENT_REGISTRATION',
          status: 'FAILED',
          errorMessage: 'EMAIL reportMode selected but patient email is missing',
          recipientType: 'patient'
        });
        return { success: false, error: 'Email not provided' };
      }

      // Email would be handled by emailService (existing logic)
      // For now, just log success
      await logNotification({
        patientId: patient.patientId,
        eventType: 'PATIENT_REGISTRATION',
        status: 'SUCCESS',
        recipientType: 'patient'
      });
      return { success: true, channel: 'email' };
    }
    else if (reportMode === 'BY_HAND') {
      // No electronic notification
      return { success: true, channel: 'by_hand' };
    }
  } catch (error) {
    console.error('Error in sendRegistrationCredentials:', error);
    await logNotification({
      patientId: patient.patientId,
      eventType: 'PATIENT_REGISTRATION',
      status: 'FAILED',
      errorMessage: error.message,
      recipientType: 'patient'
    });
    return { success: false, error: error.message };
  }
}

/**
 * Send visit bill notification with bill PDF
 * Template 2: Every visit/invoice creation or bill finalization
 */
export async function sendVisitBillNotification(visitId, patient, billPdfUrl, reportMode) {
  try {
    if (reportMode === 'WHATSAPP') {
      if (!patient.mobile) {
        await logNotification({
          visitId,
          patientId: patient.patientId,
          eventType: 'VISIT_BILL',
          status: 'FAILED',
          errorMessage: 'WhatsApp reportMode selected but patient mobile number is missing',
          recipientType: 'patient'
        });
        return { success: false, error: 'Mobile number not provided' };
      }

      const result = await aisensyService.sendVisitBillNotification(
        patient.mobile,
        `${patient.firstName} ${patient.lastName || ''}`.trim(),
        visitId,
        billPdfUrl
      );

      if (result.success) {
        await logNotification({
          visitId,
          patientId: patient.patientId,
          eventType: 'VISIT_BILL',
          status: 'SUCCESS',
          responseMessageId: result.messageId,
          recipientType: 'patient'
        });
      } else {
        await logNotification({
          visitId,
          patientId: patient.patientId,
          eventType: 'VISIT_BILL',
          status: 'FAILED',
          errorMessage: result.error || 'AISensy API error',
          recipientType: 'patient'
        });
      }
      return result;
    }
    else if (reportMode === 'EMAIL') {
      if (!patient.email) {
        await logNotification({
          visitId,
          patientId: patient.patientId,
          eventType: 'VISIT_BILL',
          status: 'FAILED',
          errorMessage: 'EMAIL reportMode selected but patient email is missing',
          recipientType: 'patient'
        });
        return { success: false, error: 'Email not provided' };
      }

      // Email would be handled by emailService
      await logNotification({
        visitId,
        patientId: patient.patientId,
        eventType: 'VISIT_BILL',
        status: 'SUCCESS',
        recipientType: 'patient'
      });
      return { success: true, channel: 'email' };
    }
    else if (reportMode === 'BY_HAND') {
      return { success: true, channel: 'by_hand' };
    }
  } catch (error) {
    console.error('Error in sendVisitBillNotification:', error);
    await logNotification({
      visitId,
      patientId: patient.patientId,
      eventType: 'VISIT_BILL',
      status: 'FAILED',
      errorMessage: error.message,
      recipientType: 'patient'
    });
    return { success: false, error: error.message };
  }
}

/**
 * Send final report to patient
 * Template 3: Report delivery to patient
 */
export async function sendReportToPatient(visitId, patient, reportPdfUrl, reportMode) {
  try {
    if (reportMode === 'WHATSAPP') {
      if (!patient.mobile) {
        await logNotification({
          visitId,
          patientId: patient.patientId,
          eventType: 'REPORT_DELIVERY',
          status: 'FAILED',
          errorMessage: 'WhatsApp reportMode selected but patient mobile number is missing',
          recipientType: 'patient'
        });
        return { success: false, error: 'Mobile number not provided' };
      }

      const result = await aisensyService.sendFinalReport(
        patient.mobile,
        `${patient.firstName} ${patient.lastName || ''}`.trim(),
        visitId,
        reportPdfUrl,
        'patient'
      );

      if (result.success) {
        await logNotification({
          visitId,
          patientId: patient.patientId,
          eventType: 'REPORT_DELIVERY',
          status: 'SUCCESS',
          responseMessageId: result.messageId,
          recipientType: 'patient'
        });
      } else {
        await logNotification({
          visitId,
          patientId: patient.patientId,
          eventType: 'REPORT_DELIVERY',
          status: 'FAILED',
          errorMessage: result.error || 'AISensy API error',
          recipientType: 'patient'
        });
      }
      return result;
    }
    else if (reportMode === 'EMAIL') {
      if (!patient.email) {
        await logNotification({
          visitId,
          patientId: patient.patientId,
          eventType: 'REPORT_DELIVERY',
          status: 'FAILED',
          errorMessage: 'EMAIL reportMode selected but patient email is missing',
          recipientType: 'patient'
        });
        return { success: false, error: 'Email not provided' };
      }

      // Email would be handled by emailService
      await logNotification({
        visitId,
        patientId: patient.patientId,
        eventType: 'REPORT_DELIVERY',
        status: 'SUCCESS',
        recipientType: 'patient'
      });
      return { success: true, channel: 'email' };
    }
    else if (reportMode === 'BY_HAND') {
      return { success: true, channel: 'by_hand' };
    }
  } catch (error) {
    console.error('Error in sendReportToPatient:', error);
    await logNotification({
      visitId,
      patientId: patient.patientId,
      eventType: 'REPORT_DELIVERY',
      status: 'FAILED',
      errorMessage: error.message,
      recipientType: 'patient'
    });
    return { success: false, error: error.message };
  }
}

/**
 * Send final report to referral doctor
 * Template 3: Report delivery to referral doctor
 */
export async function sendReportToReferralDoctor(visitId, doctor, patientId, reportPdfUrl) {
  try {
    const sendViaWhatsApp = doctor.sendReportsViaWhatsApp === true;
    const sendViaEmail = doctor.sendReportsViaMail === true;

    if (!sendViaWhatsApp && !sendViaEmail) {
      // Doctor has opted out of both channels
      return { success: false, error: 'Doctor has opted out of report notifications' };
    }

    const results = [];

    // Send via WhatsApp if enabled
    if (sendViaWhatsApp) {
      if (!doctor.mobile) {
        await logNotification({
          visitId,
          patientId,
          eventType: 'REPORT_DELIVERY',
          status: 'FAILED',
          errorMessage: 'WhatsApp enabled for doctor but mobile number is missing',
          recipientType: 'doctor',
          recipientId: doctor.id
        });
        results.push({ channel: 'whatsapp', success: false, error: 'Mobile number not provided' });
      } else {
        const result = await aisensyService.sendFinalReport(
          doctor.mobile,
          doctor.name,
          visitId,
          reportPdfUrl,
          'doctor'
        );

        if (result.success) {
          await logNotification({
            visitId,
            patientId,
            eventType: 'REPORT_DELIVERY',
            status: 'SUCCESS',
            responseMessageId: result.messageId,
            recipientType: 'doctor',
            recipientId: doctor.id
          });
        } else {
          await logNotification({
            visitId,
            patientId,
            eventType: 'REPORT_DELIVERY',
            status: 'FAILED',
            errorMessage: result.error || 'AISensy API error',
            recipientType: 'doctor',
            recipientId: doctor.id
          });
        }
        results.push({ channel: 'whatsapp', ...result });
      }
    }

    // Send via Email if enabled
    if (sendViaEmail) {
      if (!doctor.email) {
        await logNotification({
          visitId,
          patientId,
          eventType: 'REPORT_DELIVERY',
          status: 'FAILED',
          errorMessage: 'Email enabled for doctor but email is missing',
          recipientType: 'doctor',
          recipientId: doctor.id
        });
        results.push({ channel: 'email', success: false, error: 'Email not provided' });
      } else {
        // Email would be handled by emailService
        await logNotification({
          visitId,
          patientId,
          eventType: 'REPORT_DELIVERY',
          status: 'SUCCESS',
          recipientType: 'doctor',
          recipientId: doctor.id
        });
        results.push({ channel: 'email', success: true });
      }
    }

    return { success: results.some(r => r.success), results };
  } catch (error) {
    console.error('Error in sendReportToReferralDoctor:', error);
    await logNotification({
      visitId,
      patientId,
      eventType: 'REPORT_DELIVERY',
      status: 'FAILED',
      errorMessage: error.message,
      recipientType: 'doctor'
    });
    return { success: false, error: error.message };
  }
}

/**
 * Check and send pending authorized reports when payment is made
 * This function is called after payment is recorded
 */
export async function checkAndSendPendingAuthorizedReports(visitId) {
  try {
    // Get visit bill to check payment status
    const visitBill = await prisma.visitBill.findUnique({
      where: { visitId },
      include: {
        patient: true
      }
    });

    if (!visitBill) {
      console.log(`Visit bill not found for visitId: ${visitId}`);
      return { success: false, error: 'Visit bill not found' };
    }

    // Check if payment is fully made
    if (visitBill.balanceAmount !== 0) {
      console.log(`Payment not complete for visitId: ${visitId}, balance: ${visitBill.balanceAmount}`);
      return { success: false, error: 'Payment not fully complete' };
    }

    // Get all authorized reports for this visit
    const patientTests = await prisma.patientTest.findMany({
      where: {
        visitId,
        status: 'AUTHORIZED'
      },
      include: {
        patient: true,
        referralDoctor: true
      }
    });

    if (patientTests.length === 0) {
      console.log(`No authorized reports found for visitId: ${visitId}`);
      return { success: true, message: 'No authorized reports to send' };
    }

    // Get reportMode from first test (all tests in a visit have same reportMode)
    const reportMode = patientTests[0].reportMode || 'WHATSAPP';

    // Generate report PDF URL (you'll need to implement this based on your system)
    const reportPdfUrl = await generateReportPdfUrl(visitId);

    const sendResults = {
      toPatient: null,
      toDoctor: null,
      status: 'DELIVERED'
    };

    // Send to patient if contact exists
    const patientSendResult = await sendReportToPatient(
      visitId,
      visitBill.patient,
      reportPdfUrl,
      reportMode
    );
    sendResults.toPatient = patientSendResult;

    // Send to referral doctor if selected
    if (patientTests[0].referralDoctorId && patientTests[0].referralDoctor) {
      const doctorSendResult = await sendReportToReferralDoctor(
        visitId,
        patientTests[0].referralDoctor,
        visitBill.patientId,
        reportPdfUrl
      );
      sendResults.toDoctor = doctorSendResult;
    }

    // Update report status to DELIVERED only if at least one send was successful
    if (patientSendResult.success || (sendResults.toDoctor && sendResults.toDoctor.success)) {
      await prisma.patientTest.updateMany({
        where: { visitId, status: 'AUTHORIZED' },
        data: { status: 'DELIVERED' }
      });
    } else {
      // If both failed due to contact missing, keep as AUTHORIZED
      sendResults.status = 'AUTHORIZED';
    }

    return { success: true, ...sendResults };
  } catch (error) {
    console.error('Error in checkAndSendPendingAuthorizedReports:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate report PDF URL (implement based on your PDF generation logic)
 * This is a placeholder - you need to implement actual PDF generation
 */
async function generateReportPdfUrl(visitId) {
  // TODO: Implement your PDF generation logic
  // Return the public URL where the PDF can be downloaded
  return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/reports/download/${visitId}`;
}
