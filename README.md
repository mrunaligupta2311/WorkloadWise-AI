# WorkloadWise AI

A workload planning and operations analytics MVP for small and medium-sized IT teams. It helps managers see task distribution, spot overloaded team members, understand deadline risk, and review explainable recommendations.

## What's included

- React + Vite frontend with JSX and a separate CSS file for each page/component
- Node.js + Express backend with thin controllers and separate routes/services/middleware
- Prisma ORM + PostgreSQL schema, seed script, and sample data
- JWT authentication, password hashing, role-aware API authorization
- Workload scoring and deadline-risk analytics (rule-based, transparent baseline; no paid AI API required)
- Optional Brevo OTP email service and Cloudinary attachment configuration hooks
- Vercel and Render deployment configuration examples

## Important MVP notes

- This is a starter MVP, not a production-audited system. Review security, privacy, and authorization before real company use.
- The analytics are explainable rules, not a trained machine-learning model. The UI labels recommendations as estimates and managers must make final decisions.
- Email OTP is optional and requires Brevo credentials. Without credentials, development mode logs the OTP to the backend console. Never use this fallback in production.
- Cloudinary uploads are not enabled by default; the schema supports attachment URLs. Configure upload handling before accepting real files.
- ChatGPT/OpenAI API is not required. No API key is bundled.

## Requirements

- Node.js 20+
- PostgreSQL database (Neon works)
- npm 10+

## Setup

1. Copy environment files:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. In `backend/.env`, set `DATABASE_URL` to your Neon/PostgreSQL connection string, `JWT_SECRET` to a long random secret, and `FRONTEND_URL` to `http://localhost:5173`.

3. Install dependencies from the project root:

   ```bash
   npm install
   ```

4. Generate Prisma Client and create tables:

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. Start frontend and backend together:

   ```bash
   npm run dev
   ```

Frontend: `http://localhost:5173`
Backend health: `http://localhost:5000/api/health`

## Demo login

After seeding:

- Admin: `admin@workloadwise.demo` / `DemoPass123!`
- Manager: `manager@workloadwise.demo` / `DemoPass123!`
- Employee: `employee@workloadwise.demo` / `DemoPass123!`

Change or remove demo credentials before deployment. Seeded users use a shared demo password intentionally for local testing only.

## Deploy

### Backend on Render

- Create a Web Service from the repository.
- Root directory: repository root.
- Build command: `npm install && npm run db:generate`
- Start command: `npm --workspace backend start`
- Add backend environment variables from `backend/.env.example`.
- Run `npm run db:push` once from a shell/release command after configuring `DATABASE_URL`.

### Frontend on Vercel

- Import the repository.
- Root directory: `frontend` (or configure monorepo install/build commands as needed).
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to your deployed backend URL plus `/api`.

## Main API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST /api/tasks`
- `PATCH/DELETE /api/tasks/:id`
- `GET /api/team`
- `GET /api/analytics/overview`
- `GET /api/analytics/workload`

All task/team/analytics routes require a bearer token. Role checks are enforced for management operations.

## Folder architecture

```text
frontend/src/
  components/  # reusable UI, each component has its own JSX + CSS
  pages/       # each page has its own JSX + CSS
  services/    # API client
backend/src/
  routes/      # route definitions
  controllers/ # request/response only
  services/    # business logic
  middleware/  # auth and error handling
  utils/       # shared helpers
backend/prisma/schema.prisma
```
