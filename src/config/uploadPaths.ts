import path from 'path';

// Configurable via UPLOAD_ROOT so a Render Persistent Disk (mounted at whatever
// path the dashboard is given) can be pointed at without touching code — falls
// back to <project-root>/uploads for local dev where no disk is mounted.
export const UPLOADS_ROOT = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : path.join(__dirname, '../../uploads');

export const uploadSubdir = (name: string) => path.join(UPLOADS_ROOT, name);
