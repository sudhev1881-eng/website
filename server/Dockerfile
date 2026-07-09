FROM node:20-slim AS base
WORKDIR /app

# PC/SC runtime for NFC (optional — enable NFC_READER_ENABLED in compose)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpcsclite1 \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db

RUN mkdir -p /var/studentlink/uploads
ENV STORAGE_PATH=/var/studentlink/uploads
EXPOSE 4000
CMD ["node", "dist/index.js"]
