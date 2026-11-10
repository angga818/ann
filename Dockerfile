# ---------- Stage 1: build ----------
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies dulu agar layer di-cache
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source lalu build
COPY . .
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="quizlive-frontend" \
      org.opencontainers.image.description="Frontend kuis multiplayer real-time (QuizLive)" \
      org.opencontainers.image.licenses="MIT"

# Konfigurasi nginx + hasil build
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 7005

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:7005/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
