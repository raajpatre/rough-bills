# Rough Bills

Mobile-first student group expense tracking with hangout-based splits, optimized settlements, and repayment tracking after a hangout ends.

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Auth: JWT
- Hosting recommendation:
  - Frontend on Vercel
  - Backend on Railway or Render
  - Database on Neon

## Local Development

### Requirements

- Node.js 20+
- PostgreSQL database URL

### Environment

Create a root `.env`:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="replace-me"
CLIENT_ORIGIN="http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
PORT=4000
```

### Install and run

```bash
npm install
npm run prisma:generate
npm run dev:server
npm run dev:client
```

For first-time local DB setup:

```bash
npm run prisma:migrate --workspace server
```

## Production Deployment

### Frontend on Vercel

Deploy the `client` directory as the Vercel project root.

Build settings:

- Framework preset: `Vite`
- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`

Frontend environment variables:

```env
VITE_API_BASE_URL="https://your-backend-domain.com/api"
```

### Backend on Railway or Render

Deploy from the repo root.

Build command:

```bash
npm install && npm run prisma:generate
```

Start command:

```bash
npm run start:server
```

Run this once after setting environment variables:

```bash
npm run prisma:deploy
```

Backend environment variables:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="replace-me"
CLIENT_ORIGIN="https://your-vercel-app.vercel.app"
PORT=4000
NODE_ENV="production"
```

If you use a custom frontend domain, append it to `CLIENT_ORIGIN` as a comma-separated list.

Example:

```env
CLIENT_ORIGIN="https://your-vercel-app.vercel.app,https://app.yourdomain.com"
```

## Current Capabilities

- Register and log in with username + password
- Create and join hangouts
- Only the hangout creator can close a hangout
- Add equally split expenses
- View direct dues in two modes:
  - `My dues`
  - `Whole group`
- Mark dues paid after closure
- Record full or partial repayments
- Track remaining balances and payment history
- View archived debt summary pills on the Hangouts tab
