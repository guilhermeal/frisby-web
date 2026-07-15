# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

# 1. Limpa a pasta padrão do Nginx
RUN rm -rf /usr/share/nginx/html/*

# 2. Copia os arquivos da pasta 'dist' (padrão do Vite)
COPY --from=builder /app/dist /usr/share/nginx/html

# 3. Garante permissão de leitura para o Nginx
RUN chmod -R 755 /usr/share/nginx/html

# 4. Configuração SPA do Nginx
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