# StudentLink

Cloud-native platform for student digital profiles and NFC-linked recruiter experiences.

This branch also includes a Wi-Fi CSI room-presence prototype with a Python FastAPI sensing backend, live WebSocket predictions, a Next.js dashboard, and an Expo mobile client skeleton.

## Stack

| Layer | Technology | Host |
|-------|------------|------|
| Frontend | Next.js 16, React, TypeScript, Tailwind | **Vercel** |
| Backend | Node.js, Express, TypeScript, Docker | **Oracle Cloud** (Always Free ARM) |
| Wi-Fi sensing prototype | Python, FastAPI, scikit-learn, SQLite | Local / edge device |
| Database | PostgreSQL | **Supabase** |
| Auth | Google OAuth | **Supabase Auth** |
| Storage | Object storage | **Supabase Storage** |
| Email | Transactional email | **MailerSend** |

## Project structure

```
frontend/     Next.js → Vercel
backend/      Express API plus Python Wi-Fi CSI service
mobile/       Expo client for CSI live status
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

## Wi-Fi CSI sensing prototype

Run the simulated CSI backend and open the dashboard:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py

# separate terminal
cd frontend
NEXT_PUBLIC_CSI_API_URL=http://localhost:8000 npm run dev
```

Open `http://localhost:3000/wifi-sensing` to see `ROOM EMPTY`, `PERSON DETECTED`, `MOTION DETECTED`, or `SIGNAL UNSTABLE` in real time.

The prototype is CSI-first. RSSI may be recorded as device metadata, but ordinary Wi-Fi RSSI is not treated as reliable people detection. The privacy boundary is explicit: no camera, microphone, GPS, Bluetooth tracking, facial information, or personal identity is collected.

## Documentation

- [Cloud architecture](docs/CLOUD_ARCHITECTURE.md)
- [Deployment guide](docs/DEPLOYMENT.md) — Vercel + Oracle + Supabase
- [Google Auth & name claim](docs/GOOGLE_AUTH.md)
- [Wi-Fi CSI architecture](docs/wifi-sensing-architecture.md)
- [Wi-Fi CSI setup](docs/wifi-sensing-setup.md)
- [Wi-Fi CSI hardware notes](docs/wifi-sensing-hardware.md)
- [Wi-Fi CSI training](docs/wifi-sensing-training.md)

## Production deploy

```bash
# Migrations
./scripts/migrate.sh

# Oracle Cloud API
./scripts/deploy-oracle.sh

# Frontend: connect repo to Vercel with root directory `frontend`
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full checklist.
