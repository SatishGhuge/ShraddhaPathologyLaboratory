/**
 * Send WhatsApp message via CallMeBot API
 * Patient must activate once: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 * Or use WHATSAPP_PROVIDER=twilio with Twilio credentials in .env
 */
export const sendWhatsAppMessage = async (mobile, message) => {
  if (!mobile) return;

  // Normalize mobile — ensure it has country code
  const phone = mobile.startsWith('+') ? mobile : `+91${mobile.replace(/\D/g, '')}`;

  const provider = process.env.WHATSAPP_PROVIDER || 'callmebot';

  try {
    if (provider === 'twilio') {
      // Twilio WhatsApp
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken  = process.env.TWILIO_AUTH_TOKEN;
      const from       = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886

      if (!accountSid || !authToken || !from) {
        console.warn('⚠️  Twilio credentials not configured, skipping WhatsApp');
        return;
      }

      const body = new URLSearchParams({
        From: from,
        To: `whatsapp:${phone}`,
        Body: message
      });

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body
        }
      );
      const data = await res.json();
      if (data.sid) {
        console.log(`✅ WhatsApp sent via Twilio to ${phone}`);
      } else {
        console.error('❌ Twilio WhatsApp error:', data);
      }

    } else {
      // CallMeBot (default)
      const apiKey = process.env.CALLMEBOT_API_KEY;
      if (!apiKey) {
        console.warn('⚠️  CALLMEBOT_API_KEY not set, skipping WhatsApp');
        return;
      }

      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;
      const res = await fetch(url);
      const text = await res.text();
      console.log(`✅ WhatsApp sent via CallMeBot to ${phone}:`, text.slice(0, 80));
    }
  } catch (err) {
    console.error('❌ WhatsApp send failed:', err.message);
  }
};

// Build the WhatsApp message text for a result notification
export const buildResultMessage = (patient, testName, visitId, results) => {
  const name = `${patient.title || ''} ${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  const abnormal = results.filter(r => r.isAbnormal).map(r => r.parameterName).join(', ');

  let msg = `*SilverLeaf Diagnostics*\n`;
  msg += `Dear ${name},\n\n`;
  msg += `Your *${testName}* report (Lab No: ${visitId}) is ready.\n`;
  msg += `Date: ${new Date().toLocaleDateString('en-GB')}\n\n`;

  results.forEach(r => {
    msg += `• ${r.parameterName}: *${r.value ?? '-'}* ${r.units || ''}`;
    if (r.isAbnormal) msg += ` ⚠️`;
    msg += `\n`;
  });

  if (abnormal) {
    msg += `\n⚠️ Abnormal values: ${abnormal}\nPlease consult your doctor.\n`;
  }

  msg += `\nFor queries: 📞 8779295302\nPlot No-38, Sector-1, New Panvel`;
  return msg;
};
