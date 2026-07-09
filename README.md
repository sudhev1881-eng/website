# StudentLink

A **web-only** platform for student digital profiles and NFC card management. Students build portfolios, administrators program NFC cards, and recruiters view profiles by tapping a card — all through a browser.

> **StudentLink is not a desktop application.** There is no Electron app. Administrators use Chrome (or any browser) at `/admin` on the same website.

## Architecture

Single-server deployment (Ubuntu PC initially, cloud later):

| Component        | Technology   | Port  |
|------------------|-------------|-------|
| Frontend         | Next.js     | 3000  |
| REST API         | Node.js     | 4000  |
| Database         | PostgreSQL  | 5432  |
| File storage     | Local disk  | —     |
| NFC reader       | USB → API   | —     |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design, NFC workflow, and cloud migration guide.

## Routes (browser only)

| URL            | Audience    |
|----------------|-------------|
| `/`            | Public      |
| `/login`       | Auth        |
| `/student`     | Students    |
| `/admin`       | Admins      |
| `/u/{slug}`    | Recruiters  |

## Quick Start (development)

You need **three things running**: PostgreSQL, the API, and the frontend.

### 1. Database

```bash
npm run db:up          # starts PostgreSQL via Docker
npm run db:setup       # runs migrations + seeds demo data
```

### Docker (full stack)

```bash
docker compose up -d postgres
docker compose run --rm api npx tsx db/migrate.ts
docker compose run --rm api npx tsx db/seed.ts
docker compose up -d api web
```

Open [http://localhost:3000](http://localhost:3000) — API at [http://localhost:4000](http://localhost:4000).

### 2. Backend API (port 4000)

```bash
cp server/.env.example server/.env
npm run dev:api
```

### 3. Frontend (port 3000)

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo accounts (after `npm run db:seed`)

| Role    | Email                        | Password   |
|---------|------------------------------|------------|
| Student | alex.morgan@stanford.edu     | student123 |
| Student | sarah.chen@mit.edu           | student123 |
| Admin   | admin@studentlink.local      | admin123   |

### API endpoints

| Method | Path                       | Auth    | Description                    |
|--------|----------------------------|---------|--------------------------------|
| POST   | `/api/auth/register`       | No      | Create student account         |
| POST   | `/api/auth/login`          | No      | Login, returns JWT             |
| GET    | `/api/students/me`         | Student | Full dashboard data            |
| POST   | `/api/students/me/resume`  | Student | Upload resume (multipart)      |
| POST   | `/api/students/me/avatar`  | Student | Upload profile image           |
| GET    | `/api/profiles/:slug`      | No      | Public recruiter profile       |
| GET    | `/api/uploads/*`           | No      | Serve uploaded files           |
| GET    | `/api/admin/students`      | Admin   | List all students              |
| POST   | `/api/admin/students`      | Admin   | Create student                 |
| GET    | `/api/admin/nfc-cards`     | Admin   | List NFC card inventory        |
| GET    | `/api/admin/universities`  | Admin   | List universities              |
| GET    | `/api/admin/analytics`     | Admin   | Platform analytics             |
| GET    | `/api/admin/storage`       | Admin   | Storage usage from disk        |
| POST   | `/api/nfc/program`         | Admin   | Program NFC card (USB reader)  |

See [docs/NFC_SETUP.md](docs/NFC_SETUP.md) for USB reader setup on Ubuntu.

## Troubleshooting

### Admin dashboard empty or “Profile not found”

**Cause:** PostgreSQL is not running. The API starts without it, but admin lists and public profiles need the database.

**Fix:**

```bash
npm run db:up          # requires Docker
npm run db:setup       # migrations + demo students
cd server && npm run dev   # restart API
```

Check: open [http://localhost:4000/api/health](http://localhost:4000/api/health) — must show `"database": "connected"`.

**No Docker?** Install PostgreSQL locally, create user/db matching `server/.env`, then `npm run db:setup`.

### `npm run dev:api` not found inside `server/`

From `server/` use `npm run dev`. From project root use `npm run dev:api`.


Administrators program cards from the **Admin Dashboard in the browser**:

1. Go to `/admin` → Students
2. Search for a student
3. Click **Program NFC Card**
4. Place card on the USB reader connected to the **server**
5. Backend writes the profile URL; browser shows success

The browser never touches the NFC hardware — only the server-side API does.

## Environment Variables

Copy `.env.example` to `.env.local` (frontend) and `server/.env.example` to `server/.env` (API).

Key variable:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Change this when deploying to `http://studentlink.local:4000/api` or `https://api.studentlink.com/api` — no frontend code changes required.

## Project Structure

```
src/           Next.js frontend (web UI)
server/        Node.js REST API + NFC service
docs/          Architecture documentation
```
