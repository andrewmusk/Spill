import { Router } from 'express';
import { requireAuthentication } from '../../http/middleware/auth.middleware.js';
import { userService } from '../../services/user.service.js';
import { prisma } from '../../lib/prisma.js';

const router = Router();

// All auth routes require authentication
router.use(requireAuthentication());

// Get current user profile
router.get('/me', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          type: 'UNAUTHORIZED',
          message: 'User not found',
        },
        meta: {
          traceId: req.headers['x-request-id'],
        },
      });
    }

    res.json({
      data: {
        user: {
          id: req.user.id,
          handle: req.user.handle,
          displayName: req.user.displayName,
          isPrivate: req.user.isPrivate,
          createdAt: req.user.createdAt,
        },
      },
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    console.error('Failed to get current user:', error);
    next(error);
  }
});

// Update user profile
router.patch('/me', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          type: 'UNAUTHORIZED',
          message: 'User not found',
        },
        meta: {
          traceId: req.headers['x-request-id'],
        },
      });
    }

    // For now, only allow updating displayName and privacy
    const { displayName, isPrivate } = req.body;
    
    // TODO: Add Zod validation here
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(isPrivate !== undefined && { isPrivate }),
        updatedAt: new Date(),
      },
    });

    res.json({
      data: {
        user: {
          id: updatedUser.id,
          handle: updatedUser.handle,
          displayName: updatedUser.displayName,
          isPrivate: updatedUser.isPrivate,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    console.error('Failed to update user profile:', error);
    next(error);
  }
});

// Sync user data from Clerk (refresh profile)
router.post('/sync', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          type: 'UNAUTHORIZED',
          message: 'User not found',
        },
        meta: {
          traceId: req.headers['x-request-id'],
        },
      });
    }

    const updatedUser = await userService.updateUserFromClerk(req.user.clerkId);

    res.json({
      data: {
        user: {
          id: updatedUser.id,
          handle: updatedUser.handle,
          displayName: updatedUser.displayName,
          isPrivate: updatedUser.isPrivate,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
        message: 'Profile synced from Clerk',
      },
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    console.error('Failed to sync user profile:', error);
    next(error);
  }
});

export { router as authRoutes }; 