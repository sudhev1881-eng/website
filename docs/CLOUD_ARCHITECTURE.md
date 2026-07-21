# StudentLink — Cloud-Native Architecture

StudentLink is a **cloud-native SaaS** for student digital profiles and NFC-linked recruiter experiences. There is no home server, local storage, or physical deployment target.

## Infrastructure

```
┌─────────────────┐     HTTPS      ┌──────────────────────────────┐
│  Vercel         │ ◄──────────────► │  Browsers (students, admins, │
│  Next.js 15     │                  │  recruiters)                 │
└────────┬────────┘                  └──────────────────────────────┘
         │
         │  NEXT_PUBLIC_API_URL
         ▼
┌─────────────────┐     HTTPS      ┌──────────────────────────────┐
│  Oracle Cloud   │ ◄──────────────► │  Express API (Docker)        │
│  Always Free    │                  │  Nginx reverse proxy         │
│  ARM instance   │                  └──────────────┬───────────────┘
└─────────────────┘                                 │
                                                    │
         ┌──────────────────────────────────────────┼──────────────────┐
         ▼                    ▼                      ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐
│ Supabase        │  │ Supabase        │  │ Supabase        │  │ MailerSend   │
│ PostgreSQL      │  │ Auth (Google)   │  │ Storage         │  │ Email        │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └──────────────┘
```

## Repository layout

```
frontend/     Next.js app → deploy to Vercel
backend/      Express API → Docker on Oracle Cloud
docker/       Production Compose
nginx/        TLS termination + reverse proxy
scripts/      migrate.sh, deploy-oracle.sh
shared/       Shared TypeScript types
docs/         Architecture & deployment guides
```

## Authentication

1. User signs in with **Supabase Auth** (Google OAuth) on the frontend.
2. Frontend calls `POST /api/auth/supabase/sync` with the Supabase access token.
3. Backend links `auth.users.id` → `users.supabase_auth_id`.
4. API issues an app JWT for subsequent REST calls (legacy routes) or accepts Supabase tokens directly.

**Name claim flow** (pre-registered students): after Google sign-in, student enters legal name in CAPS to match admin-preregistered records.

## File storage

All uploads (resumes, avatars, covers) go to **Supabase Storage**. The Oracle server never stores user files on disk.

## NFC (cloud mode)

Physical USB readers are **not** attached to the cloud VM. Admins can program NTAG cards directly from the dashboard on **Android Chrome** via Web NFC (see [WEB_NFC.md](./WEB_NFC.md)). Alternatively, assign profile URLs in the database and program tags externally / distribute QR codes.

## Security

| Layer | Implementation |
|-------|----------------|
| Transport | HTTPS (Nginx + Let's Encrypt on Oracle; Vercel TLS) |
| Headers | Helmet, HSTS, X-Frame-Options |
| Rate limiting | express-rate-limit |
| CORS | Configurable origins |
| Auth | Supabase JWT + app JWT |
| Validation | Zod env + request schemas |
| SQL | Parameterized queries (pg) |
| Secrets | Environment variables only |

## Scalability path

| Phase | Users | Approach |
|-------|-------|----------|
| Launch | 1,000 | Single Oracle ARM instance + Supabase free tier |
| Growth | 10,000 | Scale Supabase plan; add Oracle instance or move API to container orchestration |
| Scale | 100,000+ | Separate read replicas, CDN for storage, horizontal API replicas behind load balancer |

## What we removed

- Home PC / HP ProDesk deployment
- Local PostgreSQL in production
- Local file storage (`/var/studentlink`)
- USB NFC reader on server (`nfc-pcsc`)
- Port forwarding / dynamic DNS assumptions
