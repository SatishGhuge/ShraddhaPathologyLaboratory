import nodemailer from 'nodemailer';
import axios from 'axios';

// ============================================================================
// EMAIL SERVICE
// ============================================================================

class EmailService {
  constructor() {
    // Initialize Nodemailer transporter with Gmail or custom SMTP
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    this.fromEmail = process.env.EMAIL_USER || 'noreply@shraddhalab.com';
    this.labName = 'Shraddha Pathology Laboratory';
  }

  // Verify transporter connection
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service verification failed:', error.message);
      return false;
    }
  }

  // Send registration credentials email
  async sendRegistrationCredentials(email, patientName, patientId, tempPassword, registrationType) {
    try {
      const subject = 'Welcome to Shraddha Pathology Laboratory - Your Login Credentials';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF6B35; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .credentials { background-color: white; border-left: 4px solid #FF6B35; padding: 15px; margin: 20px 0; }
            .credential-row { margin: 10px 0; }
            .label { font-weight: bold; color: #FF6B35; }
            .footer { background-color: #f0f0f0; padding: 20px; border-radius: 0 0 5px 5px; font-size: 12px; text-align: center; }
            .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin: 20px 0; border-radius: 5px; }
            .button { background-color: #FF6B35; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${this.labName}</h1>
            </div>
            
            <div class="content">
              <p>Dear <strong>${patientName}</strong>,</p>
              
              <p>Thank you for registering with us! Your account has been successfully created.</p>
              
              <p><strong>Registration Type:</strong> ${this.formatRegistrationType(registrationType)}</p>
              
              <div class="credentials">
                <p style="margin: 0 0 10px 0;">Your Login Credentials:</p>
                <div class="credential-row">
                  <span class="label">Patient ID:</span> ${patientId}
                </div>
                <div class="credential-row">
                  <span class="label">Email:</span> ${email}
                </div>
                <div class="credential-row">
                  <span class="label">Temporary Password:</span> ${tempPassword}
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Please login and change your password as soon as possible</li>
                  <li>Keep your credentials safe and do not share them</li>
                  <li>You can login at our patient portal</li>
                </ul>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Visit our patient portal</li>
                <li>Login with your email and temporary password</li>
                <li>Update your password</li>
                <li>Browse and book tests online</li>
              </ol>
              
              <p>If you have any questions, please contact us at:</p>
              <p>
                📞 Phone: +91-XXXXXXXXXX<br>
                📧 Email: support@shraddhalab.com<br>
                🕐 Working Hours: 9 AM - 6 PM, Monday to Saturday
              </p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${this.labName}. All rights reserved.</p>
              <p>This is an automated email. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: subject,
        html: htmlContent,
        text: `Dear ${patientName},\n\nWelcome to ${this.labName}!\n\nYour Login Credentials:\nPatient ID: ${patientId}\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease login and change your password as soon as possible.\n\nThank you!`
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Registration email sent to ${email}:`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send registration email to ${email}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Send email verification link
  async sendEmailVerificationLink(email, patientName, patientId, verificationToken) {
    try {
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/verify-email?patientId=${patientId}&token=${verificationToken}`;
      
      const subject = 'Verify Your Email - Shraddha Pathology Laboratory';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF6B35; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .button { background-color: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
            .footer { background-color: #f0f0f0; padding: 20px; border-radius: 0 0 5px 5px; font-size: 12px; text-align: center; }
            .warning { color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            
            <div class="content">
              <p>Dear <strong>${patientName}</strong>,</p>
              
              <p>Thank you for registering with ${this.labName}. To complete your registration and access all features, please verify your email address.</p>
              
              <p>Click the button below to verify your email:</p>
              
              <center>
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </center>
              
              <p class="warning">If the button above doesn't work, copy and paste this link in your browser:<br>
              ${verificationLink}</p>
              
              <p class="warning">This verification link will expire in 24 hours.</p>
              
              <p>If you didn't register for this account, please ignore this email.</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${this.labName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}:`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send verification email to ${email}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Send password reset link
  async sendPasswordResetLink(email, patientName, patientId, resetToken) {
    try {
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/patient/reset-password?patientId=${patientId}&token=${resetToken}`;
      
      const subject = 'Password Reset Request - Shraddha Pathology Laboratory';
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF6B35; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .button { background-color: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
            .footer { background-color: #f0f0f0; padding: 20px; border-radius: 0 0 5px 5px; font-size: 12px; text-align: center; }
            .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            
            <div class="content">
              <p>Dear <strong>${patientName}</strong>,</p>
              
              <p>We received a request to reset your password for your ${this.labName} account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <center>
                <a href="${resetLink}" class="button">Reset Password</a>
              </center>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this, ignore this email</li>
                  <li>Never share this link with anyone</li>
                </ul>
              </div>
              
              <p>If the button above doesn't work, copy and paste this link in your browser:<br>
              ${resetLink}</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${this.labName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}:`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send password reset email to ${email}:`, error);
      return { success: false, error: error.message };
    }
  }

  formatRegistrationType(type) {
    const types = {
      'self': 'Self Registration',
      'organization': 'Organization Registration',
      'direct': 'Direct Registration at Lab'
    };
    return types[type] || type;
  }
}

// ============================================================================
// SMS SERVICE (WhatsApp via CallMeBot or Twilio)
// ============================================================================

class SMSService {
  constructor() {
    this.provider = process.env.WHATSAPP_PROVIDER || 'callmebot';
    this.labName = 'Shraddha Pathology Laboratory';
  }

  async sendWhatsAppMessage(phoneNumber, message) {
    try {
      if (this.provider === 'twilio') {
        return await this.sendViaTwilio(phoneNumber, message);
      } else {
        return await this.sendViaCallMeBot(phoneNumber, message);
      }
    } catch (error) {
      console.error(`❌ Failed to send WhatsApp message to ${phoneNumber}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendViaCallMeBot(phoneNumber, message) {
    try {
      // CallMeBot format: +91 format without + for WhatsApp
      const formattedPhone = phoneNumber.replace(/^\+/, '');
      
      const response = await axios.get(`https://api.callmebot.com/whatsapp.php`, {
        params: {
          phone: formattedPhone,
          text: message,
          apikey: process.env.CALLMEBOT_API_KEY
        }
      });

      console.log(`✅ WhatsApp message sent to ${phoneNumber} via CallMeBot`);
      return { success: true, provider: 'callmebot' };
    } catch (error) {
      console.error(`❌ CallMeBot failed for ${phoneNumber}:`, error.message);
      return { success: false, error: error.message, provider: 'callmebot' };
    }
  }

  async sendViaTwilio(phoneNumber, message) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

      const client = require('twilio')(accountSid, authToken);

      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: `whatsapp:${phoneNumber}`
      });

      console.log(`✅ WhatsApp message sent to ${phoneNumber} via Twilio:`, result.sid);
      return { success: true, messageId: result.sid, provider: 'twilio' };
    } catch (error) {
      console.error(`❌ Twilio failed for ${phoneNumber}:`, error.message);
      return { success: false, error: error.message, provider: 'twilio' };
    }
  }

  sendRegistrationCredentialsMessage(phoneNumber, patientName, patientId, tempPassword) {
    const message = `
Hello ${patientName}!

Welcome to ${this.labName}

Your Login Credentials:
📱 Patient ID: ${patientId}
🔑 Temporary Password: ${tempPassword}

Please login and change your password immediately.

Thank you!
    `.trim();

    return this.sendWhatsAppMessage(phoneNumber, message);
  }

  sendTestBookingConfirmation(phoneNumber, patientName, testName, bookingDate) {
    const message = `
Hello ${patientName}!

Your test booking is confirmed!

Test: ${testName}
Date: ${bookingDate}

Thank you for choosing ${this.labName}
    `.trim();

    return this.sendWhatsAppMessage(phoneNumber, message);
  }

  sendHomeVisitScheduledMessage(phoneNumber, patientName, visitDate, runnerName) {
    const message = `
Hello ${patientName}!

Your home visit has been scheduled!

📅 Date: ${visitDate}
👤 Runner: ${runnerName}

Your runner will reach within the scheduled time slot.

Thank you!
    `.trim();

    return this.sendWhatsAppMessage(phoneNumber, message);
  }

  sendReportReadyNotification(phoneNumber, patientName, testName) {
    const message = `
Hello ${patientName}!

Great news! Your test report is ready! 🎉

Test: ${testName}

Login to your account to download your report.

Thank you for trusting ${this.labName}
    `.trim();

    return this.sendWhatsAppMessage(phoneNumber, message);
  }
}

// ============================================================================
// EXPORT SERVICES
// ============================================================================

export const emailService = new EmailService();
export const smsService = new SMSService();
