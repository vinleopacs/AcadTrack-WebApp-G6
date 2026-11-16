const send = async (to, subject, text) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`Email to ${to}: ${subject}\n${text}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'AcadTrack <onboarding@resend.dev>', to, subject, text })
  });

  if (!res.ok) throw new Error(`Email failed: ${res.status} ${await res.text()}`);
};

module.exports = { send };
