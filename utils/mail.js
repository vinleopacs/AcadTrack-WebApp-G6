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

const resetEmail = (name, link, base) => `
<div style="background:#f4f2f8;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;color:#1c1b22">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:36px 32px">
    <div style="margin-bottom:28px">
      <img src="${base}/logo.png" width="40" height="40" alt="" style="vertical-align:middle">
      <span style="font-size:20px;font-weight:bold;vertical-align:middle;margin-left:8px">AcadTrack</span>
    </div>
    <h1 style="font-size:24px;margin:0 0 12px">Reset your password</h1>
    <p style="font-size:15px;line-height:1.6;color:#55536a;margin:0 0 28px">Hi ${name}, we got a request to reset your AcadTrack password. Click the button below to set a new one.</p>
    <a href="${link}" style="display:block;background:#5b4785;color:#fff;text-decoration:none;text-align:center;font-size:16px;font-weight:bold;padding:14px;border-radius:12px">Set a new password</a>
    <p style="font-size:13px;line-height:1.6;color:#8a889c;margin:28px 0 0">This link expires in 30 minutes. If you didn't ask for this, you can ignore this email and your password stays the same.</p>
  </div>
  <p style="text-align:center;font-size:12px;color:#8a889c;margin:20px 0 0">AcadTrack · University of San Carlos</p>
</div>`;

module.exports = { sendMail, resetEmail };
