# Google Sign-In + Name Claim

Students sign in with Google, then confirm their legal name in **CAPS** to match a pre-registered record in PostgreSQL (same name used for NFC).

## Flow

```
1. Admin pre-registers student name  →  students.name = "ALEX MORGAN" (pending, no login)
2. Student clicks "Continue with Google" on /login
3. Student enters FIRST + LAST name in capitals
4. API matches UPPER(name) in database
5. Google account links to that student → /student dashboard to complete profile + NFC
```

## Google Cloud setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create project → **Credentials** → **OAuth 2.0 Client ID** → **Web application**
3. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://yourdomain.com` (production)
4. Copy Client ID to both env files:

```env
# .env.local (frontend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

# server/.env (API verifies token)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

## Admin: pre-register a student

**API:** `POST /api/admin/students/preregister`

```json
{ "name": "ALEX MORGAN", "university": "Stanford University", "major": "CS" }
```

Name is stored in uppercase. Student appears as **unclaimed** in admin until they complete Google + name claim.

## Security note

Name-only matching is convenient for university rollout but not highly secure — anyone who knows a name could try to claim it. For production consider also:

- Restricting Google to `@university.edu` domains
- Adding a one-time claim code from admin
- Email invite links

## Demo seed

After `npm run db:seed`, **JAMES WILSON** is pre-registered with no account — test Google claim with that name.
