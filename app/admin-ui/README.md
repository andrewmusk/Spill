# Spill Admin UI

Thin Next.js admin dashboard for Spill backend API.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file (copy from `.env.example`):
```bash
cp .env.example .env.local
# Then edit .env.local with your values
```

3. Run development server:
```bash
npm run dev
```

The admin UI will be available at `http://localhost:3000`.

## Environment Configuration

See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed environment configuration:

- **Local Development**: Use `.env.local` (gitignored)
- **Local + Production Backend**: Use `npm run dev:prod` (uses `.env.local.production`)
- **Production Deployment**: Uses `.env.production` (committed) + platform env vars

## Features

- **Overview**: Platform health and database statistics
- **Users**: Search and inspect users, view relationships
- **Polls**: Browse polls, view details and response distributions
- **Responses**: Filter and view votes/slider responses
- **Visibility Simulator**: Test visibility rules for polls, responses, and profiles

## Authentication

Uses Clerk for authentication. Only users listed in `CLERK_ADMIN_USER_IDS` environment variable on the backend can access admin endpoints.

## Scripts

- `npm run dev` - Start dev server (uses `.env.local`)
- `npm run dev:prod` - Start dev server with production backend (uses `.env.local.production`)
- `npm run build` - Build for production (uses `.env.production`)
- `npm start` - Start production server
