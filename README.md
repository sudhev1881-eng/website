# StudentLink

Cloud-native platform for student digital profiles and NFC-linked recruiter experiences.

## Stack

| Layer | Technology | Host |
|-------|------------|------|
| Frontend | Next.js 15, React, TypeScript, Tailwind | **Vercel** |
| Backend | Node.js, Express, TypeScript, Docker | **Oracle Cloud** (Always Free ARM) |
| Database | PostgreSQL | **Supabase** |
| Auth | Google OAuth | **Supabase Auth** |
| Storage | Object storage | **Supabase Storage** |
| Email | Transactional email | **Resend** |

## Project structure

```
frontend/     Next.js → Vercel
backend/      Express API → Docker on Oracle Cloud
docker/       Production Compose
nginx/        HTTPS reverse proxy
scripts/      migrate.sh, deploy-oracle.sh
shared/       Shared types
docs/         Architecture & deployment
```

## Quick start (development)

Requires a [Supabase](https://supabase.com) project (no local database).

```bash
npm install
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
# Fill Supabase credentials in both files
npm run db:setup
npm run dev:api    # API :4000
npm run dev        # Frontend :3000
```

## Documentation

- [Cloud architecture](docs/CLOUD_ARCHITECTURE.md)
- [Deployment guide](docs/DEPLOYMENT.md) — Vercel + Oracle + Supabase
- [Google Auth & name claim](docs/GOOGLE_AUTH.md)

## Production deploy

```bash
# Migrations
./scripts/migrate.sh

# Oracle Cloud API
./scripts/deploy-oracle.sh

# Frontend: connect repo to Vercel with root directory `frontend`
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full checklist.
