// Email templates for password reset
export interface EmailTemplateData {
  resetLink?: string;
  userName?: string;
  email?: string;
  expirationHours?: number;
}

export function getPasswordResetEmailTemplate(data: EmailTemplateData): { html: string; text: string } {
  const { resetLink, userName, expirationHours = 10 } = data;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f7;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">CosMos AI</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Password Reset Request</h2>
                            
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                ${userName ? `Hi ${userName},` : 'Hello,'}
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                We received a request to reset your password for your CosmosAI account. Click the button below to create a new password:
                            </p>
                            
                            <!-- Button -->
                            <table role="presentation" style="margin: 30px 0; width: 100%;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Reset Password</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                Or copy and paste this link into your browser:
                            </p>
                            
                            <p style="margin: 0 0 20px 0; padding: 12px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all; font-size: 13px; color: #667eea;">
                                ${resetLink}
                            </p>
                            
                            <div style="margin: 30px 0; padding: 16px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                                    <strong>⚠️ Important:</strong> This link will expire in ${expirationHours} hours.
                                </p>
                            </div>
                            
                            <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                If you didn't request a password reset, please ignore this email or contact support if you have concerns. Your password won't change unless you click the link above and create a new password.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6; text-align: center;">
                                This is an automated message from CosmosAI. Please do not reply to this email.
                            </p>
                            <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px; text-align: center;">
                                © ${new Date().getFullYear()} CosmosAI. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();

  const text = `
Password Reset Request

${userName ? `Hi ${userName},` : 'Hello,'}

We received a request to reset your password for your CosmosAI account.

To reset your password, click the link below or copy and paste it into your browser:

${resetLink}

⚠️ Important: This link will expire in ${expirationHours} hours.

If you didn't request a password reset, please ignore this email. Your password won't change unless you click the link above and create a new password.

---
This is an automated message from CosMosAI. Please do not reply to this email.
© ${new Date().getFullYear()} CosMosAI. All rights reserved.
  `.trim();

  return { html, text };
}

export function getPasswordResetConfirmationTemplate(data: EmailTemplateData): { html: string; text: string } {
  const { userName, email } = data;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed Successfully</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f7;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">CosMos AI</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <div style="display: inline-block; width: 60px; height: 60px; background-color: #28a745; border-radius: 50%; line-height: 60px; font-size: 30px;">
                                    ✓
                                </div>
                            </div>
                            
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; text-align: center;">Password Changed Successfully</h2>
                            
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                ${userName ? `Hi ${userName},` : 'Hello,'}
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                Your password has been successfully changed for your CosMos AI account: <strong>${email}</strong>
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                                You can now use your new password to sign in to your account.
                            </p>
                            
                            <div style="margin: 30px 0; padding: 16px; background-color: #e7f3ff; border-left: 4px solid #2196F3; border-radius: 4px;">
                                <p style="margin: 0; color: #0d47a1; font-size: 14px; line-height: 1.6;">
                                    <strong>🔒 Security Tip:</strong> If you did not make this change, please contact our support team immediately.
                                </p>
                            </div>
                            
                            <table role="presentation" style="margin: 30px 0; width: 100%;">
                                <tr>
                                    <td align="center">
                                        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Go to Login</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.6; text-align: center;">
                                This is an automated message from CosMos AI. Please do not reply to this email.
                            </p>
                            <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px; text-align: center;">
                                © ${new Date().getFullYear()} CosMos AI. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();

  const text = `
Password Changed Successfully

${userName ? `Hi ${userName},` : 'Hello,'}

Your password has been successfully changed for your CosMos AI account: ${email}

You can now use your new password to sign in to your account.

🔒 Security Tip: If you did not make this change, please contact our support team immediately.

Go to login: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth

---
This is an automated message from CosMos AI. Please do not reply to this email.
© ${new Date().getFullYear()} CosMos AI. All rights reserved.
  `.trim();

  return { html, text };
}

