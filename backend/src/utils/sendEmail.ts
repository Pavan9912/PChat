import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !port || !user || !pass) {
    console.warn('[PChat Email Utility] SMTP credentials not fully configured in env. Fallback to console log.');
    console.log(`\n========================================`);
    console.log(`[PChat Security] Email Simulation`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.text}`);
    console.log(`========================================\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: port === '465', // true for 465, false for other ports (like 587)
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"PChat" <${user}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};
