# Single image for API and worker. Node 18 LTS.
FROM node:20-slim

# System dependencies (ffmpeg for workers; yt-dlp via pip for latest/pre-release; Deno for n/sig challenge).
# Keep apt / yt-dlp / Deno as separate layers so a flaky GitHub 504 does not redo a 40s apt install.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages -U --pre "yt-dlp[default]" \
    && yt-dlp --version \
    && rm -rf /root/.cache/pip

# Pin a release instead of GitHub /latest/ (that redirect 504s). Prefer Deno's CDN, then GitHub.
ARG DENO_VERSION=2.9.6
RUN set -eux; \
    asset="deno-x86_64-unknown-linux-gnu.zip"; \
    urls="https://dl.deno.land/release/v${DENO_VERSION}/${asset} https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/${asset}"; \
    downloaded=0; \
    for url in $urls; do \
      attempt=1; \
      while [ "$attempt" -le 4 ]; do \
        if curl --retry 3 --retry-all-errors --retry-delay 3 --connect-timeout 20 --max-time 120 -fsSL --http1.1 "$url" -o /tmp/deno.zip; then \
          downloaded=1; \
          break 2; \
        fi; \
        attempt=$((attempt + 1)); \
        sleep $((attempt * 2)); \
      done; \
    done; \
    if [ "$downloaded" != 1 ]; then \
      echo "Failed to download Deno ${DENO_VERSION}" >&2; \
      exit 1; \
    fi; \
    unzip -q /tmp/deno.zip -d /usr/local/bin; \
    chmod +x /usr/local/bin/deno; \
    rm -f /tmp/deno.zip; \
    deno --version

WORKDIR /app

# Install dependencies (lockfile for reproducible builds). Prisma needs schema + config for postinstall (prisma generate).
# Set a placeholder DATABASE_URL so prisma generate succeeds at build time; runtime URL comes from docker-compose env.
ENV DATABASE_URL=postgresql://videotools:videotools@localhost:5432/videotext
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma/
COPY server/prisma.config.ts ./
RUN npm ci

# Copy server source and build TypeScript
COPY server/ ./
RUN npm run build

# Prune dev dependencies to keep image smaller; runtime only needs dist + node_modules
RUN npm prune --omit=dev

EXPOSE 3001

# Default: run API. Override in docker-compose for worker.
CMD ["node", "dist/index.js"]
