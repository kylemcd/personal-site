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

# Release stage (serve static output to avoid the hanging server)
FROM oven/bun:${BUN_VERSION}-slim as release
WORKDIR /docker-build

# Copy build output and required files
COPY --from=build /docker-build/.output ./.output
COPY --from=build /docker-build/package.json ./
COPY --from=build /docker-build/bun.lock ./
COPY --from=build /docker-build/public ./public
COPY --from=build /docker-build/posts ./posts

# Install only production dependencies (if your static site references any)
RUN bun install --production

USER bun
EXPOSE 3000/tcp

# Serve the statically built site from .output/public
# (bunx will fetch http-server on first run)
CMD ["sh","-lc","bunx --yes http-server .output/public -p 3000 --silent"]
