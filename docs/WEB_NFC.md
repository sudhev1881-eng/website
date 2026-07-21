/**
 * Web NFC — direct card writing from the admin dashboard
 *
 * Admins on **Android Chrome** can write a student's public profile URL onto a
 * blank NTAG card from `/admin` → Students → **Write NFC**. No extra app and no
 * USB reader on the server are required for this path.
 *
 * Related: [NFC_SETUP.md](./NFC_SETUP.md) documents the legacy USB/PCSC reader
 * path (cloud deployments typically do not use a server-attached reader).
 */

## Profile URL format

Tags are written with a single NDEF **URL** record:

```text
{SITE_URL}/u/{username}?src=nfc
```

Examples:

- `https://yourdomain.com/u/alex-morgan?src=nfc`
- Local: `http://localhost:3000/u/alex-morgan?src=nfc` (HTTPS preferred; localhost is a secure context)

`SITE_URL` comes from `NEXT_PUBLIC_SITE_URL` on the frontend (and `SITE_URL` on the API). The `?src=nfc` query enables tap analytics when recruiters open the profile.

## Supported browsers and platforms

| Environment | Web NFC write |
|-------------|----------------|
| Android Chrome (recent) | Supported |
| Android Chromium derivatives | Often supported if Web NFC is enabled |
| Desktop Chrome / Edge | **Not supported** (button opens modal with explanation) |
| iOS Safari / Chrome iOS | **Not supported** (Apple does not expose Web NFC) |
| Firefox | **Not supported** |

### Android requirements

1. Phone with NFC hardware
2. NFC enabled in Android Settings
3. **Chrome** (not in-app WebViews)
4. **Secure context**: HTTPS production URL, or `http://localhost` for local admin testing
5. User gesture to start write (the **Write Card** button) — permission is requested on first use

## Supported tags

| Tag | Status |
|-----|--------|
| NTAG213 | Supported (recommended for short URLs) |
| NTAG215 | Supported |
| NTAG216 | Supported |
| MIFARE Classic | Not supported for NDEF URL writing via Web NFC |
| Locked / read-only NTAG | Write fails with a clear error |

Blank NTAG cards from typical NFC card vendors work well. Capacity: a StudentLink URL easily fits NTAG213.

## Admin flow

1. Sign in as admin → **Students**
2. Tap **Write NFC** on a student row
3. On a supported phone, tap **Write Card**
4. Hold the NTAG against the phone until Writing → Verifying complete
5. On success, the app:
   - Confirms read-back URL matches the expected profile URL
   - Calls `POST /api/nfc/mark-programmed` (admin auth)
   - Sets the card `status` to `active`, records `programmed_at`, `programmed_by`, `programmed_url`, `program_source = web_nfc`

### UI states

Ready to scan → Hold card near phone → Writing... → Verifying... → Success | Failed | Cancelled

Desktop / unsupported browsers show a disabled-style explanation instead of attempting NFC.

## API

### `POST /api/nfc/mark-programmed`

Admin JWT / Supabase token required.

```json
{
  "studentId": "<uuid>",
  "studentSlug": "alex-morgan",
  "urlWritten": "https://yourdomain.com/u/alex-morgan?src=nfc",
  "cardUid": "optional-hex-uid",
  "cardNumber": "optional-existing-card-number",
  "verified": true
}
```

Validates the student exists, that `urlWritten` matches the expected `/u/{slug}?src=nfc` URL, and upserts `nfc_cards` in a transaction.

### `POST /api/nfc/program`

Legacy / cloud path: registers the profile URL in the database without a physical Web NFC write (`program_source = cloud`).

## Database fields (`nfc_cards`)

| Column | Notes |
|--------|--------|
| `status` | Existing enum: `active` means programmed / in use (there is no separate `programmed` enum value) |
| `programmed_at` | Timestamp of last successful program |
| `programmed_by` | Admin `users.id` |
| `programmed_url` | URL stored on / registered for the card |
| `program_source` | `web_nfc` \| `cloud` \| `server` |
| `card_uid` | Tag serial when Web NFC provides it |

Migration: `backend/db/migrations/008_web_nfc_programmed.sql`

## Architecture (frontend)

```text
lib/nfc/           Pure URL builders, support detection, write+verify
hooks/useNFCWriter.ts   React state machine + AbortController
components/nfc/    NFCWriterModal, NFCStatusIndicator, NFCVerificationDialog
```

Closing the modal aborts in-flight `NDEFReader` operations via `AbortSignal`.

## Limitations

- **No iOS writing** — recruiters can still *tap* a programmed card on iPhone to open the URL in the browser; only *writing* requires Android Chrome.
- Web NFC cannot bypass tag lock bits.
- Multiple rapid writes may need the user to lift and re-present the card between write and verify.
- Feature detection (`"NDEFReader" in window`) must pass; otherwise the UI stays in the unsupported state (desktop Chrome continues to work for all other admin features).
- Preview deployments: set `NEXT_PUBLIC_SITE_URL` to the canonical production origin so tags do not point at ephemeral preview URLs.

## Security notes

- Mark-programmed requires admin authentication.
- The API re-validates `urlWritten` against the server-side `SITE_URL` + student username so a compromised client cannot register arbitrary URLs for another student without also knowing the slug (still admin-only).
- Web NFC itself only works in a secure context.

## How to test on Android

1. Deploy or tunnel the admin UI over HTTPS (or use localhost on the phone via USB debugging / port reverse).
2. Ensure `NEXT_PUBLIC_SITE_URL` matches the public site origin.
3. Open `/admin` in Chrome → Students → Write NFC.
4. Use a blank NTAG213/215/216.
5. Confirm Success toast, then tap the card with another phone — profile should open with `?src=nfc`.

## Code references

- Frontend writer: `frontend/src/lib/nfc/writer.ts`
- Hook: `frontend/src/hooks/useNFCWriter.ts`
- Modal: `frontend/src/components/nfc/NFCWriterModal.tsx`
- Backend: `backend/src/routes/nfc.ts`
