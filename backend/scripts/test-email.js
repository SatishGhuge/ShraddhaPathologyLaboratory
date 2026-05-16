import dotenv from 'dotenv';
import { testEmailConnection, sendPasswordResetEmail } from '../utils/email.js';

// Load environment variables
dotenv.config();

async function testEmail() {
  console.log('📧 Testing Email Configuration\n');
  console.log('Environment Variables:');
  console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('  EMAIL_USER:', process.env.EMAIL_USER);
  console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : 'NOT SET');
  console.log('');

  // Test connection
  console.log('🔍 Testing SMTP connection...');
  const connectionOk = await testEmailConnection();
  
  if (!connectionOk) {
    console.log('\n❌ Email connection failed!');
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Check if EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS are set in .env');
    console.log('   2. For Gmail, make sure you are using an App Password, not your regular password');
    console.log('   3. Enable "Less secure app access" or use App Passwords in Gmail settings');
    console.log('   4. Check if your firewall is blocking port 587');
    process.exit(1);
  }

  console.log('\n✅ Email connection successful!');
  
  // Optionally send a test email
  const testEmailAddress = process.env.EMAIL_USER; // Send to self
  console.log(`\n📤 Sending test email to ${testEmailAddress}...`);
  
  try {
    await sendPasswordResetEmail(testEmailAddress, '123456');
    console.log('✅ Test email sent successfully!');
    console.log('\n📬 Check your inbox for the test email.');
  } catch (error) {
    console.log('❌ Failed to send test email:', error.message);
  }
}

testEmail();
