# =============================================================================
# Salesianos FC - Frontend Dockerfile
# =============================================================================
# Multi-stage: build Vite/React, runtime nginx para estáticos.
# =============================================================================

# --- Build layer ---
# Bookworm (Debian/glibc) necesario para @tailwindcss/oxide (Tailwind v4) en build
FROM node:20-bookworm-slim AS build

LABEL maintainer="Salesianos FC"
LABEL org.opencontainers.image.title="Salesianos FC Web"
LABEL org.opencontainers.image.description="Frontend gestión equipo fútbol amateur"
LABEL org.opencontainers.image.vendor="Noah IT"

WORKDIR /app

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci && \
    npm cache clean --force

COPY . .

# Variables de build Vite. Valores sensibles (ej. VITE_MAPBOX_TOKEN) pasar con --build-arg al build, no en el Dockerfile.
ARG VITE_API_BASE=http://localhost:8000
ARG VITE_MAPBOX_TOKEN
ENV VITE_API_BASE=$VITE_API_BASE
# Solo exponer token en build si se pasó por --build-arg (evita warning de secretos en imagen)
ENV VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN}

RUN npm run build

RUN find /app/dist -name "*.map" -delete

# --- Runtime layer ---
FROM nginx:1.27-alpine AS runtime

LABEL maintainer="Salesianos FC"
LABEL org.opencontainers.image.title="Salesianos FC Web - Runtime"
LABEL org.opencontainers.image.vendor="Noah IT"

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY ops/nginx.conf /etc/nginx/conf.d/default.conf

# Security: Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
