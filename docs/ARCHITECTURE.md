# StudentLink Architecture (legacy note)

> **This document described the original single-server / home PC deployment.**
> StudentLink now uses a **cloud-native architecture**.

See:
- [CLOUD_ARCHITECTURE.md](./CLOUD_ARCHITECTURE.md) — current system design
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Vercel + Oracle Cloud + Supabase

## Summary

| Component | Host |
|-----------|------|
| Frontend (Next.js) | Vercel |
| API (Express + Docker) | Oracle Cloud Always Free |
| PostgreSQL | Supabase |
| Auth (Google OAuth) | Supabase Auth |
| File uploads | Supabase Storage |
| Email | MailerSend |

No local server, home PC, USB NFC reader, or on-disk file storage in production.
