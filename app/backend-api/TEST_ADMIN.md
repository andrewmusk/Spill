# Testing Admin Functionality

## ✅ Setup Complete!

Your admin configuration is ready:
- ✅ Admin user ID configured: `user_37KbZmLutSLCwx88GzajQm78pi9`
- ✅ Clerk keys configured
- ✅ Database connected

## Quick Test Options

### Option 1: Test with Admin UI (Recommended)

1. **Start the backend:**
   ```bash
   cd app/backend-api
   npm run dev
   ```

2. **Start the admin UI** (in another terminal):
   ```bash
   cd app/admin-ui
   npm install  # if not done yet
   npm run dev
   ```

3. **Open browser:**
   - Go to `http://localhost:3000`
   - Sign in with your Clerk account (the one with ID `user_37KbZmLutSLCwx88GzajQm78pi9`)
   - You should see the admin dashboard!

4. **Test the pages:**
   - Overview: Should show health and DB stats
   - Users: Will be empty until you sign in (JIT creates your user)
   - Polls: Will be empty until you seed data
   - Simulator: Test visibility rules

### Option 2: Seed Test Data First

If you want to see data immediately:

```bash
cd app/backend-api
npm run seed
```

This creates:
- 8 test users
- 9 polls (public, friends-only, private link)
- Votes and responses
- Follow relationships, blocks, etc.

Then sign in to the admin UI to see all the data!

### Option 3: Test Backend Endpoints Directly

1. **Start backend:**
   ```bash
   cd app/backend-api
   npm run dev
   ```

2. **Get your Clerk token:**
   - Go to `http://localhost:8080/auth` in browser
   - Sign in with your Clerk account
   - Open DevTools → Network tab
   - Make any request
   - Copy the `Authorization: Bearer <token>` value

3. **Test endpoints:**
   ```bash
   # Health check
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/admin/health

   # DB health
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/admin/db

   # Users (will be empty until you sign in)
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/admin/users?limit=10
   ```

## Expected Behavior

### First Time Sign-In (JIT User Creation)

When you sign in for the first time:
1. Clerk authenticates you
2. Backend automatically creates a user record with your `clerkId`
3. Your user appears in the admin UI
4. You can now access all admin endpoints

### Admin Access Check

The backend checks:
1. ✅ User is authenticated (has valid Clerk token)
2. ✅ User's `clerkId` is in `CLERK_ADMIN_USER_IDS`
3. ✅ User exists in database (created via JIT)

If any step fails, you'll get:
- `401 UNAUTHORIZED` - Not authenticated
- `403 FORBIDDEN` - Not an admin user

## Troubleshooting

### "Admin access not configured"
- Check `.env` has `CLERK_ADMIN_USER_IDS=user_37KbZmLutSLCwx88GzajQm78pi9`
- Restart backend server

### "Admin access required" (403)
- Verify your Clerk user ID matches exactly
- Check you're signed in with the right Clerk account
- Restart backend after changing `.env`

### "Authentication required" (401)
- Make sure you're sending the Clerk JWT token
- Token might be expired - sign in again

### Admin UI shows "Please sign in"
- Make sure `.env.local` has `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Check Clerk keys match between backend and admin UI

## Next Steps

1. ✅ Admin setup complete
2. 🚀 Start testing with admin UI
3. 📊 Seed data if you want test data
4. 🔍 Test visibility simulator
5. 📝 Explore all admin endpoints
