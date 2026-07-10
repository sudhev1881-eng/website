# StudentLink API

Node.js REST API that runs on the Ubuntu server alongside the Next.js frontend.

**This is the only component that communicates with the USB NFC reader.** Browsers call this API over HTTP — they never access hardware directly.

## Endpoints

| Method | Path               | Description                          |
|--------|--------------------|--------------------------------------|
| GET    | `/api/health`      | API health check                     |
| GET    | `/api/nfc/status`  | USB NFC reader connection status     |
| POST   | `/api/nfc/program` | Write profile URL to card on reader  |

### Program NFC Card

```bash
curl -X POST http://localhost:4000/api/nfc/program \
  -H "Content-Type: application/json" \
  -d '{"studentId":"stu_001","studentSlug":"alex-morgan","cardNumber":"SL-2025-0042"}'
```

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

Set `NFC_READER_ENABLED=true` when the USB reader is connected to the server and PC/SC is installed.

See [docs/NFC_SETUP.md](../docs/NFC_SETUP.md) for full Ubuntu setup (pcscd, libpcsclite-dev, ACR122U).

### Hardware mode

When enabled, the API uses `nfc-pcsc` to:

1. Detect the USB reader via PC/SC
2. Wait for an NTAG card (configurable timeout)
3. Write an NDEF URI record (`/u/{slug}?src=nfc`)
4. Read back and verify the URL

Status endpoint returns `mode: "hardware" | "stub"` and the connected reader name.

## Production (Ubuntu server)

Run as a systemd service or via Docker on the same host as Next.js and PostgreSQL. The NFC reader must be plugged into **this machine's USB port**.
