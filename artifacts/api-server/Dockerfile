FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY lib/ ./lib/
COPY artifacts/api-server/package.json ./artifacts/api-server/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/lib ./lib
COPY --from=deps /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY . .
WORKDIR /app/artifacts/api-server
RUN node ./build.mjs

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY artifacts/api-server/data ./artifacts/api-server/data

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
