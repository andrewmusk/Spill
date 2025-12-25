import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';

// Create logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
});

/**
 * Structured request logging middleware
 * Logs request details including requestId, path, method, status, latency, and user info
 */
export const requestLogging = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';

    // Log request start
    logger.info({
      requestId,
      path: req.path,
      method: req.method,
      viewerUserId: req.user?.id,
      adminUserId: req.path.startsWith('/admin') ? req.user?.id : undefined,
    }, 'Request started');

    // Capture response finish
    res.on('finish', () => {
      const latency = Date.now() - startTime;
      const logData: Record<string, any> = {
        requestId,
        path: req.path,
        method: req.method,
        status: res.statusCode,
        latency: `${latency}ms`,
      };

      if (req.user?.id) {
        logData.viewerUserId = req.user.id;
      }

      if (req.path.startsWith('/admin') && req.user?.id) {
        logData.adminUserId = req.user.id;
      }

      // Log at appropriate level based on status code
      if (res.statusCode >= 500) {
        logger.error(logData, 'Request failed');
      } else if (res.statusCode >= 400) {
        logger.warn(logData, 'Request error');
      } else {
        logger.info(logData, 'Request completed');
      }
    });

    next();
  };
};

export { logger };
