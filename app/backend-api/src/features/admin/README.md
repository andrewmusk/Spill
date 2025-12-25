# Admin API

Admin-only endpoints for platform diagnostics and inspection.

## Authentication

All endpoints require admin access via `requireAdmin()` middleware, which:
1. Requires authentication (via `requireAuthentication()`)
2. Checks if user's `clerkId` is in `CLERK_ADMIN_USER_IDS` environment variable

## Endpoints

### Platform Health

- `GET /admin/health` - Service health, version, commit SHA, environment
- `GET /admin/db` - Database health, migration status, entity counts

### User Search & Inspection

- `GET /admin/users?query=&limit=&cursor=` - Search users by handle, displayName, or ID
- `GET /admin/users/:id` - Full user details with counts and relationships

### Poll Search & Inspection

- `GET /admin/polls?query=&limit=&cursor=` - Search polls by question or ID
- `GET /admin/polls/:id` - Poll details with options and response distribution
- `GET /admin/polls/:id/responses?limit=&cursor=` - Paginated responses for a poll

### Response Search

- `GET /admin/responses?userId=&pollId=&limit=&cursor=` - Filter responses by user or poll

### Visibility Simulator

- `POST /admin/simulate/visibility` - Simulate visibility check
  - Body: `{ viewerUserId, target: { type: "poll"|"response"|"profile", id } }`
  - Returns: `{ allowed, reason, debug }`

## Response Format

All endpoints return standard envelope:
```json
{
  "data": { ... },
  "meta": {
    "nextCursor": "...",
    "traceId": "..."
  }
}
```

Errors return:
```json
{
  "error": {
    "type": "FORBIDDEN",
    "message": "..."
  },
  "meta": {
    "traceId": "..."
  }
}
```

## Environment Variables

- `CLERK_ADMIN_USER_IDS` - Comma-separated list of Clerk user IDs with admin access
- `COMMIT_SHA` - Git commit SHA (set in CI/deployment)
