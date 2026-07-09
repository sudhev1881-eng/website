<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# StudentLink — Web Platform Only

StudentLink is a **browser-based web application**. There is no Electron app, no desktop admin client, and no native application.

- **Frontend:** Next.js (`src/`) — all users access via browser
- **Backend:** Node.js REST API (`server/`) — runs on the Ubuntu server
- **NFC:** USB reader connects to the **server**; only the API talks to it
- **Admins:** use `/admin` in Chrome — same website as everyone else

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design.
