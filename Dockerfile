# ── Stage 1: Build the Vite SPA ──────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Accept VITE_* build args so they are baked into the static bundle
ARG VITE_NCPA_API_KEY=CGdX1XsVxshMqZ4e06lV
ARG VITE_NCPA_API_BASE=https://tournaments.ncpaofficial.com
ARG VITE_NCPA_SOCKET_URL=https://tournaments.ncpaofficial.com
ARG VITE_DEFAULT_MATCH_ID=5092

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom config and built assets
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
