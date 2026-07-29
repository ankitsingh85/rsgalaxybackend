import { Request } from 'express';

// Building upload URLs from req.protocol/req.get('host') bakes in whatever host issued
// THAT particular request — if anyone ever hits the API from localhost (e.g. local dev
// pointed at the shared production database) the stored URL becomes unreachable for every
// other visitor. PUBLIC_BASE_URL pins it to the one true public origin when set (set this
// in Render's env vars to https://rsgalaxybackend.onrender.com); falls back to the
// request's own host only when unset, which is fine for pure local dev.
export const getPublicBaseUrl = (req: Request): string => {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
};
