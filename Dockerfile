# syntax=docker/dockerfile:1.7-labs
ARG BUN_VERSION=1.2.19

FROM oven/bun:${BUN_VERSION} as base
WORKDIR /docker-build

# Install dependencies
COPY package.json bun.lock ./
RUN bun install

# Build stage
FROM base as build
COPY . .
ENV NODE_ENV=production
RUN bun run build && bun run og

# Release stage
FROM oven/bun:${BUN_VERSION}-slim as release
WORKDIR /docker-build

# Ensure the server binds to all interfaces by default
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000

# Copy build output and necessary files
COPY --from=build /docker-build/.output ./.output
COPY --from=build /docker-build/package.json ./
COPY --from=build /docker-build/bun.lock ./
COPY --from=build /docker-build/public ./public
COPY --from=build /docker-build/posts ./posts

# Patch generated server to avoid localhost-only binding
RUN set -eux; \
    sed -i -E 's/(hostname:\s*)url\.hostname/\1"0.0.0.0"/g; s/(host:\s*)url\.hostname/\1"0.0.0.0"/g' .output/server/index.mjs || true; \
    sed -i -E 's#(Listening on http://)localhost#\10.0.0.0#g' .output/server/index.mjs || true

# Install only production dependencies
RUN bun install --production

USER bun
EXPOSE 3000/tcp

CMD ["bun", "run", "--env-file=.env", ".output/server/index.mjs"]
