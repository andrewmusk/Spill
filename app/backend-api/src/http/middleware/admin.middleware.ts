import type { Request, Response, NextFunction } from 'express';
import { requireAuthentication } from './auth.middleware.js';
import { env } from '../../config/env.js';

/**
 * Middleware to require admin access
 * Combines authentication and admin check
 */
export const requireAdmin = () => {
  // First apply authentication
  const authMiddleware = requireAuthentication();

  return async (req: Request, res: Response, next: NextFunction) => {
    // Run authentication middleware first
    let authPassed = false;
    await new Promise<void>((resolve) => {
      authMiddleware(req, res, () => {
        authPassed = true;
        resolve();
      });
    });

    // Check if user is authenticated (auth middleware sets req.user or sends error)
    if (!req.user || !authPassed) {
      // Error already sent by auth middleware if not authenticated
      return;
    }

    // Check if user is admin
    const adminUserIds = env.CLERK_ADMIN_USER_IDS?.split(',').map(id => id.trim()).filter(Boolean) || [];

    if (adminUserIds.length === 0) {
      console.warn('CLERK_ADMIN_USER_IDS not configured - admin access disabled');
      res.status(403).json({
        error: {
          type: 'FORBIDDEN',
          message: 'Admin access not configured',
        },
        meta: {
          traceId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    if (!adminUserIds.includes(req.user.clerkId)) {
      res.status(403).json({
        error: {
          type: 'FORBIDDEN',
          message: 'Admin access required',
        },
        meta: {
          traceId: req.headers['x-request-id'] || 'unknown',
        },
      });
      return;
    }

    // User is admin, proceed
    next();
  };
};
