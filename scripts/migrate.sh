#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Running database migrations against Supabase PostgreSQL"
cd "$ROOT/backend"
npm run db:migrate

echo "==> Done"
