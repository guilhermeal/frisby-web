# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Força o Nitro a buildar no formato de Servidor Node Autônomo
ENV NITRO_PRESET=node-server
RUN npm run build

# ── Runtime stage (Rodando o servidor Node autônomo gerado pelo Nitro) ──────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Copia os arquivos gerados pelo preset node-server
COPY --from=builder /app/.output ./.output

EXPOSE 3000

ENV HOST=0.0.0.0
ENV NITRO_HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_PORT=3000
ENV NODE_ENV=production

# Agora o index.mjs vai de fato iniciar um servidor HTTP que fica ouvindo na porta 3000!
CMD ["node", ".output/server/index.mjs"]