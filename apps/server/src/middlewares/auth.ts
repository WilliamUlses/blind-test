/**
 * Auth middleware - JWT verification from HTTP-only cookies
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export interface AuthPayload {
  userId: string;
  pseudo: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload | null;
    }
  }
}

/**
 * Optionally attaches user from JWT cookie. Continues even if no token.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.bt_access;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      req.user = payload;
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

/**
 * Requires a valid JWT. Returns 401 if not authenticated.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.bt_access;
  if (!token) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token expiré ou invalide' });
  }
}
