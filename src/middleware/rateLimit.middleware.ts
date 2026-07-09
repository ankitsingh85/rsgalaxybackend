import rateLimit from 'express-rate-limit';

// General API traffic: generous enough for the admin/manager dashboards, which each fire
// 8-10 parallel GETs on every page load.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 2000,                  // requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Auth is more sensitive (brute-force risk), so the public entry points (login, register,
// password reset) get their own tight, dedicated limit independent of general API traffic.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 30,                    // attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});
