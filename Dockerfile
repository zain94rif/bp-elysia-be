FROM docker.io/oven/bun:1.4-alpine AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM docker.io/oven/bun:1.4-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3080

COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun package.json bun.lock ./
COPY --chown=bun:bun src ./src

USER bun
EXPOSE 3080
CMD ["bun", "run", "src/index.ts"]
