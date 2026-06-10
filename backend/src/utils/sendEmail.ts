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

  // Print email simulation in development for quick developer access
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n========================================`);
    console.log(`[PChatNow Security] Email Simulation (Development Mode)`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.text}`);
    console.log(`========================================\n`);
  }

  if (!host || !port || !user || !pass) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP credentials not fully configured in production env.');
    }
    console.warn('[PChatNow Email Utility] SMTP credentials not fully configured in env. Falling back to console log.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: port === '465', // true for 465, false for other ports (like 587)
      auth: {
        user,
        pass,
      },
      connectionTimeout: 5000, // 5 seconds connection timeout
      greetingTimeout: 5000,   // 5 seconds greeting timeout
      socketTimeout: 5000,     // 5 seconds socket inactivity timeout
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"PChatNow" <${user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[PChatNow Email Utility] Email sent successfully to ${options.to}`);
  } catch (error: any) {
    console.error(`[PChatNow Email Utility] Failed to send email to ${options.to} via SMTP:`, error.message);
    
    // In production, we re-throw the error so background handlers or calling functions know it failed
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};
