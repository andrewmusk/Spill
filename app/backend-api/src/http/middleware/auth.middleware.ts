import type { Request, Response, NextFunction } from 'express';
import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express';
import { authAdapter } from '../../lib/auth/index.js';
import { userService } from '../../services/user.service.js';
import { AuthenticationError } from '../../lib/auth/index.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        clerkId: string;
        handle: string;
        displayName?: string;
        isPrivate: boolean;
        createdAt: Date;
        updatedAt: Date;
      };
    }
  }
}

/**
 * Clerk base middleware - must be applied to all routes
 */
export const clerkAuth = clerkMiddleware();

/**
 * Middleware to require authentication and provision users
 */
export const requireAuthentication = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuth(req);
      
      if (!auth?.userId) {
        return res.status(401).json({
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          meta: {
            traceId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }

      // Get or create user in our database
      const user = await userService.getOrCreateUser(auth.userId);
      
      // Attach user to request
      req.user = user;
      
      next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      
      if (error instanceof AuthenticationError) {
        return res.status(error.statusCode).json({
          error: {
            type: error.type,
            message: error.message,
          },
          meta: {
            traceId: req.headers['x-request-id'] || 'unknown',
          },
        });
      }
      
      return res.status(500).json({
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Authentication failed',
        },
        meta: {
          traceId: req.headers['x-request-id'] || 'unknown',
        },
      });
    }
  };
};

/**
 * Optional authentication middleware - doesn't require auth but provisions user if present
 */
export const optionalAuthentication = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = getAuth(req);
      
      if (auth?.userId) {
        // Get or create user in our database
        const user = await userService.getOrCreateUser(auth.userId);
        req.user = user;
      }
      
      next();
    } catch (error) {
      console.error('Optional authentication middleware error:', error);
      // Don't fail the request for optional auth, just log and continue
      next();
    }
  };
}; 