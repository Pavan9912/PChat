import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  // 1. If RESEND_API_KEY is configured, use Resend API (bypasses direct SMTP ports, works on Render)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      let fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

      // Resend does not allow sending from public email domains (gmail, yahoo, etc.).
      // We extract the email address and check its domain to automatically fallback to onboarding@resend.dev if needed.
      const emailMatch = fromEmail.match(/<([^>]+)>/) || [null, fromEmail];
      const actualFromAddress = emailMatch[1] ? emailMatch[1].trim() : fromEmail.trim();
      const domain = actualFromAddress.split('@')[1];
      const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com'];
      
      if (domain && publicDomains.includes(domain.toLowerCase())) {
        console.warn(`[PChatNow Email Utility] Resend does not support sending from public domain (${domain}). Overriding sender to onboarding@resend.dev.`);
        fromEmail = 'onboarding@resend.dev';
      }

      // Print email simulation in development for quick developer access
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n========================================`);
        console.log(`[PChatNow Security] Resend Email Simulation (Development Mode)`);
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Body: ${options.text}`);
        console.log(`========================================\n`);
      }

      const response = await resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html || `<p>${options.text}</p>`,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      console.log(`[PChatNow Email Utility] Email sent successfully via Resend API to ${options.to}`);
      return;
    } catch (error: any) {
      console.error(`[PChatNow Email Utility] Failed to send email via Resend API:`, error.message);
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  // 2. Otherwise, fallback to SMTP nodemailer
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
    console.log(`[PChatNow Email Utility] Email sent successfully via SMTP to ${options.to}`);
  } catch (error: any) {
    console.error(`[PChatNow Email Utility] Failed to send email to ${options.to} via SMTP:`, error.message);
    
    // In production, we re-throw the error so background handlers or calling functions know it failed
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};
