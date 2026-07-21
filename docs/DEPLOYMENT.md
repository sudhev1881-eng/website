# Cloud Deployment Guide

Deploy StudentLink to **Vercel** (frontend), **Render** (API), and **Supabase** (database, auth, storage).

## Prerequisites

- GitHub repository connected to Vercel and Render
- Supabase project
- MailerSend account (optional, for email)

---

## 1. Supabase setup

### Database
1. Create a project at [supabase.com](https://supabase.com).
2. Copy connection strings from **Project Settings → Database**:
   - **Transaction mode** (pooler port 6543, `?pgbouncer=true`) → `DATABASE_URL` (app runtime)
   - **Session mode** (pooler port 5432) → `DIRECT_URL` (migrations and seed)

### Auth
1. Authentication → Providers → enable **Google**.
2. Add redirect URLs for your Vercel URL and `http://localhost:3000/**`.
3. Copy **Project URL** and **anon key** → frontend env.
4. Copy **service role key** → backend env only (never expose to browser).

### Storage
1. Create bucket `studentlink` (public read for profile assets).
2. Set `SUPABASE_STORAGE_BUCKET=studentlink`.

### Run migrations (from your PC)
```bash
cd backend
npm run db:migrate
```

---

## 2. Vercel (frontend)

1. Import the GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RENDER-SERVICE.onrender.com/api` |
| `NEXT_PUBLIC_SITE_URL` | your Vercel URL |

4. Deploy.

---

## 3. Render (backend API)

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect `sudhev1881-eng/website`.
3. Settings:
   - **Name:** `studentlink-api`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm ci --include=dev && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
4. Add the environment variables from the checklist below.
5. Deploy → copy the service URL.
6. Set `API_PUBLIC_URL` on Render to that URL.
7. Set Vercel `NEXT_PUBLIC_API_URL` to `https://….onrender.com/api` and redeploy.

Or: **New → Blueprint** → select this repo (uses `render.yaml`).

> Free tier spins down after idle; first request after sleep can take ~30–60s.

---

## 4. Environment checklist

### Backend (Render)

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `true` |
| `NFC_CLOUD_MODE` | `true` |
| `DATABASE_URL` | Supabase pooler port 6543 |
| `DIRECT_URL` | Supabase pooler port 5432 |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (secret) |
| `SUPABASE_STORAGE_BUCKET` | `studentlink` |
| `JWT_SECRET` | 32+ chars |
| `SITE_URL` | Vercel URL |
| `CORS_ORIGIN` | Vercel URL |
| `API_PUBLIC_URL` | Render service URL |

### Frontend (Vercel)
- All `NEXT_PUBLIC_*` set
- `NEXT_PUBLIC_API_URL` points at Render `/api`

---

## 5. Verify

```bash
curl https://YOUR-RENDER-SERVICE.onrender.com/api/health
```

1. Open Vercel site → `/login`
2. Sign in with admin or student demo accounts
3. Confirm uploads land in Supabase Storage

---

## Local development

```bash
npm install
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
# Fill with Supabase credentials
npm run db:setup
npm run dev:api   # terminal 1
npm run dev       # terminal 2
```
