const sendMail = async (to, subject, html) => {
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) {
    console.log(`[mail] To: ${to} | ${subject}\n${html.replace(/<[^>]+>/g, ' ')}`);
    return;
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: { name: 'AcadTrack', email: process.env.MAIL_FROM }, to: [{ email: to }], subject, htmlContent: html })
  });

  if (!res.ok) throw new Error(`Email failed: ${res.status} ${await res.text()}`);
};

module.exports = { sendMail };
