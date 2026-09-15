# ── Stage 1: build the frontend and the overlay ──────────────────────────────
FROM node:24-alpine AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY core/package.json ./core/
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN npm ci --workspace=frontend --ignore-scripts

COPY core ./core
COPY frontend ./frontend

RUN npm run build --workspace=frontend

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY core/package.json ./core/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm ci --workspace=backend --omit=dev --ignore-scripts

COPY core ./core
COPY backend ./backend

COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV PORT=10914
EXPOSE 10914

USER node

WORKDIR /app/backend
CMD ["node", "src/server.ts"]
