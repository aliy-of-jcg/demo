import nodemailer from 'nodemailer';
import { getPasswordResetEmailTemplate, getPasswordResetConfirmationTemplate } from './email-templates';

// Helper function to trim quotes from environment variables
function trimQuotes(value: string | undefined): string | undefined {
  if (!value) return value;
  // Remove surrounding quotes (single or double)
  return value.replace(/^["']|["']$/g, '').trim();
}

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: trimQuotes(process.env.EMAIL_HOST) || 'smtp.gmail.com',
  port: parseInt(trimQuotes(process.env.EMAIL_PORT) || '587'),
  secure: trimQuotes(process.env.EMAIL_SECURE) === 'true',
  auth: {
    user: trimQuotes(process.env.EMAIL_USER),
    pass: trimQuotes(process.env.EMAIL_PASSWORD),
  },
};

const EMAIL_FROM = trimQuotes(process.env.EMAIL_FROM) || '"CosMos AI" <noreply@adminpanel.com>';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    // Validate email configuration
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      const missingVars = [];
      if (!EMAIL_CONFIG.auth.user) missingVars.push('EMAIL_USER');
      if (!EMAIL_CONFIG.auth.pass) missingVars.push('EMAIL_PASSWORD');

      throw new Error(
        `Email configuration missing. Please set the following environment variables: ${missingVars.join(', ')}`
      );
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
      subject: 'Password Reset Request - CosMos AI',
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
  } catch (error: any) {
    // Extract detailed error information
    const errorDetails = {
      message: error?.message || 'Unknown error',
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
      stack: error?.stack,
    };

    console.error('Failed to send password reset email:', {
      error: errorDetails,
      email,
      emailConfig: {
        host: EMAIL_CONFIG.host,
        port: EMAIL_CONFIG.port,
        secure: EMAIL_CONFIG.secure,
        hasUser: !!EMAIL_CONFIG.auth.user,
        hasPassword: !!EMAIL_CONFIG.auth.pass,
      },
      timestamp: new Date().toISOString(),
    });

    // Provide more specific error message
    let errorMessage = 'Failed to send password reset email';
    if (error?.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check EMAIL_USER and EMAIL_PASSWORD.';
    } else if (error?.code === 'ECONNECTION' || error?.code === 'ETIMEDOUT') {
      errorMessage = 'Email server connection failed. Please check EMAIL_HOST and network connectivity.';
    } else if (error?.message) {
      errorMessage = `Failed to send email: ${error.message}`;
    }

    throw new Error(errorMessage);
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
      subject: 'Password Changed Successfully - CosMos AI',
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
  } catch (error: any) {
    // Extract detailed error information
    const errorDetails = {
      message: error?.message || 'Unknown error',
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
    };

    console.error('Failed to send password reset confirmation email:', {
      error: errorDetails,
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
    console.log('Email server connection verified', {
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch (error: any) {
    const errorDetails = {
      message: error?.message || 'Unknown error',
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
    };
    console.error('Email server connection failed:', {
      error: errorDetails,
      emailConfig: {
        host: EMAIL_CONFIG.host,
        port: EMAIL_CONFIG.port,
        secure: EMAIL_CONFIG.secure,
        hasUser: !!EMAIL_CONFIG.auth.user,
        hasPassword: !!EMAIL_CONFIG.auth.pass,
      },
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

