const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 30, // 30 requests per 15 min for auth in prod/dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }
});

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Booking request rate limit reached. Please wait a few minutes before trying again.'
  }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 50000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  }
});

module.exports = {
  authLimiter,
  bookingLimiter,
  generalLimiter
};
