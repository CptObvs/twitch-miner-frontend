#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DIST_DIR="$PROJECT_ROOT/dist/twitch-miner-frontend/browser"

# ---------------------------------------------------------------------------
# Sync with remote (always resets to the current branch's remote state)
# ---------------------------------------------------------------------------
if [[ -d .git ]]; then
    BRANCH="$(git rev-parse --abbrev-ref HEAD)"
    echo "Syncing with origin/${BRANCH} ..."
    git fetch origin
    git reset --hard "origin/${BRANCH}"
fi

# ---------------------------------------------------------------------------
# Install dependencies
# ---------------------------------------------------------------------------
echo "Installing dependencies ..."
npm ci --prefer-offline --silent

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
echo "Building ..."
npm run build

echo "Build complete: $DIST_DIR"

# ---------------------------------------------------------------------------
# Serve
# Nginx: copies dist to webroot and reloads
# Fallback: npx serve (for environments without nginx)
# ---------------------------------------------------------------------------
NGINX_WEBROOT="${NGINX_WEBROOT:-}"

if [[ -n "$NGINX_WEBROOT" ]]; then
    echo "Deploying to nginx webroot: $NGINX_WEBROOT ..."
    rm -rf "$NGINX_WEBROOT"/*
    cp -r "$DIST_DIR"/. "$NGINX_WEBROOT/"

    if command -v nginx >/dev/null 2>&1 && nginx -t 2>/dev/null; then
        echo "Reloading nginx ..."
        nginx -s reload
    else
        echo "WARN: nginx not found or config invalid — skipping reload"
    fi

    echo "Deployed. nginx is serving the app."
else
    # No webroot configured → serve directly via npx serve
    PORT="${FRONTEND_PORT:-4200}"
    echo "NGINX_WEBROOT not set — serving via npx serve on port ${PORT} ..."
    echo "Set NGINX_WEBROOT=/path/to/webroot to deploy to nginx instead."
    exec npx serve -s "$DIST_DIR" --listen "tcp://0.0.0.0:${PORT}"
fi
