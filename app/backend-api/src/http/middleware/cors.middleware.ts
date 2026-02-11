import type { Request, Response, NextFunction } from 'express';

/**
 * CORS middleware to allow requests from admin UI
 * Must be applied before authentication middleware
 */
export const corsMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Allow requests from admin UI (localhost:3000 in dev)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.ADMIN_UI_URL,
    ].filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Request-ID'
      );
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    }

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  };
};
