import nodemailer from 'nodemailer';

// Create transporter with better error handling and debugging
const createTransporter = () => {
  console.log('📧 Creating email transporter with config:', {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '***' : 'NOT SET'
  });

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports like 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates
    },
    debug: true, // Enable debug output
    logger: true // Log to console
  });
};

// Test email connection
export const testEmailConnection = async () => {
  try {
    console.log('🔍 Testing email connection...');
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email server connection verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Email server connection failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, code) => {
  try {
    console.log('📧 Attempting to send password reset email to:', email);
    
    // Test connection first
    const connectionOk = await testEmailConnection();
    if (!connectionOk) {
      throw new Error('Email server connection failed');
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Shraddha Pathology Laboratory Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Admin Password Reset - Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Shraddha Pathology Laboratory</h1>
            <p style="color: white; margin: 5px 0;">Admin Security Center</p>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #f97316;">Admin Password Reset Request</h2>
            <p style="color: #374151; font-size: 16px;">
              A password reset has been requested for your admin account. If you did not request this, please ignore this email and contact IT support immediately.
            </p>
            
            <div style="background: white; border: 2px solid #f97316; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <p style="color: #6b7280; margin: 0 0 10px 0;">Your verification code is:</p>
              <h1 style="color: #f97316; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${code}</h1>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                <strong>⚠️ Security Notice:</strong><br>
                • This code expires in 15 minutes<br>
                • Only use this code if you requested the password reset<br>
                • Never share this code with anyone<br>
                • If you didn't request this, contact IT support immediately
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              This email was sent to: <strong>${email}</strong><br>
              Time: ${new Date().toLocaleString()}<br>
              IP: Request from admin portal
            </p>
          </div>
          
          <div style="background: #e5e7eb; padding: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © 2026 Shraddha Pathology Laboratory - Admin Security System<br>
              This is an automated security email. Do not reply to this message.
            </p>
          </div>
        </div>
      `
    };

    console.log('📤 Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', {
      messageId: result.messageId,
      response: result.response,
      to: email
    });

    return result;

  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    throw new Error(`Failed to send security email: ${error.message}`);
  }
};

// Send password changed confirmation email
export const sendPasswordChangedEmail = async (email, username, newPassword) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Shraddha Pathology Laboratory" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Admin Password Has Been Reset',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#f97316,#fb923c);padding:20px;text-align:center;">
            <h1 style="color:white;margin:0;">Shraddha Pathology Laboratory</h1>
            <p style="color:white;margin:5px 0;">Admin Security Center</p>
          </div>
          <div style="padding:30px;background:#f9fafb;">
            <h2 style="color:#f97316;">Password Reset Successful</h2>
            <p style="color:#374151;">Your admin password has been successfully reset.</p>
            <div style="background:white;border:2px solid #f97316;border-radius:8px;padding:20px;margin:20px 0;">
              <p style="margin:0 0 8px 0;color:#6b7280;">Username:</p>
              <p style="font-size:18px;font-weight:bold;color:#111827;margin:0 0 16px 0;">${username}</p>
              <p style="margin:0 0 8px 0;color:#6b7280;">New Password:</p>
              <p style="font-size:18px;font-weight:bold;color:#f97316;letter-spacing:2px;margin:0;font-family:'Courier New',monospace;">${newPassword}</p>
            </div>
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:15px;margin:20px 0;">
              <p style="color:#92400e;font-size:14px;margin:0;">
                <strong>⚠️ Security Notice:</strong><br>
                Please login and change your password immediately.<br>
                If you did not request this reset, contact IT support immediately.
              </p>
            </div>
          </div>
          <div style="background:#e5e7eb;padding:20px;text-align:center;">
            <p style="color:#6b7280;font-size:12px;margin:0;">© 2026 Shraddha Pathology Laboratory</p>
          </div>
        </div>
      `
    });
    console.log(`✅ Password changed confirmation sent to: ${email}`);
  } catch (error) {
    console.error('❌ Failed to send password changed email:', error.message);
    throw error;
  }
};

