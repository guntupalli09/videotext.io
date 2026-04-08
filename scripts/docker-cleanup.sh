#!/bin/sh
echo "[docker-cleanup] $(date -u '+%Y-%m-%d %H:%M:%S UTC') — starting prune (images/cache older than 7 days)"
docker system prune -f --filter "until=168h" 2>&1
echo "[docker-cleanup] $(date -u '+%Y-%m-%d %H:%M:%S UTC') — done"
