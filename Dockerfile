# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage (Sem Nginx, usando Node para rodar o SSR do Nitro) ───────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Copia os arquivos necessários gerados pelo Nitro
COPY --from=builder /app/.output ./.output

EXPOSE 3000

# Variável de ambiente que o Nitro usa para definir a porta de execução
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Comando que inicia o servidor do frontend
CMD ["node", ".output/server/index.mjs"]