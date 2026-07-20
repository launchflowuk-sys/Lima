# Single image used for both the web app and the background worker (compose overrides the command).
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Pin the exact pnpm that works locally so onlyBuiltDependencies (in pnpm-workspace.yaml) is honoured
# and the build is deterministic regardless of corepack's default.
RUN corepack enable && corepack prepare pnpm@11.12.0 --activate
WORKDIR /app

# --- deps: install with a frozen lockfile for reproducible builds ---
# pnpm 11 hard-fails a fresh install (ERR_PNPM_IGNORED_BUILDS) on native deps' build scripts even when
# they're allow-listed in pnpm-workspace.yaml. We disable that gate, then explicitly rebuild the native
# packages we actually need (esbuild for tsx/worker, sharp for image opt, oxide for Tailwind v4).
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --config.strictDepBuilds=false \
 && pnpm rebuild esbuild sharp @tailwindcss/oxide msgpackr-extract unrs-resolver

# --- build: compile the Next app ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# --- runner: production image with full deps (web via `next start`, worker via `tsx`) ---
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "start"]
