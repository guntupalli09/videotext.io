#!/bin/bash
# Deploy latest images from GHCR and restart all services.
# Run from /opt/videotools on the production server.
#
# First-time setup (private repo only):
#   echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
#
# Usage:
#   ./scripts/deploy.sh

set -euo pipefail

echo "[deploy] $(date -u '+%Y-%m-%d %H:%M:%S UTC') — pulling latest images"
docker compose pull

echo "[deploy] restarting services"
docker compose up -d --no-build

echo "[deploy] removing dangling images from previous release"
docker image prune -f

echo "[deploy] done — running containers:"
docker compose ps
