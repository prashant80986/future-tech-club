import type { Request, Response, NextFunction } from 'express';
import { db, verifyPassword } from './db.ts';

export interface AuthenticatedRequest extends Request {
  adminId?: string;
  csrfToken?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Allow public endpoints
  if (
    req.path === '/api/auth/login' ||
    req.path === '/api/auth/csrf' ||
    req.path.startsWith('/api/verify/') // Certificate verification can be public
  ) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-session-token'] as string);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const session = db.getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please re-authenticate.' });
  }

  // CSRF Protection for state-mutating methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const clientCsrfToken = req.headers['x-csrf-token'] as string;
    if (!clientCsrfToken || clientCsrfToken !== session.csrfToken) {
      return res.status(403).json({ error: 'Security alert: Invalid or missing CSRF token.' });
    }
  }

  req.adminId = session.adminId;
  req.csrfToken = session.csrfToken;
  next();
}

export function handleLogin(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Both email and password are required.' });
  }

  const admin = db.getAdminByEmail(email);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials provided for Mount Learner Academy admin.' });
  }

  const isValid = verifyPassword(password, admin.salt, admin.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials provided.' });
  }

  const session = db.createSession(admin.id);
  return res.json({
    token: session.token,
    csrfToken: session.csrfToken,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  });
}

export function handleLogout(req: AuthenticatedRequest, res: Response) {
  const token = req.headers.authorization?.slice(7) || (req.headers['x-session-token'] as string);
  if (token) {
    db.deleteSession(token);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
}

export function handleGetMe(req: AuthenticatedRequest, res: Response) {
  if (!req.adminId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const admins = db.getAdmins();
  const admin = admins.find((a) => a.id === req.adminId);
  if (!admin) {
    return res.status(404).json({ error: 'Admin account not found' });
  }
  return res.json({
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
    csrfToken: req.csrfToken,
  });
}
