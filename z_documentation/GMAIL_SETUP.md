# Gmail App Password Setup Guide

## Quick Setup (5 minutes)

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" in the left sidebar
3. Under "Signing in to Google", click "2-Step Verification"
4. Follow the prompts to enable 2FA (if not already enabled)

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
   - Or navigate: Google Account → Security → 2-Step Verification → App passwords
2. Click "Select app" → Choose "Mail"
3. Click "Select device" → Choose "Other (Custom name)"
4. Type: "Admin Panel Password Reset"
5. Click "Generate"
6. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

### Step 3: Add to .env.local

Create or edit `.env.local` in your project root:

```env
# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM="Admin Panel <noreply@adminpanel.com>"
```

**Important:** 
- Remove spaces from the app password (Gmail shows it as "abcd efgh ijkl mnop" but use "abcdefghijklmnop")
- Do NOT put quotes around EMAIL_PASSWORD value (e.g., use `EMAIL_PASSWORD=abcdefghijklmnop` not `EMAIL_PASSWORD="abcdefghijklmnop"`)
- Replace `your.email@gmail.com` with your actual Gmail address
- The app password is NOT your regular Gmail password

### Step 4: Restart Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 5: Test

1. Go to http://localhost:3000/auth
2. Click "Forgot password?"
3. Enter your email
4. Check your inbox for reset email

---

## Troubleshooting

### "Invalid login credentials" Error

**Solution:**
- Make sure you've enabled 2-Factor Authentication
- Regenerate the app password
- Remove all spaces from the password in .env.local
- Restart the dev server

### "App passwords not available" Error

**Cause:** 2FA not enabled

**Solution:**
1. Enable 2-Step Verification first
2. Wait 5-10 minutes
3. Try accessing app passwords again

### Not Receiving Emails

**Check:**
1. Email address is correct
2. Check Spam/Junk folder
3. Gmail account is active
4. Server logs for errors: check terminal output

### Server Deployment Issues (Works Locally, Fails on Server)

**Common Causes:**

1. **Missing Environment Variables on Server**
   - Verify all `EMAIL_*` variables are set in your production environment
   - Check Docker environment variables if using containers
   - Ensure `.env` files are properly loaded on server

2. **Gmail Blocking Server IP**
   - Gmail may block connections from new/unfamiliar IP addresses
   - Solution: Use a service like SendGrid, AWS SES, or Mailgun for production
   - Or: Whitelist your server IP in Gmail (if using Google Workspace)

3. **Network/Firewall Restrictions**
   - Server firewall may block outbound SMTP port 587
   - Check if port 587 is open: `telnet smtp.gmail.com 587`
   - Some cloud providers block SMTP by default

4. **Docker/Container Networking**
   - If using Docker, ensure network allows outbound SMTP connections
   - Check `docker-compose.yml` network configuration
   - Verify environment variables are passed to container

**Debugging Steps:**

1. **Check Server Logs** - The improved error handling will now show:
   - Specific error codes (EAUTH, ECONNECTION, ETIMEDOUT)
   - Email configuration status
   - Detailed error messages

2. **Verify Environment Variables:**
   ```bash
   # On your server, check if variables are set
   echo $EMAIL_USER
   echo $EMAIL_PASSWORD
   echo $EMAIL_HOST
   ```

3. **Test SMTP Connection from Server:**
   ```bash
   # SSH into your server and test
   telnet smtp.gmail.com 587
   # Or use the testEmailConnection function
   ```

4. **Check Error Details:**
   - Look for error codes in server logs:
     - `EAUTH`: Authentication failed (wrong credentials)
     - `ECONNECTION`: Cannot connect to SMTP server
     - `ETIMEDOUT`: Connection timeout

**Recommended Solution for Production:**

For production servers, consider using a dedicated email service:

- **SendGrid** (Free tier: 100 emails/day)
- **AWS SES** (Very affordable, reliable)
- **Mailgun** (Developer-friendly)
- **Resend** (Modern API, great DX)

These services are more reliable than Gmail SMTP for production use.

---

## Alternative: Using a Different Email Provider

### Outlook/Hotmail

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your.email@outlook.com
EMAIL_PASSWORD=your-outlook-password
EMAIL_FROM="Admin Panel <noreply@adminpanel.com>"
```

### Custom SMTP Server

```env
EMAIL_HOST=mail.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM="Admin Panel <noreply@yourdomain.com>"
```

---

## Testing Email Configuration

Run this test script:

```bash
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your.email@gmail.com',
    pass: 'your-app-password'
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Connection failed:', error.message);
  } else {
    console.log('✅ Email server is ready to send messages!');
  }
});
"
```

Replace `your.email@gmail.com` and `your-app-password` with your credentials.

---

## Security Notes

✅ **Safe:**
- App passwords are designed for this purpose
- They only work with the specific app
- Can be revoked anytime

❌ **Don't:**
- Share your app password
- Commit .env.local to Git (.gitignore includes it)
- Use your regular Gmail password

---

## Quick Links

- Google Account Security: https://myaccount.google.com/security
- App Passwords: https://myaccount.google.com/apppasswords
- 2-Step Verification: https://myaccount.google.com/signinoptions/two-step-verification

---

**Setup complete! Your password reset emails will now be delivered via Gmail.** 📧

