import nodemailer from 'nodemailer';
import { getPasswordResetEmailTemplate, getPasswordResetConfirmationTemplate } from './email-templates';

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};

const EMAIL_FROM = process.env.EMAIL_FROM || '"Admin Panel" <noreply@adminpanel.com>';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    // Validate email configuration
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      throw new Error('Email configuration missing. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.');
    }

    transporter = nodemailer.createTransport(EMAIL_CONFIG);
  }
  return transporter;
}

export interface SendPasswordResetEmailParams {
  email: string;
  resetToken: string;
  userName?: string;
}

export interface SendPasswordResetConfirmationParams {
  email: string;
  userName?: string;
}

/**
 * Send password reset email with reset link
 */
export async function sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<boolean> {
  const { email, resetToken, userName } = params;

  try {
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const { html, text } = getPasswordResetEmailTemplate({
      resetLink,
      userName,
      expirationHours: 10,
    });

    const mailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request - Admin Panel',
      text,
      html,
    };

    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);

    console.log('Password reset email sent:', {
      messageId: info.messageId,
      to: email,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', {
      error,
      email,
      timestamp: new Date().toISOString(),
    });
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send password reset confirmation email
 */
export async function sendPasswordResetConfirmation(params: SendPasswordResetConfirmationParams): Promise<boolean> {
  const { email, userName } = params;

  try {
    const { html, text } = getPasswordResetConfirmationTemplate({
      email,
      userName,
    });

    const mailOptions = {
      from: EMAIL_FROM,
      to: email,
      subject: 'Password Changed Successfully - Admin Panel',
      text,
      html,
    };

    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);

    console.log('Password reset confirmation email sent:', {
      messageId: info.messageId,
      to: email,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Failed to send password reset confirmation email:', {
      error,
      email,
      timestamp: new Date().toISOString(),
    });
    // Don't throw error for confirmation email - it's not critical
    return false;
  }
}

/**
 * Test email configuration
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log('Email server connection verified');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
}

