import { Router } from 'express';
import { requireAuthentication, optionalAuthentication } from '../../http/middleware/auth.middleware.js';
import { prisma } from '../../lib/prisma.js';

const router = Router();

// Get user by handle (public endpoint with optional auth for privacy checks)
router.get('/:handle', optionalAuthentication(), async (req, res, next) => {
  try {
    const { handle } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { handle },
      select: {
        id: true,
        handle: true,
        displayName: true,
        isPrivate: true,
        createdAt: true,
        // Include follow counts and relationship status if authenticated
        _count: {
          select: {
            followers: true,
            following: true,
            polls: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: {
          type: 'NOT_FOUND',
          message: 'User not found',
        },
        meta: {
          traceId: req.headers['x-request-id'],
        },
      });
    }

    // Check if profile should be visible based on privacy settings
    let canViewProfile = true;
    if (user.isPrivate && req.user?.id !== user.id) {
      // TODO: Check if current user follows this private user
      // For now, just block access to private profiles
      canViewProfile = false;
    }

    if (!canViewProfile) {
      return res.status(403).json({
        error: {
          type: 'FORBIDDEN',
          message: 'This profile is private',
        },
        meta: {
          traceId: req.headers['x-request-id'],
        },
      });
    }

    res.json({
      data: {
        user: {
          id: user.id,
          handle: user.handle,
          displayName: user.displayName,
          isPrivate: user.isPrivate,
          createdAt: user.createdAt,
          stats: {
            followers: user._count.followers,
            following: user._count.following,
            polls: user._count.polls,
          },
        },
      },
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    console.error('Failed to get user profile:', error);
    next(error);
  }
});

// Search users (requires authentication)
router.get('/', requireAuthentication(), async (req, res, next) => {
  try {
    const { q, limit = '20', cursor } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Search query is required',
        },
        meta: {
          traceId: req.headers['x-request-id'],
        },
      });
    }

    const searchLimit = Math.min(parseInt(limit as string, 10) || 20, 50);
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { handle: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
        // Only show public profiles in search for now
        isPrivate: false,
      },
      select: {
        id: true,
        handle: true,
        displayName: true,
        isPrivate: true,
        createdAt: true,
      },
      take: searchLimit + 1, // Get one extra to check if there are more results
      ...(cursor && {
        cursor: { id: cursor as string },
        skip: 1, // Skip the cursor item
      }),
      orderBy: { handle: 'asc' },
    });

    const hasMore = users.length > searchLimit;
    const resultUsers = hasMore ? users.slice(0, searchLimit) : users;
    const nextCursor = hasMore ? users[searchLimit].id : null;

    res.json({
      data: {
        users: resultUsers,
      },
      meta: {
        nextCursor,
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    console.error('Failed to search users:', error);
    next(error);
  }
});

export { router as userRoutes }; 