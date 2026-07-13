# Cloud Deployment Guide

Deploy StudentLink to **Vercel** (frontend), **Oracle Cloud** (API), and **Supabase** (database, auth, storage).

## Prerequisites

- GitHub repository connected to Vercel
- Oracle Cloud Always Free ARM instance (Oracle Linux)
- Supabase project
- MailerSend account (optional, for email)
- Domain with DNS access

---

## 1. Supabase setup

### Database
1. Create a project at [supabase.com](https://supabase.com).
2. Copy connection strings from **Project Settings → Database**:
   - **Transaction mode** (pooler port 6543, `?pgbouncer=true`) → `DATABASE_URL` (app runtime)
   - **Session mode** (pooler port 5432) → `DIRECT_URL` (migrations and seed)

### Auth
1. Authentication → Providers → enable **Google**.
2. Add redirect URLs:
   - `https://yourdomain.com/**`
   - `http://localhost:3000/**` (development)
3. Copy **Project URL** and **anon key** → frontend env.
4. Copy **service role key** → backend env only (never expose to browser).

### Storage
1. Create bucket `studentlink` (public read for profile assets).
2. Set `SUPABASE_STORAGE_BUCKET=studentlink`.

### Run migrations
```bash
cp backend/.env.example backend/.env
# Fill DATABASE_URL, DIRECT_URL, and Supabase keys
chmod +x scripts/migrate.sh
./scripts/migrate.sh
```

---

## 2. Vercel (frontend)

1. Import the GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api` |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` |

4. Deploy.

---

## 3. Oracle Cloud (backend)

### Instance
- Shape: Ampere A1 (Always Free)
- OS: Oracle Linux 8/9
- Open ingress: 80, 443

### Install Docker
```bash
sudo dnf install -y docker-engine docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

### Deploy
```bash
git clone https://github.com/your-org/studentlink.git
cd studentlink
cp backend/.env.example backend/.env
# Edit backend/.env with production values
chmod +x scripts/deploy-oracle.sh
./scripts/deploy-oracle.sh
```

### TLS (Let's Encrypt)
Use certbot with the `certbot_www` volume defined in `docker/docker-compose.prod.yml`, or run certbot on the host and mount `/etc/letsencrypt`.

Update `nginx/conf.d/api.conf` with your domain.

### DNS
| Record | Target |
|--------|--------|
| `yourdomain.com` | Vercel |
| `api.yourdomain.com` | Oracle instance public IP |

---

## 4. Environment checklist

### Backend (`backend/.env`)
- [ ] `DATABASE_URL` — Supabase transaction-mode pooler (port 6543)
- [ ] `DIRECT_URL` — Supabase session-mode pooler (port 5432, migrations/seed)
- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `JWT_SECRET` — 32+ random characters
- [ ] `SITE_URL`, `CORS_ORIGIN`, `API_PUBLIC_URL`
- [ ] `TRUST_PROXY=true`
- [ ] `MAILERSEND_API_KEY` (optional)

### Frontend (Vercel)
- [ ] All `NEXT_PUBLIC_*` variables set
- [ ] Google OAuth redirect URLs include production domain

---

## 5. Verify

```bash
curl https://api.yourdomain.com/api/health
# {"status":"ok","database":"connected","storage":"connected",...}
```

1. Open `https://yourdomain.com/login`
2. Sign in with Google (Supabase)
3. Complete name claim if preregistered
4. Upload resume → confirm file appears in Supabase Storage

---

## Local development

Use Supabase cloud project (recommended) or Supabase CLI for local stack.

```bash
npm install
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
# Fill with Supabase dev project credentials
npm run db:setup
npm run dev:api   # terminal 1
npm run dev       # terminal 2
```

No local PostgreSQL or file storage required.
