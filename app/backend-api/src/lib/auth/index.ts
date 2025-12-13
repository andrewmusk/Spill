export { ClerkAuthAdapter } from './clerk-adapter.js';
export type { AuthAdapter, AuthUser, AuthError } from './auth-adapter.js';
export { AuthenticationError } from './auth-adapter.js';

// Export the current auth adapter instance
import { ClerkAuthAdapter } from './clerk-adapter.js';
export const authAdapter = new ClerkAuthAdapter(); 