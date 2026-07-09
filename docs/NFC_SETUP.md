# NFC Reader Setup (Ubuntu Server)

StudentLink programs NFC cards from the **browser admin dashboard**, but the USB reader must be connected to the **Ubuntu server** running the API — not the administrator's laptop.

## Supported hardware

| Reader | Status |
|--------|--------|
| ACR122U | Tested / recommended |
| Any PC/SC compliant USB reader | Should work |

| Tag type | Status |
|----------|--------|
| NTAG213 / NTAG215 / NTAG216 | Supported (recommended) |
| MIFARE Classic | Not supported for URL writing |

## 1. Install PC/SC stack

```bash
sudo apt update
sudo apt install -y pcscd libpcsclite-dev
sudo systemctl enable pcscd
sudo systemctl start pcscd
```

Verify the daemon is running:

```bash
systemctl status pcscd
```

## 2. Install Node dependencies

From the project root:

```bash
cd server
npm install
```

`nfc-pcsc` compiles a native addon against `libpcsclite`. If `npm install` fails with `winscard.h: No such file`, install `libpcsclite-dev` first.

## 3. Plug in the reader

Connect the USB NFC reader to the server. List detected readers:

```bash
pcsc_scan
```

You should see your reader (e.g. `ACS ACR122U`).

## 4. Enable hardware mode

Edit `server/.env`:

```env
NFC_READER_ENABLED=true
SITE_URL=http://localhost:3000
NFC_CARD_TIMEOUT_MS=30000
```

Restart the API (from project root **or** the `server/` folder):

```bash
# from project root
npm run dev:api

# or from server/
cd server && npm run dev
```

On startup you should see:

```
NFC hardware mode enabled — waiting for USB reader
[NFC] Reader attached: ACS ACR122U PICC Interface 0
```

## 5. Program a card

1. Open `/admin` → **Students**
2. Click **Program NFC Card** for a student
3. Click **Program Card** in the dialog
4. Place a blank **NTAG** card on the reader within 30 seconds
5. The server writes `https://yoursite/u/{slug}?src=nfc` and verifies the read-back

## Tap tracking

Cards are written with `?src=nfc` on the profile URL. When a recruiter taps the card:

1. Phone opens `/u/{slug}?src=nfc`
2. API increments `nfc_taps` on the student and `total_taps` on the linked card

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `No reader detected` | Check USB cable, run `pcsc_scan`, restart `pcscd` |
| `NFC init error` | Install `libpcsclite-dev`, run `npm install` in `server/` |
| `Timed out waiting for card` | Place card **after** clicking Program; use NTAG tags |
| `Verification failed` | Try a different blank NTAG card |
| Admin sees stub mode | Set `NFC_READER_ENABLED=true` and restart API on the **server** |

## Docker note

USB passthrough to Docker is possible but fragile. For production NFC programming, run the API directly on the host (systemd) or use a dedicated on-premise programming station as described in [ARCHITECTURE.md](./ARCHITECTURE.md).
