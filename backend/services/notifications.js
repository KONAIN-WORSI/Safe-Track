const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmailAlert(to, childName, location, isSos = false) {
  if (!process.env.EMAIL_USER) {
    console.log(`[EMAIL MOCK] Alert for ${childName} at ${location.lat},${location.lng}`);
    return;
  }
  const subject = isSos
    ? `🆘 SOS ALERT: ${childName} needs help!`
    : `⚠️ SafeTrack: ${childName} left the safe zone`;

  const mapsLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px;">
      <h2 style="color:${isSos ? '#A32D2D' : '#854F0B'};">${isSos ? '🆘 SOS Alert' : '⚠️ Zone Alert'}</h2>
      <p><strong>${childName}</strong> ${isSos ? 'has triggered SOS!' : 'has left the designated safe zone.'}</p>
      <p><strong>Last known location:</strong><br/>
         Lat: ${location.lat.toFixed(6)}<br/>
         Lng: ${location.lng.toFixed(6)}
      </p>
      <a href="${mapsLink}" style="display:inline-block;padding:10px 20px;background:#185FA5;color:white;text-decoration:none;border-radius:6px;margin-top:12px;">
        View on Google Maps
      </a>
      <p style="margin-top:20px;font-size:12px;color:#888;">SafeTrack Child Safety System · ${new Date().toLocaleString()}</p>
    </div>
  `;

  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

async function sendSmsAlert(to, childName, location, isSos = false) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log(`[SMS MOCK] Alert for ${childName} at ${location.lat},${location.lng} to ${to}`);
    return;
  }
  const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const mapsLink = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  const body = isSos
    ? `🆘 SOS! ${childName} needs help! Location: ${mapsLink}`
    : `⚠️ SafeTrack: ${childName} left the safe zone. Location: ${mapsLink}`;

  try {
    await twilio.messages.create({ from: process.env.TWILIO_PHONE, to, body });
    console.log(`SMS sent to ${to}`);
  } catch (err) {
    console.error('SMS send failed:', err.message);
  }
}

module.exports = { sendEmailAlert, sendSmsAlert };
