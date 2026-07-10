#!/usr/bin/env bash
# Deploy StudentLink API + Nginx on Oracle Cloud Linux (ARM)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "$ROOT/backend/.env" ]]; then
  echo "Missing backend/.env — copy backend/.env.example and fill Supabase + secrets."
  exit 1
fi

echo "==> Pull latest code"
git -C "$ROOT" pull --ff-only

echo "==> Build and start production stack"
docker compose -f "$ROOT/docker/docker-compose.prod.yml" up -d --build

echo "==> API health"
sleep 5
docker compose -f "$ROOT/docker/docker-compose.prod.yml" exec api wget -qO- http://127.0.0.1:4000/api/health || true

echo "==> Deploy complete. Point api.yourdomain.com DNS to this instance."
