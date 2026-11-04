FROM node:22-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --system baranda \
  && useradd --system --gid baranda --home-dir /app --shell /usr/sbin/nologin baranda

COPY --chown=baranda:baranda --from=build /app/node_modules ./node_modules
COPY --chown=baranda:baranda --from=build /app/dist ./dist
COPY --chown=baranda:baranda drizzle ./drizzle
COPY --chown=baranda:baranda package.json ./

USER baranda
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3002/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
