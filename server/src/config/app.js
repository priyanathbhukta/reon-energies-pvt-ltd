import dotenv from 'dotenv';
dotenv.config();

export default {
  jwt: {
    accessSecret: process.env.JWT_SECRET || 'reon-access-secret-dev',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'reon-refresh-secret-dev',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
    mfaExpiresIn: '10m',
  },
  otp: {
    length: 6,
    expiresInMinutes: 5,
    maxAttempts: 3,
    resendCooldownSeconds: 30,
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'msg91', // 'twilio' or 'msg91'
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
    msg91: {
      authKey: process.env.MSG91_AUTH_KEY,
      senderId: process.env.MSG91_SENDER_ID || 'REONIN',
      templateId: process.env.MSG91_TEMPLATE_ID,
    },
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || '"REON Energies" <noreply@reonenergy.in>',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'https://reonenergy.in',
      'https://www.reonenergy.in',
      'https://admin.reonenergy.in',
      'https://pos.reonenergy.in',
    ],
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    otpMax: 5, // OTP requests per window
  },
  server: {
    port: parseInt(process.env.PORT || '5000'),
    env: process.env.NODE_ENV || 'development',
  },
};
