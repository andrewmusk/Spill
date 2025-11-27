import express from 'express';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { clerkAuth } from './http/middleware/auth.middleware.js';
import { healthRoutes } from './features/health/health.routes.js';
import { monitoringRoutes } from './features/health/monitoring.routes.js';
import { authRoutes } from './features/auth/auth.routes.js';
import { userRoutes } from './features/users/users.routes.js';

const app = express();

// Early middleware - request ID, security headers, CORS
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Clerk authentication middleware (must be early in the chain)
app.use(clerkAuth);

// Public routes (no authentication required)
app.use('/health', healthRoutes);
app.use('/monitoring', monitoringRoutes);

// Protected routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      type: 'NOT_FOUND',
      message: 'Route not found',
    },
    meta: {
      traceId: req.headers['x-request-id'],
    },
  });
});

// Centralized error handler (must be last)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  const statusCode = err.statusCode || 500;
  const errorType = err.type || 'INTERNAL_ERROR';
  
  res.status(statusCode).json({
    error: {
      type: errorType,
      message: err.message || 'Internal server error',
    },
    meta: {
      traceId: req.headers['x-request-id'],
    },
  });
});

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Shutting down server...');
  
  // Stop accepting new requests
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  // Disconnect from database
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
  
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const server = app.listen(env.PORT, () => {
  console.log(`🚀 Spill backend API listening on port ${env.PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
});

export { app }; 