#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DIST_DIR="$PROJECT_ROOT/dist/twitch-miner-frontend/browser"
PORT="${FRONTEND_PORT:-7000}"

# ---------------------------------------------------------------------------
# Sync with remote
# ---------------------------------------------------------------------------
if [[ -d .git ]]; then
    BRANCH="$(git rev-parse --abbrev-ref HEAD)"
    echo "→ Syncing with origin/${BRANCH} ..."
    git fetch origin
    git reset --hard "origin/${BRANCH}"
fi

# ---------------------------------------------------------------------------
# Install dependencies
# ---------------------------------------------------------------------------
echo "→ Installing dependencies ..."
npm ci --prefer-offline --silent

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
echo "→ Building ..."
npm run build

# ---------------------------------------------------------------------------
# Serve
# ---------------------------------------------------------------------------
if ! command -v serve &>/dev/null; then
    echo "→ Installing serve globally ..."
    npm install -g serve
fi

echo "→ Starting frontend on port ${PORT} ..."
exec serve -s "$DIST_DIR" -l "$PORT"