// Send user credentials email (for staff users — AddUser form with auto-generated credentials)
export const sendUserCredentialsEmail = async (email, name, username, password, role) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Shraddha Pathology Laboratory" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Shraddha Pathology Laboratory Account Has Been Created',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Shraddha Pathology Laboratory</h1>
            <p style="color: white; margin: 5px 0;">Empowering Life Transforming Health</p>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <p style="color: #374151; font-size: 16px;">Hello ${name},</p>
            <p style="color: #374151; font-size: 16px;">
              Your staff account has been successfully created. Your login credentials are provided below.
            </p>
            <div style="background: white; border: 2px solid #f97316; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;"><strong>Login Credentials</strong></p>
              <p style="margin: 8px 0; color: #374151; font-size: 14px;"><strong>Username:</strong> <span style="font-family: 'Courier New', monospace; color: #f97316; font-weight: bold;">${username}</span></p>
              <p style="margin: 8px 0; color: #374151; font-size: 14px;"><strong>Password:</strong> <span style="font-family: 'Courier New', monospace; color: #f97316; font-weight: bold;">${password}</span></p>
              <p style="margin: 8px 0; color: #374151; font-size: 14px;"><strong>Role:</strong> ${role || 'Staff'}</p>
            </div>
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="color: #92400e; font-size: 13px; margin: 0;">
                <strong>⚠️ Important:</strong><br>
                • Please login with the credentials provided above<br>
                • Keep your password secure and confidential<br>
                • You can change your password after first login<br>
                • Do not share your credentials with anyone
              </p>
            </div>
            <p style="color: #374151; font-size: 15px;">Please login at the Shraddha Pathology Laboratory portal using the credentials above.</p>
            <p style="color: #374151; font-size: 15px;">Thank you.</p>
          </div>
          <div style="background: #e5e7eb; padding: 15px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">Shraddha Pathology Laboratory | Plot No-38, Sector-1, New Panvel - 410 206</p>
          </div>
        </div>
      `,
    });
    console.log(`✅ User credentials email sent to ${email}`);
  } catch (error) {
    console.error('❌ Failed to send user credentials email:', error.message);
    throw error;
  }
};

// Send collection center credentials email (for AddCenter — different format)
export const sendCenterCredentialsEmail = async (email, centerName, username, password, isUpdate = false) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Shraddha Pathology Laboratory" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: isUpdate ? `Collection Center Account Updated — ${centerName}` : `Welcome to Shraddha Pathology Laboratory — ${centerName} Account Details`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #f97316 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Shraddha Pathology Laboratory</h1>
            <p style="color: #fed7aa; margin: 5px 0;">Collection Center Portal</p>
          </div>
          <div style="padding: 30px; background: #fffbeb;">
            <p style="color: #374151; font-size: 16px;">Hello,</p>
            <p style="color: #374151; font-size: 16px;">
              ${isUpdate
                ? `The account for <strong>${centerName}</strong> has been updated.`
                : `Welcome! Your Collection Center account for <strong>${centerName}</strong> has been created.`}
            </p>
            <div style="background: white; border: 2px solid #f97316; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong>Center Name:</strong> ${centerName}</p>
              <p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong>Username:</strong> ${username}</p>
              ${!isUpdate ? `<p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong>Password:</strong> ${password}</p>` : ''}
            </div>
            <p style="color: #374151; font-size: 15px;">Use these credentials to log in to the Shraddha Pathology Laboratory Collection Center portal.</p>
            <p style="color: #374151; font-size: 15px;">Thank you.</p>
          </div>
          <div style="background: #fed7aa; padding: 15px; text-align: center;">
            <p style="color: #92400e; font-size: 12px; margin: 0;">Shraddha Pathology Laboratory | Plot No-38, Sector-1, New Panvel - 410 206 | 📞 8779295302</p>
          </div>
        </div>
      `,
    });
    console.log(`✅ Center credentials email sent to ${email}`);
  } catch (error) {
    console.error('❌ Failed to send center credentials email:', error.message);
  }
};

// Send staff/user credentials email (for regular staff users — not collection centers)
export const sendStaffCredentialsEmail = async (email, name, username, password, role) => {
  try {
    const transporter = createTransporter();
    const isUpdate = password === '(unchanged)';
    await transporter.sendMail({
      from: `"Shraddha Pathology Laboratory" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: isUpdate ? 'Your Account Has Been Updated' : 'Your Shraddha Pathology Laboratory Account Details',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Shraddha Pathology Laboratory</h1>
            <p style="color: white; margin: 5px 0;">Empowering Life Transforming Health</p>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <p style="color: #374151; font-size: 16px;">Hello ${name},</p>
            <p style="color: #374151; font-size: 16px;">
              ${isUpdate ? 'Your staff account has been updated.' : `Your Shraddha Pathology Laboratory staff account has been created.`}
            </p>
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0; color: #374151;"><strong>Username:</strong> ${username}</p>
              ${!isUpdate ? `<p style="margin: 8px 0; color: #374151;"><strong>Password:</strong> ${password}</p>` : ''}
              <p style="margin: 8px 0; color: #374151;"><strong>Role:</strong> ${role || 'Staff'}</p>
            </div>
            <p style="color: #374151; font-size: 16px;">Please login with the above credentials at the Shraddha Pathology Laboratory portal.</p>
          </div>
          <div style="background: #e5e7eb; padding: 15px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">Shraddha Pathology Laboratory | Plot No-38, Sector-1, New Panvel - 410 206</p>
          </div>
        </div>
      `,
    });
    console.log(`✅ Staff credentials email sent to ${email}`);
  } catch (error) {
    console.error('❌ Failed to send staff credentials email:', error.message);
  }
};

