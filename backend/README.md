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

## Wi-Fi CSI Python service

The Wi-Fi sensing prototype adds a separate Python FastAPI service alongside the existing Node API. It is CSI-first and keeps hardware-specific code behind `backend/csi/CSICollector`.

### Run in simulated CSI mode

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

The service starts on `http://localhost:8000`, seeds synthetic CSI training samples on first run, trains a baseline Random Forest model, and streams predictions on `ws://localhost:8000/ws/status`.

### Hardware mode

Set `CSI_DEVICE_MODE=jsonl` and `CSI_JSONL_SOURCE_PATH=/path/to/csi.jsonl`. The JSONL bridge should output one measurement per line:

```json
{"device_id":"esp32-1","room_id":"lab-1","amplitude":[42.1,41.8],"phase":[0.1,0.2],"rssi":-51}
```

RSSI is recorded as metadata only. Detection features are extracted from CSI amplitude and phase.
