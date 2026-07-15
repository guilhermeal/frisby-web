# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Injeta as variáveis de ambiente que o frontend usa para achar a API
ENV NITRO_PRESET=node-server
ENV VITE_API_URL=http://184.174.32.147:3001
ENV API_URL=http://184.174.32.147:3001

RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/.output ./.output

EXPOSE 3000

ENV HOST=0.0.0.0
ENV NITRO_HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_PORT=3000
ENV NODE_ENV=production

# Repassa também as variáveis para o runtime
ENV VITE_API_URL=http://184.174.32.147:3001
ENV API_URL=http://184.174.32.147:3001

CMD ["node", ".output/server/index.mjs"]