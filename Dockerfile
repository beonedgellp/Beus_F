# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Beus frontend (Beus_F) — multi-stage build.
#   1. "build"  compiles the Vite/React app into static files
#   2. runtime  serves those static files with nginx (SPA fallback)
#
# NOTE: Vite inlines VITE_API_URL at BUILD time (import.meta.env), so it is
# passed here as a build argument. Change it -> rebuild the frontend image.
# ---------------------------------------------------------------------------

# ----- Stage 1: build -------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Base URL of the backend as seen from the user's BROWSER (not the container).
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ----- Stage 2: runtime -----------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# SPA-aware nginx config (client-side routes like /shared/:token).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static build output.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
