# Admin UI Environment Configuration

## Overview

The admin UI uses environment variables to configure which backend API to connect to. This allows you to:
- Develop locally against local backend
- Test locally against production backend  
- Deploy to production with production backend

## Environment Files

Next.js loads environment files in this order (later files override earlier ones):

1. `.env` - Default values (committed to git)
2. `.env.local` - Local overrides (gitignored, for local dev)
3. `.env.development` - Development-specific (committed)
4. `.env.production` - Production-specific (committed) ✅ **Safe to commit**
5. `.env.local.production` - Local overrides for production testing (gitignored)

## Configuration

### Required Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key (safe to commit)
- `CLERK_SECRET_KEY` - Clerk secret key (server-only, **never commit**)

### Local Development (Default)

**File: `.env.local`** (gitignored)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Usage:**
```bash
npm run dev
```

### Local Development with Production Backend

**File: `.env.local.production`** (gitignored - create this file)
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

**Usage:**
```bash
npm run dev:prod
```

This script loads variables from `.env.local.production` without modifying `.env.local`, so your local config is preserved.

### Production Deployment

**File: `.env.production`** (committed to git - public values only)
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
# Note: CLERK_SECRET_KEY is NOT here - set it in deployment platform
```

**Secret Key Setup:**
Set `CLERK_SECRET_KEY` in your deployment platform's environment variables:
- **Vercel**: Project Settings → Environment Variables
- **Railway**: Project Settings → Variables
- **Render**: Environment → Environment Variables
- **AWS/GCP**: Use their respective secret managers

**Usage:**
```bash
npm run build  # Uses .env.production automatically
npm start
```

## Security Notes

⚠️ **Important:**
- ✅ **Safe to commit**: `NEXT_PUBLIC_*` variables (they're embedded in client bundle anyway)
- ✅ **Safe to commit**: Public URLs
- ❌ **Never commit**: `CLERK_SECRET_KEY` or any `sk_*` keys
- ❌ **Never commit**: Database URLs, API secrets, tokens
- ✅ **Use**: Deployment platform's environment variable system for secrets

## Quick Reference

| Environment | Backend URL | Clerk Keys | File | Committed? |
|------------|-------------|------------|------|------------|
| Local Dev | `http://localhost:8080` | Test keys | `.env.local` | ❌ No |
| Local + Prod Backend | `https://api.yourdomain.com` | Live keys | `.env.local.production` | ❌ No |
| Production | `https://api.yourdomain.com` | Live keys | `.env.production` + Platform env vars | ✅ Public only |

## Deployment Platforms

### Vercel

1. Go to your project settings → Environment Variables
2. Add:
   - `CLERK_SECRET_KEY` = `sk_live_...`
3. Deploy - Vercel will use `.env.production` + your env vars

### Railway

1. Go to Project Settings → Variables
2. Add:
   - `CLERK_SECRET_KEY` = `sk_live_...`
3. Deploy

### Other Platforms

Set `CLERK_SECRET_KEY` in your platform's environment variable system.

## Troubleshooting

### Admin UI can't connect to backend
- Check `NEXT_PUBLIC_API_URL` is correct
- Verify backend is running and accessible
- Check CORS is configured on backend for your origin

### Authentication fails
- Verify Clerk keys match between admin UI and backend
- Check you're using the correct environment's Clerk keys
- Ensure your user ID is in backend's `CLERK_ADMIN_USER_IDS`

### Wrong backend in production
- Verify `.env.production` has correct `NEXT_PUBLIC_API_URL`
- Rebuild: `npm run build`
- Check deployment platform's environment variables

### Secret key not working in production
- Verify `CLERK_SECRET_KEY` is set in deployment platform (not just `.env.production`)
- Check the key is `sk_live_...` (production key, not test key)
- Restart/redeploy after adding environment variables