// Send test result notification email to patient — document style
export const sendResultNotificationEmail = async (patient, testName, visitId, results) => {
  if (!patient.email) return;
  try {
    const transporter = createTransporter();
    const patientName = `${patient.title || ''} ${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    const date = new Date().toLocaleDateString('en-GB');

    // Separate header rows from parameter rows
    const bodyRows = results.map(r => {
      if (r.isHeader) {
        return `<tr><td colspan="4" style="padding:6px 10px;background:#e0f2fe;font-weight:bold;font-size:12px;border-bottom:1px solid #bae6fd;">${r.testName}</td></tr>`;
      }
      const abnormal = r.isAbnormal;
      return `
        <tr style="background:${abnormal ? '#fff7f7' : 'white'};">
          <td style="padding:5px 10px;border-bottom:1px solid #f3f4f6;font-size:12px;">${r.parameterName}</td>
          <td style="padding:5px 10px;border-bottom:1px solid #f3f4f6;font-size:12px;font-weight:${abnormal ? 'bold' : 'normal'};color:${abnormal ? '#dc2626' : '#111827'};">
            ${r.value ?? '-'}${abnormal ? ' ⚠' : ''}
          </td>
          <td style="padding:5px 10px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;">${r.units || ''}</td>
          <td style="padding:5px 10px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;">${r.referenceRange || ''}</td>
        </tr>`;
    }).join('');

    await transporter.sendMail({
      from: `"Shraddha Pathology Laboratory" <${process.env.EMAIL_USER}>`,
      to: patient.email,
      subject: `Lab Report Ready — ${testName} | Lab No: ${visitId}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#f97316 0%,#fb923c 100%);padding:20px 24px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:22px;letter-spacing:1px;">Shraddha Pathology Laboratory</h1>
            <p style="color:#fed7aa;margin:4px 0 0;font-size:13px;">Empowering Life Transforming Health</p>
            <p style="color:#fecaca;margin:2px 0 0;font-size:11px;">Plot No-38, Sector-1, New Panvel - 410 206 | 📞 8779295302</p>
          </div>

          <!-- Report Title -->
          <div style="background:#fffbeb;padding:10px 24px;border-bottom:2px solid #f97316;text-align:center;">
            <h2 style="margin:0;font-size:15px;color:#92400e;letter-spacing:0.5px;">LABORATORY REPORT</h2>
          </div>

          <!-- Patient Info -->
          <div style="padding:14px 24px;background:#fafafa;border-bottom:1px solid #e5e7eb;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tr>
                <td style="padding:3px 0;width:50%;"><strong>Patient Name:</strong> ${patientName}</td>
                <td style="padding:3px 0;width:50%;"><strong>Lab No:</strong> ${visitId}</td>
              </tr>
              <tr>
                <td style="padding:3px 0;"><strong>Age / Gender:</strong> ${patient.age || '-'} Yrs / ${patient.gender || '-'}</td>
                <td style="padding:3px 0;"><strong>Report Date:</strong> ${date}</td>
              </tr>
              <tr>
                <td style="padding:3px 0;" colspan="2"><strong>Test:</strong> ${testName}</td>
              </tr>
            </table>
          </div>

          <!-- Results Table -->
          <div style="padding:0 24px 16px;">
            <table style="width:100%;border-collapse:collapse;margin-top:12px;">
              <thead>
                <tr style="background:#f97316;color:white;">
                  <th style="padding:8px 10px;text-align:left;font-size:12px;">Investigation</th>
                  <th style="padding:8px 10px;text-align:left;font-size:12px;">Result</th>
                  <th style="padding:8px 10px;text-align:left;font-size:12px;">Unit</th>
                  <th style="padding:8px 10px;text-align:left;font-size:12px;">Reference Range</th>
                </tr>
              </thead>
              <tbody>${bodyRows}</tbody>
            </table>
            <p style="color:#6b7280;font-size:11px;margin-top:8px;">⚠ Values marked with ⚠ are outside the normal reference range. Please consult your doctor.</p>
          </div>

          <!-- Footer -->
          <div style="background:#f3f4f6;padding:12px 24px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#6b7280;font-size:11px;margin:0;">This is a computer-generated report. | Shraddha Pathology Laboratory | ${date}</p>
            <p style="color:#9ca3af;font-size:10px;margin:4px 0 0;">For queries: ${process.env.EMAIL_USER} | 📞 8779295302</p>
          </div>
        </div>
      `
    });
    console.log(`✅ Result email sent to ${patient.email}`);
  } catch (error) {
    console.error('❌ Failed to send result email:', error.message);
  }
};

// Send franchise credentials email (different format from collection center)
export const sendFranchiseCredentialsEmail = async (email, franchiseName, username, password, isUpdate = false) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Shraddha Pathology Laboratory" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: isUpdate ? `Franchise Account Updated — ${franchiseName}` : `Welcome Franchise Partner — ${franchiseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #f97316 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Shraddha Pathology Laboratory</h1>
            <p style="color: #fed7aa; margin: 5px 0;">Franchise Partner Portal</p>
          </div>
          <div style="padding: 30px; background: #fffbeb;">
            <p style="color: #374151; font-size: 16px;">Hello,</p>
            <p style="color: #374151; font-size: 16px;">
              ${isUpdate
                ? `The franchise account for <strong>${franchiseName}</strong> has been updated.`
                : `Welcome! Your Franchise account for <strong>${franchiseName}</strong> has been created.`}
            </p>
            <div style="background: white; border: 2px solid #f97316; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong>Franchise Name:</strong> ${franchiseName}</p>
              <p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong>Username:</strong> ${username}</p>
              ${!isUpdate ? `<p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong>Password:</strong> ${password}</p>` : ''}
            </div>
            <p style="color: #374151; font-size: 15px;">Use these credentials to log in to the Shraddha Pathology Laboratory Franchise portal.</p>
            <p style="color: #374151; font-size: 15px;">Thank you for partnering with us.</p>
          </div>
          <div style="background: #fed7aa; padding: 15px; text-align: center;">
            <p style="color: #92400e; font-size: 12px; margin: 0;">Shraddha Pathology Laboratory | Plot No-38, Sector-1, New Panvel - 410 206 | 📞 8779295302</p>
          </div>
        </div>
      `,
    });
    console.log(`✅ Franchise credentials email sent to ${email}`);
  } catch (error) {
    console.error('❌ Failed to send franchise credentials email:', error.message);
  }
};

// Send organization credentials email (different format from franchise)
export const sendOrganizationCredentialsEmail = async (email, organizationName, username, password, isUpdate = false) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Shraddha Pathology Laboratory" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: isUpdate ? `Organization Account Updated — ${organizationName}` : `Welcome Organization Partner — ${organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #f97316 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Shraddha Pathology Laboratory</h1>
            <p style="color: #fed7aa; margin: 5px 0;">Organization Partner Portal</p>
          </div>
          <div style="padding: 30px; background: #fffbeb;">
            <p style="color: #374151; font-size: 16px;">Hello,</p>
            <p style="color: #374151; font-size: 16px;">
              ${isUpdate
                ? `The organization account for <strong>${organizationName}</strong> has been updated.`
                : `Welcome! Your Organization account for <strong>${organizationName}</strong> has been created.`}
            </p>
            <div style="background: white; border: 2px solid #f97316; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong>Organization Name:</strong> ${organizationName}</p>
              <p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong>Username:</strong> ${username}</p>
              ${!isUpdate ? `<p style="margin: 8px 0; color: #374151; font-size: 15px;"><strong>Password:</strong> ${password}</p>` : ''}
            </div>
            <p style="color: #374151; font-size: 15px;">Use these credentials to log in to the Shraddha Pathology Laboratory Organization portal.</p>
            <p style="color: #374151; font-size: 15px;">Thank you for partnering with us.</p>
          </div>
          <div style="background: #fed7aa; padding: 15px; text-align: center;">
            <p style="color: #92400e; font-size: 12px; margin: 0;">Shraddha Pathology Laboratory | Plot No-38, Sector-1, New Panvel - 410 206 | 📞 8779295302</p>
          </div>
        </div>
      `,
    });
    console.log(`✅ Organization credentials email sent to ${email}`);
  } catch (error) {
    console.error('❌ Failed to send organization credentials email:', error.message);
  }
};
