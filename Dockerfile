# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Origin API bisa diganti saat build (mis. lewat Dokploy build args).
ARG VITE_API_BASE_URL=https://api.workilham.my.id
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY . .
RUN npm run build

# Stage 2: Serve menggunakan package Node `serve`
FROM node:22-alpine
WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 7005

CMD ["serve", "-s", "dist", "-l", "7005"]
