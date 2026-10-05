# factory/scripts/verify.sh — the single verify hook for this repo.
#
# Contract:
#   - exits 0 ONLY when the real check below passes
#   - exits 1 with an explanation when no check is configured
#   - never echoes ok and exits 0 to fake success
#
# This is Atrium's CI `ci` job minus `npm ci`: Vitest with no DATABASE_URL,
# then the Next production build with a dummy AUTH_SECRET.
set -euo pipefail

VERIFY_COMMAND='env -u DATABASE_URL npm test && AUTH_SECRET=ci-build-placeholder npm run build'

if [ -z "$VERIFY_COMMAND" ] || [[ "$VERIFY_COMMAND" == *"{{"* || "$VERIFY_COMMAND" == *"}}"* ]]; then
  echo "No verify command configured." >&2
  echo "" >&2
  echo "Edit factory/scripts/verify.sh and set VERIFY_COMMAND to a real check" >&2
  echo "for this repo (for example: 'make check', 'npm test', 'pytest', 'cargo test')." >&2
  echo "A verify script that succeeds without running anything is a broken factory." >&2
  exit 1
fi

cd "$(dirname "$0")/../.."

echo "Running verify: $VERIFY_COMMAND"
if eval "$VERIFY_COMMAND"; then
  echo "VERIFY OK: $VERIFY_COMMAND"
  exit 0
else
  status=$?
  echo "VERIFY FAILED (exit $status): $VERIFY_COMMAND" >&2
  exit "$status"
fi
