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

| Method | Path                  | Auth   | Description              |
|--------|-----------------------|--------|--------------------------|
| POST   | `/api/auth/register`  | No     | Create student account   |
| POST   | `/api/auth/login`     | No     | Login, returns JWT       |
| GET    | `/api/students/me`    | Student| Full dashboard data      |
| GET    | `/api/profiles/:slug` | No     | Public recruiter profile |
| GET    | `/api/admin/students` | Admin  | List all students        |
| POST   | `/api/nfc/program`    | Admin  | Program NFC card         |

## NFC Card Programming

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
