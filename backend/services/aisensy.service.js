import axios from 'axios';

/**
 * AISensy WhatsApp Integration Service
 * Handles sending templated WhatsApp messages via AISensy API
 */

class AISensyService {
  constructor() {
    this.apiKey = process.env.AISENSY_API_KEY;
    this.baseUrl = 'https://backend.aisensy.com/campaign/t1/api/v2';
    this.labName = 'Shraddha Pathology Laboratory';
  }

  /**
   * Format phone number to E.164 standard (+91 for India)
   * @param {string} phone - Phone number in any format
   * @returns {string|null} - Formatted phone number or null if invalid
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    try {
      // Remove all non-digit characters
      const cleaned = phone.replace(/\D/g, '');
      
      // If already has country code (12 digits for India starting with 91)
      if (cleaned.startsWith('91') && cleaned.length === 12) {
        return `+${cleaned}`;
      }
      
      // If 10 digits (just India mobile), add +91
      if (cleaned.length === 10) {
        return `+91${cleaned}`;
      }
      
      // If 11 digits and starts with 0 (old format), remove 0 and add +91
      if (cleaned.startsWith('0') && cleaned.length === 11) {
        return `+91${cleaned.slice(1)}`;
      }
      
      return null; // Invalid format
    } catch (error) {
      console.error('Phone formatting error:', error);
      return null;
    }
  }

  /**
   * Send text template message (Credentials)
   * @param {Object} params
   * @returns {Object} - Response from AISensy
   */
  async sendTextTemplate({ phone, patientName, campaignName, templateParams }) {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      if (!formattedPhone) {
        return {
          success: false,
          error: 'Invalid phone number format',
          errorCode: 'INVALID_PHONE'
        };
      }

      if (!this.apiKey) {
        console.error('AISensy API Key not configured');
        return {
          success: false,
          error: 'AISensy API Key not configured',
          errorCode: 'MISSING_API_KEY'
        };
      }

      const payload = {
        apiKey: this.apiKey,
        campaignName: campaignName,
        destination: formattedPhone,
        userName: patientName,
        templateParams: templateParams
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.success || response.data.status === 'submitted') {
        return {
          success: true,
          messageId: response.data.messageId || response.data.id,
          status: response.data.status,
          response: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'AISensy API returned error',
          response: response.data
        };
      }
    } catch (error) {
      console.error(`❌ AISensy Text Template Error (${phone}):`, error.message);
      return {
        success: false,
        error: error.message,
        errorCode: error.code || 'API_ERROR'
      };
    }
  }

  /**
   * Send document/media template message (Bill PDF, Report PDF)
   * @param {Object} params
   * @returns {Object} - Response from AISensy
   */
  async sendDocumentTemplate({ phone, patientName, campaignName, pdfUrl, filename, templateParams }) {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      if (!formattedPhone) {
        return {
          success: false,
          error: 'Invalid phone number format',
          errorCode: 'INVALID_PHONE'
        };
      }

      if (!this.apiKey) {
        console.error('AISensy API Key not configured');
        return {
          success: false,
          error: 'AISensy API Key not configured',
          errorCode: 'MISSING_API_KEY'
        };
      }

      if (!pdfUrl) {
        return {
          success: false,
          error: 'PDF URL is required',
          errorCode: 'MISSING_PDF_URL'
        };
      }

      const payload = {
        apiKey: this.apiKey,
        campaignName: campaignName,
        destination: formattedPhone,
        userName: patientName,
        media: {
          url: pdfUrl,
          filename: filename || 'document.pdf'
        },
        templateParams: templateParams
      };

      const response = await axios.post(this.baseUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.success || response.data.status === 'submitted') {
        return {
          success: true,
          messageId: response.data.messageId || response.data.id,
          status: response.data.status,
          response: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'AISensy API returned error',
          response: response.data
        };
      }
    } catch (error) {
      console.error(`❌ AISensy Document Template Error (${phone}):`, error.message);
      return {
        success: false,
        error: error.message,
        errorCode: error.code || 'API_ERROR'
      };
    }
  }

  /**
   * Send registration credentials to patient
   * Template 1: First-time patient registration credentials
   */
  async sendRegistrationCredentials(phone, patientName, patientId, tempPassword) {
    return this.sendTextTemplate({
      phone,
      patientName,
      campaignName: process.env.AISENSY_WELCOME_CAMPAIGN || 'patient_welcome_credentials',
      templateParams: [patientName, patientId, tempPassword]
    });
  }

  /**
   * Send visit bill thank you message with bill PDF
   * Template 2: Every visit/invoice creation
   */
  async sendVisitBillNotification(phone, patientName, visitId, billPdfUrl) {
    return this.sendDocumentTemplate({
      phone,
      patientName,
      campaignName: process.env.AISENSY_VISIT_BILL_CAMPAIGN || 'visit_bill_dispatch',
      pdfUrl: billPdfUrl,
      filename: `Bill_${visitId}.pdf`,
      templateParams: [patientName, visitId]
    });
  }

  /**
   * Send final report to patient or doctor
   * Template 3: Report authorization & delivery
   */
  async sendFinalReport(phone, recipientName, visitId, reportPdfUrl, recipientType = 'patient') {
    return this.sendDocumentTemplate({
      phone,
      patientName: recipientName,
      campaignName: process.env.AISENSY_REPORT_CAMPAIGN || 'lab_report_dispatch',
      pdfUrl: reportPdfUrl,
      filename: `Report_${visitId}.pdf`,
      templateParams: [recipientName, visitId]
    });
  }
}

export const aisensyService = new AISensyService();
