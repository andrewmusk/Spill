import type { Request } from 'express';

export interface AuthUser {
  id: string;
  userId: string; // Clerk user ID
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthAdapter {
  /**
   * Verify authentication token and return user information
   */
  verifyToken(token: string): Promise<AuthUser | null>;
  
  /**
   * Extract auth user from request (after middleware has run)
   */
  getAuthUser(req: Request): AuthUser | null;
  
  /**
   * Check if request is authenticated
   */
  isAuthenticated(req: Request): boolean;
}

export interface AuthError extends Error {
  type: 'UNAUTHORIZED' | 'FORBIDDEN' | 'TOKEN_EXPIRED' | 'INVALID_TOKEN';
  statusCode: number;
}

export class AuthenticationError extends Error implements AuthError {
  public readonly type: AuthError['type'];
  public readonly statusCode: number;

  constructor(type: AuthError['type'], message: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.type = type;
    this.statusCode = type === 'UNAUTHORIZED' ? 401 : 403;
  }
} 