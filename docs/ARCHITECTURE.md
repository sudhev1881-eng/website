# StudentLink Architecture

StudentLink is a **web-only platform**. There is no desktop application, no Electron app, and no native admin client. Every user — students, administrators, and recruiters — interacts through a web browser.

## Deployment Model

Initially, the entire system runs on a **single Ubuntu server** (e.g. a local PC). The same architecture migrates to cloud hosting later without frontend changes.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Ubuntu Server (single host)                   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Next.js    │  │  Node.js     │  │     PostgreSQL       │  │
│  │   Frontend   │  │  REST API    │  │     Database         │  │
│  │   :3000      │  │  :4000       │  │     :5432            │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         │    HTTP/REST    ├──────────────────────┘              │
│         └────────────────►│                                     │
│                           │                                     │
│                  ┌────────▼────────┐   ┌──────────────────┐   │
│                  │   NFC Service   │   │   File Storage   │   │
│                  │  (USB reader)   │   │  /var/studentlink│   │
│                  └────────┬────────┘   └──────────────────┘   │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │ USB
                     ┌──────▼──────┐
                     │  NFC Reader │
                     └─────────────┘
```

### Access URLs

| Audience    | URL example                          |
|-------------|--------------------------------------|
| Public      | `http://studentlink.local`           |
| Students    | `http://studentlink.local/student`   |
| Admins      | `http://studentlink.local/admin`     |
| Recruiters  | `http://studentlink.local/u/{slug}`  |
| REST API    | `http://studentlink.local:4000/api`  |

Production: `https://studentlink.com`, `https://studentlink.com/admin`, etc.

## Communication Boundaries

```
Browser  ──HTTP──►  Next.js Frontend  ──HTTP──►  Node.js REST API
                                                    │
                                                    ├──► PostgreSQL
                                                    ├──► File Storage
                                                    └──► NFC Reader (USB)
```

**Critical rule:** The browser never communicates with the NFC reader directly. Only the backend talks to USB hardware.

## User Workflows

### Administrator — Program NFC Card

1. Administrator opens Chrome and navigates to `/admin`
2. Logs into the Admin Dashboard (browser session)
3. Searches for a student in the Students module
4. Clicks **Program NFC Card**
5. Frontend sends `POST /api/nfc/program` to the Node.js backend
6. Backend communicates with the USB NFC reader on the server (via `nfc-pcsc` + PC/SC when `NFC_READER_ENABLED=true`)
7. Backend writes an NDEF URI record with the profile URL (`/u/{slug}?src=nfc`)
8. Backend verifies the write by reading the tag back
9. Backend returns success/failure JSON
10. Admin Dashboard displays the result in the browser

### Student

1. Opens the website in a browser
2. Logs in at `/login`
3. Manages profile, resume, projects, etc. via `/student` dashboard
4. All data saved through REST API calls

### Recruiter

1. Taps an NFC card with a phone
2. Phone opens the student's public profile URL (`/u/{slug}`)
3. No login required — read-only public page

## Repository Layout

```
/
├── src/                  # Next.js frontend (browser UI only)
├── server/               # Node.js REST API + NFC service
│   ├── src/
│   │   ├── index.ts      # API entry point
│   │   ├── routes/       # REST route handlers
│   │   └── services/
│   │       └── nfc.ts    # USB NFC reader integration
│   └── package.json
├── docs/
│   └── ARCHITECTURE.md   # This file
├── docker-compose.yml    # Local dev: PostgreSQL + services
└── .env.example          # Environment variables
```

## Frontend / Backend Separation

The frontend uses environment variables so the same build works on a local server and in the cloud:

```env
# Browser → API (set at build time or runtime)
NEXT_PUBLIC_API_URL=http://studentlink.local:4000/api
```

The frontend never imports server-side NFC libraries or accesses USB devices.

## Cloud Migration

To migrate from a local Ubuntu PC to cloud hosting:

1. Deploy Next.js frontend (Vercel, Docker, or same VM)
2. Deploy Node.js API (Docker container or VM)
3. Use managed PostgreSQL (RDS, Supabase, etc.)
4. Move file storage to S3 or equivalent
5. **NFC programming requires a machine with USB access** — keep an on-premise API worker or dedicated programming station that proxies to the NFC reader

The frontend code does not change — only `NEXT_PUBLIC_API_URL` and server infrastructure.

## What StudentLink Is NOT

- Not an Electron or Tauri desktop app
- Not a separate native admin application
- Not a client that talks to NFC hardware directly
- Not a multi-page traditional website with dozens of routes (dashboards are browser SPAs within single routes)
