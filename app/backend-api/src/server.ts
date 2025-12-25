import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { clerkAuth } from './http/middleware/auth.middleware.js';
import { requestLogging } from './http/middleware/logging.middleware.js';
import { corsMiddleware } from './http/middleware/cors.middleware.js';
import { requireAdmin } from './http/middleware/admin.middleware.js';
import { healthRoutes } from './features/health/health.routes.js';
import { monitoringRoutes } from './features/health/monitoring.routes.js';
import { authRoutes } from './features/auth/auth.routes.js';
import { userRoutes } from './features/users/users.routes.js';
import { adminRoutes } from './features/admin/admin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Early middleware - request ID, security headers
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

// CORS middleware (must be before auth to handle OPTIONS preflight)
app.use(corsMiddleware());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (before auth to log all requests)
app.use(requestLogging());

// Clerk authentication middleware (must be early in the chain)
app.use(clerkAuth);

// Auth UI route (serves HTML with Clerk publishable key injected)
app.get('/auth', (req, res) => {
  try {
    // Try multiple possible paths to find the auth.html file
    const possiblePaths = [
      path.join(__dirname, '..', 'public', 'auth.html'), // From src/ -> backend-api/public/
      path.join(process.cwd(), 'public', 'auth.html'),   // From current working directory
      path.resolve('public', 'auth.html'),                // Relative to cwd
    ];
    
    let filePath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        break;
      }
    }
    
    if (!filePath) {
      console.error('Auth HTML not found. Tried paths:', possiblePaths);
      console.error(`__dirname: ${__dirname}`);
      console.error(`process.cwd(): ${process.cwd()}`);
      return res.status(500).json({
        error: {
          type: 'INTERNAL_ERROR',
          message: `Auth HTML file not found. Tried: ${possiblePaths.join(', ')}`,
        },
        meta: {
          traceId: req.headers['x-request-id'],
        },
      });
    }
    
    let html = fs.readFileSync(filePath, 'utf8');
    html = html.replace('__CLERK_PUBLISHABLE_KEY__', env.CLERK_PUBLISHABLE_KEY);
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (error: any) {
    console.error('Error serving auth HTML:', error);
    return res.status(500).json({
      error: {
        type: 'INTERNAL_ERROR',
        message: error.message || 'Failed to serve auth page',
      },
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  }
});

// Public routes (no authentication required)
app.use('/health', healthRoutes);
app.use('/monitoring', monitoringRoutes);

// Protected routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Admin routes (require admin access)
app.use('/admin', requireAdmin(), adminRoutes);

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