# Admin Setup Instructions

## Backend Configuration

Add these lines to your `app/backend-api/.env` file:

```bash
# Admin Access - Add your Clerk user ID here
CLERK_ADMIN_USER_IDS=user_37KbZmLutSLCwx88GzajQm78pi9

# Optional: Set commit SHA for /admin/health endpoint
COMMIT_SHA=local-dev

# Your Clerk keys (should already be set)
CLERK_PUBLISHABLE_KEY=pk_test_ZGVzaXJlZC1zdGluZ3JheS05OS5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_GgyPHTNF6lQfJpZUz4EP0TA133xigE2RmCnnumrhce
```

## Admin UI Configuration

Create `app/admin-ui/.env.local` file with:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZGVzaXJlZC1zdGluZ3JheS05OS5jbGVyay5hY2NvdW50cy5kZXYk
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Verification

After setting up, run:
```bash
cd app/backend-api
npm run verify-admin-setup
```

This will verify:
- ✅ Admin user ID is configured
- ✅ Clerk keys are set
- ✅ Database connection works
- ✅ Test user exists in database
