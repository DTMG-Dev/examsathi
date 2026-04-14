/**
 * Centralised configuration object — reads from environment variables.
 * All secrets must be set in .env (never hardcoded).
 */
export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '14d',
  },

  mongodb: {
    uri: process.env.MONGODB_URI,
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    maxTokensQuestion: 20000,
    maxTokensHint: 500,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.FROM_EMAIL || 'noreply@examsathi.com',
    fromName: process.env.FROM_NAME || 'ExamSathi',
  },

  client: {
    url: process.env.CLIENT_URL || 'http://localhost:4200',
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    allowedTypes: (
      process.env.ALLOWED_FILE_TYPES ||
      'image/jpeg,image/png,image/webp,application/pdf'
    ).split(','),
  },

  rateLimit: {
    global: { windowMs: 15 * 60 * 1000, max: 100 },
    auth: { windowMs: 15 * 60 * 1000, max: 5 },
    financial: { windowMs: 15 * 60 * 1000, max: 10 },
  },

  bcrypt: {
    saltRounds: 12,
  },
};
