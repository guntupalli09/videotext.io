# Single image for API and worker. Node 18 LTS.
FROM node:20-slim

# System dependencies (ffmpeg for workers; yt-dlp for URL-based video import).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && pip3 install --no-cache-dir yt-dlp \
    && ln -sf /usr/local/bin/yt-dlp /usr/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (lockfile for reproducible builds)
COPY server/package.json server/package-lock.json ./
RUN npm ci

# Copy server source and build TypeScript
COPY server/ ./
RUN npm run build

# Prune dev dependencies to keep image smaller; runtime only needs dist + node_modules
RUN npm prune --omit=dev

EXPOSE 3001

# Default: run API. Override in docker-compose for worker.
CMD ["node", "dist/index.js"]
