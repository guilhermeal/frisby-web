# ── Build stage (Compilação do React) ──────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage (Servindo os arquivos com Nginx) ─────────────────────────────
FROM nginx:alpine AS runtime

# Copia os arquivos compilados do React para a pasta padrão do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]