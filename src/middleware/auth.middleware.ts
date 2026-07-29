import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import User, { IManagerPermissions } from '../models/User.model';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Like authenticate, but never rejects — sets req.user if a valid token is present,
// otherwise leaves it undefined and continues. For public endpoints that personalize
// their response for a logged-in caller without requiring login (e.g. public coupons).
export const optionalAuthenticate = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(authHeader.split(' ')[1]);
    } catch {
      // invalid/expired token on a public route — just treat as anonymous
    }
  }
  next();
};

export const authorize = (...roles: Array<'admin' | 'manager' | 'user'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
};

// Gates a manager's access to a specific module/action per their stored `permissions`.
// Admins and guests always pass through untouched — this only ever restricts managers,
// so it's safe to add to routes shared with other roles.
export const requirePermission = (module: keyof IManagerPermissions, action: 'view' | 'edit' | 'delete') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || req.user.role !== 'manager') { next(); return; }
    try {
      const manager = await User.findById(req.user.id).select('permissions');
      if (!manager?.permissions?.[module]?.[action]) {
        res.status(403).json({ success: false, message: `You don't have ${action} access to ${module}` });
        return;
      }
      next();
    } catch (err) { next(err); }
  };
};
