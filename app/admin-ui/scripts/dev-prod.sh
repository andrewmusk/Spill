#!/bin/bash
# Dev script that uses production backend without overwriting .env.local

if [ ! -f .env.local.production ]; then
  echo "⚠️  .env.local.production not found."
  echo "Create it with your production values:"
  echo "  NEXT_PUBLIC_API_URL=https://api.yourdomain.com"
  echo "  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_..."
  echo "  CLERK_SECRET_KEY=sk_live_..."
  exit 1
fi

# Export variables from .env.local.production and run next dev
export $(grep -v '^#' .env.local.production | xargs)
next dev
