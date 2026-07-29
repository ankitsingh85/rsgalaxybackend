import rateLimit from 'express-rate-limit';

// General API traffic: generous enough for the admin/manager dashboards, which each fire
// 8-10 parallel GETs on every page load — doubled in dev by React StrictMode re-running
// effects, so a long active session can add up fast. Getting this too tight doesn't just
// block requests: /auth/me getting rate-limited used to look like an expired session and
// log people out (fixed in lib/store.ts to only treat a real 401 as "log out"), so keep a
// wide margin here rather than relying solely on that fix.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 6000,                  // requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Auth is more sensitive (brute-force risk), so the public entry points (login, register,
// password reset) get their own tight, dedicated limit independent of general API traffic.
// A real brute-force attempt needs thousands of tries to matter, so this can afford real
// headroom for a dev/test session that legitimately logs in and out repeatedly.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,                   // attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});
