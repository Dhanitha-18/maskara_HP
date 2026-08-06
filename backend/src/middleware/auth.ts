import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'maskara_jwt_secret_key_2026_super_secure';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export function generateToken(payload: object, expiresIn = '7d'): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.', expired: true });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'CHIEF' && req.user.role !== 'SUB_ADMIN' && req.user.userType !== 'ADMIN')) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

export function requireStudent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.userType !== 'STUDENT' && !req.user.usn)) {
    return res.status(403).json({ error: 'Student access required.' });
  }
  next();
}
