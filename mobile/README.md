# Mobile prototype

A minimal Expo client that subscribes to the same Wi-Fi CSI WebSocket API as the web dashboard.

```bash
cd mobile
npm install
EXPO_PUBLIC_CSI_API_URL=http://localhost:8000 npm run start
```

Use your machine LAN IP instead of `localhost` when testing from a physical phone.
