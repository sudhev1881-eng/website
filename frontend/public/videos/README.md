# Media Assets

Add your media files to this folder.

## Hero video

- `hero.mp4` — homepage hero background (`HeroVideo.tsx`), autoplay muted loop
- `hero-4k.mp4` — **optional** 3840×2160 export; auto-used on large retina screens (1280px+ width, 1.5× DPI) when this file exists
- Do **not** reuse `web-dev-watch.mp4` here; that file is for web-dev project cards only

**For sharp 4K playback:** export at **3840×2160**, H.264, high bitrate (15–40 Mbps for short loops), then save as `hero-4k.mp4`. The current `hero.mp4` (~6 MB) is a compressed phone clip — code cannot upscale it to real 4K detail.

## Project videos

Set `video: "/videos/your-file.mp4"` on any entry in `src/data/projects.ts`. All project videos use the shared `ProjectVideo` component, which:

- Autoplays muted on loop (no player controls)
- Fits content in frame with `object-contain` and a slight zoom-out (`scale-[0.92]`)
- Uses a black letterbox background inside a 16:9 container

Current web-dev files:

- `mheadset.mp4` — MHeadset Website
- `match-tornado.mp4` — Match Tornado Website
- `credit-card.mp4` — Credit Card Website
- `hp-omnibook.mp4` — HP OmniBook Product Page
- `saloon.mp4` — Saloon Website

## Format notes

- Codec: H.264 (`.mp4`), muted, loop-friendly edits (clean loop points help)
- Recommended: 1280×720, under 5MB per clip
- No `controls` attribute — playback is automatic only

The site works without videos; omit the `video` field to show text-only project cards.
