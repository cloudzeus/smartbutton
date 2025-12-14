# Dependencies stage
FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps --ignore-scripts

# Explicitly install native binaries for Alpine Linux (musl, not gnu)
RUN npm install lightningcss-linux-x64-musl@1.30.2 @tailwindcss/oxide-linux-x64-musl@4.1.18 --save-optional --legacy-peer-deps || echo "Warning: Native binaries install failed"

# Builder stage
FROM node:22-alpine AS builder
WORKDIR /app

# Declare build-time arguments (passed from Coolify)
ARG DATABASE_URL
ARG AUTH_SECRET
ARG AUTH_URL
ARG YEASTAR_BASE_URL
ARG YEASTAR_CLIENT_ID
ARG YEASTAR_CLIENT_SECRET
ARG YEASTAR_WEBSOCKET_SECRET
ARG GOOGLE_APPLICATION_CREDENTIALS_JSON

# Set as environment variables for the build
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV AUTH_URL=$AUTH_URL
ENV YEASTAR_BASE_URL=$YEASTAR_BASE_URL
ENV YEASTAR_CLIENT_ID=$YEASTAR_CLIENT_ID
ENV YEASTAR_CLIENT_SECRET=$YEASTAR_CLIENT_SECRET
ENV YEASTAR_WEBSOCKET_SECRET=$YEASTAR_WEBSOCKET_SECRET
ENV GOOGLE_APPLICATION_CREDENTIALS_JSON=$GOOGLE_APPLICATION_CREDENTIALS_JSON

# CRITICAL: Unset NODE_ENV during build (Next.js will use its own defaults)
# Coolify may pass NODE_ENV as build arg which breaks Next.js build
ENV NODE_ENV=

# NOTE: NODE_ENV should NOT be set during build - only at runtime
COPY package.json package-lock.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY prisma ./prisma
RUN npx prisma generate || (sleep 10 && npx prisma generate) || (sleep 20 && npx prisma generate)

# Ensure native binaries are installed in builder stage (Alpine uses musl)
RUN npm install lightningcss-linux-x64-musl@1.30.2 @tailwindcss/oxide-linux-x64-musl@4.1.18 --save-optional --legacy-peer-deps || echo "Warning: Native binaries install failed"

COPY . .
# Ensure public directory exists (create if it doesn't)
RUN mkdir -p ./public
RUN npm run build

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copy public directory (created in builder stage, may be empty)
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
