#!/usr/bin/env bash
# init.sh — set the repo up, then run the verify hook.
#
# Idempotent: safe to run on an already-initialized checkout. `.env` is gitignored
# and never created here with real values — copy the example and fill it in.
set -euo pipefail

cd "$(dirname "$0")"

echo "init: setting up $(basename "$PWD")"

# --- project setup ----------------------------------------------------------
if [ ! -d node_modules ]; then
  echo "init: npm ci"
  npm ci
else
  echo "init: node_modules present, skipping npm ci"
fi

if [ ! -f .env ]; then
  echo "init: .env is missing — cp .env.example .env and fill DATABASE_URL + AUTH_SECRET."
  echo "init: continuing; the verify command below does not need .env."
else
  echo "init: .env present"
fi

if [ ! -x factory/scripts/verify.sh ]; then
  chmod +x factory/scripts/verify.sh
fi

exec ./factory/scripts/verify.sh
