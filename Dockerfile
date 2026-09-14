# Single image for API and worker. Node 18 LTS.
FROM node:20-slim

# System dependencies (ffmpeg for workers; yt-dlp via pip for latest/pre-release).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    unzip \
    && pip3 install --break-system-packages -U --pre "yt-dlp[default]" \
    && yt-dlp --version \
    && rm -rf /var/lib/apt/lists/* /root/.cache/pip

# Deno (yt-dlp n/sig challenge solver). Kept in its own layer so a failed download does not
# invalidate the apt/pip layer above — a rebuild then resumes here instead of refetching ~150MB.
#
# github.com/.../releases/latest/download is a redirect that intermittently answers 5xx; an
# unretried curl there has already failed a production deploy with "curl: (22) ... error: 504".
# --retry covers transient 5xx/timeouts, and --retry-all-errors also covers connection resets.
# Set DENO_VERSION (e.g. --build-arg DENO_VERSION=v2.1.4) to pin an exact release instead of latest.
ARG DENO_VERSION=latest
RUN set -eux; \
    if [ "$DENO_VERSION" = "latest" ]; then \
      DENO_URL="https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip"; \
    else \
      DENO_URL="https://github.com/denoland/deno/releases/download/${DENO_VERSION}/deno-x86_64-unknown-linux-gnu.zip"; \
    fi; \
    curl -fsSL --http1.1 \
      --retry 5 --retry-delay 3 --retry-all-errors --retry-max-time 180 --connect-timeout 30 \
      "$DENO_URL" -o /tmp/deno.zip; \
    unzip -q /tmp/deno.zip -d /usr/local/bin; \
    rm /tmp/deno.zip; \
    chmod +x /usr/local/bin/deno; \
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
