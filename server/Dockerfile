# Touchline Fantasy API — production image
FROM node:22-slim AS base
WORKDIR /app
# Prisma needs OpenSSL at build and run time
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

FROM base AS build
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY prisma ./prisma

EXPOSE 4000
# Apply any pending migrations, then serve. Seeding is a separate, explicit step.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
