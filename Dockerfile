# --- Stage 1: build the React frontend with Vite ---
# Use the full Debian-based image (not alpine) because some transitive
# native deps (sqlite3 via @google/adk) need Python + build tools to
# compile via node-gyp.
FROM node:22 AS web-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY tailwind.config.js postcss.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

# --- Stage 2: Python runtime with uv ---
FROM python:3.12-slim AS runtime
WORKDIR /app

# Install uv (fast Python package manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy pyproject + lock and install deps
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy server code
COPY server ./server

# Copy the built frontend from stage 1
COPY --from=web-build /app/dist ./dist

# Cloud Run sets $PORT (default 8080). Bind to 0.0.0.0.
ENV PORT=8080
EXPOSE 8080

# Use uv to run uvicorn
CMD uv run uvicorn server.main:app --host 0.0.0.0 --port ${PORT}
