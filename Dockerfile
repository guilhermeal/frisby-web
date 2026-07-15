# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# 1. Remove a página padrão do Nginx para evitar conflitos
RUN rm -rf /usr/share/nginx/html/*

# 2. Copia a saída do build do Nitro para a pasta que o Nginx serve
COPY --from=builder /app/.output/public /usr/share/nginx/html

# 3. Define a configuração de rotas (Single Page App) para evitar erros 404
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]