import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';

const router = Router();

// Health check endpoint
router.get('/', async (req, res, next) => {
  try {
    // Test database connection
    const result = await prisma.$queryRaw`SELECT NOW() as timestamp`;
    
    res.json({
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        // @ts-ignore - result is an array with timestamp
        dbTime: result[0]?.timestamp,
      },
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    next(error);
  }
});

// Readiness check (more comprehensive)
router.get('/ready', async (req, res, next) => {
  try {
    // Test database with a simple query
    await prisma.user.findFirst();
    
    res.json({
      data: {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'healthy',
          prisma: 'connected',
        },
      },
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      error: {
        type: 'SERVICE_UNAVAILABLE',
        message: 'Service not ready',
      },
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  }
});

export { router as healthRoutes }; 