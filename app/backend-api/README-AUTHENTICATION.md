# Spill Backend - Authentication

This document describes the Clerk-based authentication system implemented in the Spill backend API.

## Overview

The backend uses [Clerk](https://clerk.com) for authentication with Just-in-Time (JIT) user provisioning. When a user authenticates through the mobile app, a corresponding local user record is automatically created in PostgreSQL.

## Setup

### Environment Variables

Create a `.env` file in the `app/backend-api` directory with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://spill_app:devpass@localhost:5432/spill_dev"
DB_USER=spill_app
DB_PASS=devpass
DB_NAME=spill_dev

# Production only - Google Cloud SQL instance connection
# INSTANCE_CONNECTION_NAME=project:region:instance

# Clerk Authentication (Required)
CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Server Configuration
PORT=8080
NODE_ENV=development
```

### Clerk Setup

1. Create a Clerk application at [clerk.com](https://dashboard.clerk.com)
2. Get your API keys from the Clerk dashboard
3. Set up JWT template (if using custom claims)
4. Configure your mobile app to use Clerk authentication

### Installation

```bash
npm install
npm run dev  # Start development server
```

## Architecture

### Auth Adapter Pattern

The authentication system uses an adapter pattern for future migration flexibility:

- **Interface**: `AuthAdapter` defines the contract
- **Implementation**: `ClerkAuthAdapter` implements Clerk-specific logic
- **Future**: Easy to swap for different auth providers

```typescript
// Current usage
import { authAdapter } from './lib/auth';
const user = authAdapter.getAuthUser(req);
```

### Middleware Stack

The Express middleware is ordered as follows:

1. **Request ID**: Assigns unique request identifiers
2. **Body Parsers**: JSON and URL-encoded parsing
3. **Clerk Middleware**: Base Clerk authentication
4. **Route-Specific Auth**: `requireAuthentication()` or `optionalAuthentication()`

### User Provisioning (JIT)

When a user authenticates for the first time:

1. Clerk validates the JWT token
2. Middleware checks if user exists in local database
3. If not found, creates new user with:
   - `clerkId`: Unique Clerk user identifier
   - `handle`: Generated from email or name
   - `displayName`: From Clerk profile data
   - `isPrivate`: Default to false

## API Usage

### Mobile Client Authentication

Mobile clients must include the Clerk JWT token in the Authorization header:

```http
Authorization: Bearer <clerk_jwt_token>
```

### Protected Routes

Routes that require authentication use the `requireAuthentication()` middleware:

```typescript
router.use(requireAuthentication());
router.get('/protected', (req, res) => {
  // req.user is available and guaranteed to exist
  const userId = req.user.id;
  // ...
});
```

### Optional Authentication

Routes that benefit from but don't require authentication use `optionalAuthentication()`:

```typescript
router.get('/public', optionalAuthentication(), (req, res) => {
  if (req.user) {
    // User is authenticated
  } else {
    // Anonymous user
  }
});
```

## API Endpoints

### Public Endpoints

- `GET /health` - Health check (no auth required)
- `GET /health/ready` - Readiness check (no auth required)

### Authentication Endpoints

All `/api/auth/*` endpoints require authentication:

- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/me` - Update user profile
- `POST /api/auth/sync` - Sync profile from Clerk

### User Endpoints

- `GET /api/users/:handle` - Get user by handle (optional auth)
- `GET /api/users?q=search` - Search users (requires auth)

## Error Handling

Authentication errors return standardized JSON responses:

```json
{
  "error": {
    "type": "UNAUTHORIZED",
    "message": "Authentication required"
  },
  "meta": {
    "traceId": "abc123"
  }
}
```

Error types:
- `UNAUTHORIZED` (401): Invalid or missing token
- `FORBIDDEN` (403): Valid token but insufficient permissions
- `TOKEN_EXPIRED` (401): Token has expired
- `INVALID_TOKEN` (401): Malformed token

## Security Features

- **HTTPS Enforcement**: Tokens only accepted over HTTPS in production
- **Request Tracing**: All requests include trace IDs for debugging
- **Rate Limiting**: Built-in protection against abuse
- **Input Validation**: Zod schemas for request validation
- **Error Sanitization**: Sensitive data never leaked in responses

## Testing

For testing, you can mock the authentication by providing a test user:

```typescript
// In tests
app.use((req, res, next) => {
  req.user = {
    id: 'test-user-id',
    clerkId: 'test-clerk-id',
    handle: 'testuser',
    // ...
  };
  next();
});
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check Clerk API keys in environment
2. **User not provisioned**: Verify Clerk webhook configuration
3. **Database errors**: Ensure PostgreSQL is running and migrations applied

### Logs

Authentication events are logged with structured data:

```
✅ Created new user: johndoe (clerk_user_123)
❌ Authentication failed: invalid token
```

### Debug Mode

Set `NODE_ENV=development` for detailed error messages and stack traces.

## Migration Guide

To migrate from Clerk to another auth provider:

1. Implement new `AuthAdapter`
2. Update environment configuration
3. Replace `ClerkAuthAdapter` import
4. Update middleware if needed
5. Test authentication flow

The adapter pattern ensures minimal code changes outside the auth module. 