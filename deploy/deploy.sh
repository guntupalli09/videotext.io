#!/usr/bin/env bash
# deploy/deploy.sh — Full production deploy for videotext.io API server
#
# Run as root on the Hetzner VPS:
#   cd /opt/videotools && bash deploy/deploy.sh
#
# What it does (in order):
#   1. Pull latest code from git
#   2. Build Docker image
#   3. Apply DB migrations + restart Redis + API + worker containers
#   4. Validate and reload Caddy config (zero-downtime)
#
# Prerequisites:
#   - Docker + docker compose v2 installed
#   - Caddy installed as a systemd service
#   - /opt/videotools is the working directory (git repo root)
#   - .env file present with all required vars

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CADDYFILE_SRC="${REPO_ROOT}/deploy/Caddyfile"
CADDYFILE_DST="/etc/caddy/Caddyfile"

log()  { echo "[deploy] $*"; }
fail() { echo "[deploy] ERROR: $*" >&2; exit 1; }

cd "${REPO_ROOT}"

# ── 1. Pull latest code ───────────────────────────────────────────────────────
log "Pulling latest code..."
git pull --ff-only || fail "git pull failed. Resolve conflicts manually."

# ── 2. Build Docker image ─────────────────────────────────────────────────────
log "Building Docker image..."
docker compose build --pull

# ── 3. Restart Redis + API + worker (migrations run inside api container on startup) ──
log "Restarting containers..."
docker compose up -d --remove-orphans redis api worker

log "Waiting for API healthcheck..."
for i in $(seq 1 30); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' videotools-api 2>/dev/null || echo "missing")
  if [ "${STATUS}" = "healthy" ]; then
    log "API is healthy."
    break
  fi
  if [ "${i}" -eq 30 ]; then
    fail "API did not become healthy within 60s. Check: docker logs videotools-api --tail 50"
  fi
  sleep 2
done

# ── 4. Apply Caddy config ─────────────────────────────────────────────────────
log "Validating Caddyfile..."
caddy validate --config "${CADDYFILE_SRC}" \
  || fail "Caddyfile validation failed. Fix ${CADDYFILE_SRC} before deploying."

log "Copying Caddyfile to ${CADDYFILE_DST}..."
cp "${CADDYFILE_SRC}" "${CADDYFILE_DST}"

log "Reloading Caddy (zero-downtime)..."
caddy reload --config "${CADDYFILE_DST}" \
  || fail "Caddy reload failed. Check: journalctl -u caddy -n 30"

log "Verifying webhook endpoint through Caddy..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
  -X POST https://api.videotext.io/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo "000")

if [ "${HTTP_CODE}" = "400" ]; then
  log "Webhook endpoint OK (HTTP 400 — Express alive, unsigned request rejected correctly)."
elif [ "${HTTP_CODE}" = "000" ]; then
  log "WARNING: Could not reach https://api.videotext.io from this server (DNS/network). Verify manually."
else
  fail "Unexpected response from webhook endpoint: HTTP ${HTTP_CODE}. Expected 400."
fi

log "Deploy complete."
