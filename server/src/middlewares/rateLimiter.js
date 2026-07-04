import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes',
  },
  keyGenerator: (req) => req.ip,
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/api/health';
  },
});

/**
 * Stricter rate limiter for OTP endpoints
 * 5 requests per 15 minutes per IP
 */
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many OTP requests. Please wait before trying again.',
    retryAfter: '15 minutes',
  },
  keyGenerator: (req) => req.ip,
});

/**
 * Auth endpoint rate limiter
 * 10 login attempts per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please try again later.',
    retryAfter: '15 minutes',
  },
  keyGenerator: (req) => req.ip,
});
